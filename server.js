const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { URL } = require("node:url");

const env = loadEnv(path.join(__dirname, ".env"));
const PORT = Number(env.PORT || 4173);
const MAX_BODY_SIZE = 30 * 1024 * 1024;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/api/config") {
      if (req.method === "HEAD") {
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end();
        return;
      }
      return sendJson(res, 200, buildClientConfig());
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      const body = await readJsonBody(req);
      const result = await handleChat(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "GET" || req.method === "HEAD") {
      return serveStatic(url.pathname, res, req.method === "HEAD");
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});

async function handleChat(body) {
  validateChatBody(body);

  if (body.provider === "codexCli") {
    return callCodexCli(body);
  }

  if (body.provider === "codexDesktop") {
    return callCodexDesktop(body);
  }

  if (body.provider === "openai") {
    return callOpenAI(body);
  }

  if (body.provider === "codexProxy") {
    return callCodexProxy(body);
  }

  throw createError(400, "Unsupported provider");
}

async function callCodexCli(body) {
  const codexPath = resolveCodexCliPath();
  if (!codexPath) {
    throw createError(400, "未找到本机 Codex CLI");
  }

  const model = body.model || env.CODEX_CLI_MODEL || readCodexDesktopModel() || "gpt-5.2";
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-cli-"));
  const outputFile = path.join(tempDir, "last-message.txt");

  try {
    const imageFiles = materializeCodexCliImages(tempDir, body.attachments || []);
    const prompt = buildCodexCliPrompt(body.branchName, body.message, body.attachments, body.history);
    const args = [
      "exec",
      "--skip-git-repo-check",
      "--ephemeral",
      "-C",
      env.CODEX_CLI_WORKDIR || __dirname,
      "-m",
      model,
      "-o",
      outputFile,
      ...imageFiles.flatMap((filePath) => ["--image", filePath]),
      prompt,
    ];

    const { stdout, stderr } = await runCommand(codexPath, args);
    const reply = readCodexCliReply(outputFile, stdout);
    if (!reply) {
      throw createError(502, stderr.trim() || "Codex CLI 返回了空结果");
    }

    return {
      provider: "codexCli",
      model,
      previousResponseId: "",
      reply,
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function callOpenAI(body) {
  if (!env.OPENAI_API_KEY) {
    throw createError(400, "OPENAI_API_KEY 未配置");
  }

  const model = body.model || env.OPENAI_MODEL || "gpt-4.1-mini";
  const content = [
    {
      type: "input_text",
      text: buildOpenAITextPrompt(body.branchName, body.message, body.attachments),
    },
  ];

  for (const attachment of body.attachments || []) {
    if (attachment.payload?.mode === "image" && attachment.payload.dataUrl) {
      content.push({
        type: "input_image",
        image_url: attachment.payload.dataUrl,
      });
    } else if (attachment.payload?.mode === "pdf" && attachment.payload.dataUrl) {
      content.push({
        type: "input_file",
        filename: attachment.name,
        file_data: attachment.payload.dataUrl,
      });
    }
  }

  const payload = {
    model,
    instructions: buildBranchInstructions(body.branchName),
    input: [
      {
        role: "user",
        content,
      },
    ],
  };

  if (body.previousResponseId) {
    payload.previous_response_id = body.previousResponseId;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw createError(response.status, data.error?.message || "OpenAI 请求失败");
  }

  return {
    provider: "openai",
    model,
    previousResponseId: data.id,
    reply: extractResponseText(data),
  };
}

async function callCodexProxy(body) {
  if (!env.CODEX_PROXY_BASE_URL) {
    throw createError(400, "CODEX_PROXY_BASE_URL 未配置");
  }

  const style = env.CODEX_PROXY_API_STYLE || "chat";
  const model = body.model || env.CODEX_PROXY_MODEL || "";
  const baseUrl = env.CODEX_PROXY_BASE_URL.replace(/\/$/, "");

  if (style === "responses") {
    const payload = {
      model,
      instructions: buildBranchInstructions(body.branchName),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildCodexTextPrompt(body.branchName, body.message, body.attachments),
            },
          ],
        },
      ],
    };

    const response = await proxyFetch(`${baseUrl}${env.CODEX_PROXY_RESPONSES_PATH || "/v1/responses"}`, payload);
    return {
      provider: "codex",
      model,
      previousResponseId: response.id || "",
      reply: extractResponseText(response),
    };
  }

  const messages = [
    {
      role: "system",
      content: buildBranchInstructions(body.branchName),
    },
    ...body.history,
    {
      role: "user",
      content: buildCodexTextPrompt(body.branchName, body.message, body.attachments),
    },
  ];

  const response = await proxyFetch(`${baseUrl}${env.CODEX_PROXY_CHAT_PATH || "/v1/chat/completions"}`, {
    model,
    messages,
    temperature: 0.2,
  });

  const reply = response.choices?.[0]?.message?.content;
  if (!reply) {
    throw createError(502, "Codex Proxy 未返回有效内容");
  }

  return {
    provider: "codexProxy",
    model,
    previousResponseId: "",
    reply: normalizeChatContent(reply),
  };
}

async function callCodexDesktop(body) {
  const auth = loadCodexDesktopAuth();
  if (!auth?.tokens?.access_token) {
    throw createError(400, "未找到 Codex Desktop 登录态");
  }

  const model = body.model || readCodexDesktopModel() || "gpt-5.2";
  const input = (body.history || []).map((item) => ({
    role: item.role,
    content: [
      {
        type: item.role === "assistant" ? "output_text" : "input_text",
        text: item.content,
      },
    ],
  }));

  const currentContent = [
    {
      type: "input_text",
      text: buildOpenAITextPrompt(body.branchName, body.message, body.attachments),
    },
  ];

  for (const attachment of body.attachments || []) {
    if (attachment.payload?.mode === "image" && attachment.payload.dataUrl) {
      currentContent.push({
        type: "input_image",
        image_url: attachment.payload.dataUrl,
      });
    } else if (attachment.payload?.mode === "pdf" && attachment.payload.dataUrl) {
      currentContent.push({
        type: "input_file",
        filename: attachment.name,
        file_data: attachment.payload.dataUrl,
      });
    }
  }

  input.push({
    role: "user",
    content: currentContent,
  });

  const payload = {
    model,
    store: false,
    stream: true,
    instructions: buildBranchInstructions(body.branchName),
    input,
  }

  const response = await fetch("https://chatgpt.com/backend-api/codex/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.tokens.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw createError(response.status, text || "Codex Desktop Auth 请求失败");
  }

  const parsed = await parseCodexDesktopSse(response);
  return {
    provider: "codexDesktop",
    model,
    previousResponseId: parsed.previousResponseId,
    reply: parsed.reply,
  };
}

async function proxyFetch(url, payload) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (env.CODEX_PROXY_API_KEY) {
    headers.Authorization = `Bearer ${env.CODEX_PROXY_API_KEY}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw createError(response.status, data.error?.message || data.message || "Codex Proxy 请求失败");
  }
  return data;
}

function buildClientConfig() {
  return {
    providers: {
      codexCli: {
        available: Boolean(resolveCodexCliPath()),
        defaultModel: env.CODEX_CLI_MODEL || readCodexDesktopModel() || "gpt-5.2",
        apiStyle: "codex-exec",
      },
      codexDesktop: {
        available: Boolean(loadCodexDesktopAuth()?.tokens?.access_token),
        defaultModel: readCodexDesktopModel() || "gpt-5.2",
        apiStyle: "responses-sse",
      },
      openai: {
        available: Boolean(env.OPENAI_API_KEY),
        defaultModel: env.OPENAI_MODEL || "gpt-4.1-mini",
        apiStyle: "responses",
      },
      codexProxy: {
        available: Boolean(env.CODEX_PROXY_BASE_URL),
        defaultModel: env.CODEX_PROXY_MODEL || "",
        apiStyle: env.CODEX_PROXY_API_STYLE || "chat",
      },
    },
  };
}

function buildBranchInstructions(branchName) {
  return [
    `你是产品经理工作台中“${branchName}”支线的 AI 助手。`,
    "你要围绕当前支线回答，不要越过支线边界自动推进到其他阶段。",
    "如果信息不足，先明确指出缺口并给出最小必要补充项。",
    "优先输出可直接复用、可继续迭代的内容，保持结构清晰。",
  ].join("\n");
}

function buildOpenAITextPrompt(branchName, message, attachments) {
  const textBlocks = [];
  textBlocks.push(`当前支线：${branchName}`);
  textBlocks.push(`用户输入：${message || "请结合附件继续处理。"} `);

  const textAttachments = (attachments || []).filter((item) => item.payload?.mode === "text");
  if (textAttachments.length) {
    textBlocks.push("以下是用户上传的文本型文件内容：");
    textAttachments.forEach((item, index) => {
      textBlocks.push(`文件 ${index + 1}：${item.name}\n${item.payload.text}`);
    });
  }

  const otherAttachments = (attachments || []).filter((item) => item.payload?.mode !== "text");
  if (otherAttachments.length) {
    textBlocks.push("本轮同时附带以下非文本附件：");
    otherAttachments.forEach((item, index) => {
      textBlocks.push(`${index + 1}. ${item.kind} - ${item.name} - ${item.meta}`);
    });
  }

  return textBlocks.join("\n\n");
}

function buildCodexTextPrompt(branchName, message, attachments) {
  const blocks = [];
  blocks.push(`当前支线：${branchName}`);
  blocks.push(`用户输入：${message || "请结合附件继续处理。"} `);

  if (attachments?.length) {
    blocks.push("附件信息：");
    attachments.forEach((item, index) => {
      blocks.push(`${index + 1}. ${item.kind} - ${item.name} - ${item.meta}`);
      if (item.payload?.mode === "text" && item.payload.text) {
        blocks.push(`文件内容摘要：\n${item.payload.text}`);
      }
    });
  }

  return blocks.join("\n\n");
}

function buildCodexCliPrompt(branchName, message, attachments, history) {
  const blocks = [buildBranchInstructions(branchName)];

  if (history?.length) {
    blocks.push("以下是同一支线的历史对话，请延续上下文：");
    history.forEach((item, index) => {
      blocks.push(`${index + 1}. ${item.role === "assistant" ? "助手" : "用户"}：${item.content}`);
    });
  }

  blocks.push("以下是本轮用户输入与附件信息：");
  blocks.push(buildCodexTextPrompt(branchName, message, attachments));
  blocks.push("请直接给出当前轮次的结果，不要重复转述全部历史。");

  return blocks.join("\n\n");
}

function extractResponseText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks = [];
  for (const output of data.output || []) {
    if (!output.content) continue;
    for (const item of output.content) {
      if (item.type === "output_text" && item.text) {
        chunks.push(item.text);
      }
    }
  }

  return chunks.join("\n").trim() || "模型返回了空结果。";
}

function normalizeChatContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => item.text || item.content || "")
      .join("\n")
      .trim();
  }
  return "代理返回了无法解析的内容。";
}

function validateChatBody(body) {
  if (!body || typeof body !== "object") {
    throw createError(400, "请求体无效");
  }

  if (!body.branchId || !body.branchName) {
    throw createError(400, "缺少支线信息");
  }

  if (!["openai", "codexProxy", "codexDesktop", "codexCli"].includes(body.provider)) {
    throw createError(400, "provider 无效");
  }

  if (!Array.isArray(body.history)) {
    body.history = [];
  }

  if (!Array.isArray(body.attachments)) {
    body.attachments = [];
  }
}

function serveStatic(requestPath, res, headOnly = false) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(__dirname, path.normalize(safePath).replace(/^(\.\.[/\\])+/, ""));

  if (!filePath.startsWith(__dirname)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": getContentType(filePath),
    });
    res.end(headOnly ? undefined : content);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_SIZE) {
        reject(createError(413, "请求体过大"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(createError(400, "JSON 解析失败"));
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(data));
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
  };
  return map[ext] || "application/octet-stream";
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  const result = {};

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  });

  return result;
}

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function loadCodexDesktopAuth() {
  const authPath = path.join(process.env.HOME || "/Users/mac", ".codex", "auth.json");
  if (!fs.existsSync(authPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(authPath, "utf8"));
  } catch {
    return null;
  }
}

function resolveCodexCliPath() {
  const candidate = env.CODEX_CLI_PATH || "codex";
  if (candidate.includes(path.sep)) {
    return fs.existsSync(candidate) ? candidate : "";
  }

  const pathEnv = process.env.PATH || "";
  for (const dir of pathEnv.split(path.delimiter).filter(Boolean)) {
    const fullPath = path.join(dir, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return "";
}

function readCodexDesktopModel() {
  const configPath = path.join(process.env.HOME || "/Users/mac", ".codex", "config.toml");
  if (!fs.existsSync(configPath)) return "";
  const raw = fs.readFileSync(configPath, "utf8");
  const line = raw
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith("model ="));
  if (!line) return "";
  return line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
}

function materializeCodexCliImages(tempDir, attachments) {
  const files = [];

  attachments.forEach((attachment, index) => {
    if (attachment.payload?.mode !== "image" || !attachment.payload.dataUrl) return;

    const match = attachment.payload.dataUrl.match(/^data:([^;,]+)?;base64,(.+)$/);
    if (!match) return;

    const mimeType = match[1] || attachment.type || "image/png";
    const extension = inferExtension(attachment.name, mimeType);
    const filename = `image-${index + 1}${extension}`;
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, Buffer.from(match[2], "base64"));
    files.push(filePath);
  });

  return files;
}

function inferExtension(filename, mimeType) {
  const ext = path.extname(filename || "");
  if (ext) return ext;

  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  return map[mimeType] || ".png";
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: env.CODEX_CLI_WORKDIR || __dirname,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(createError(500, error.message || "Codex CLI 启动失败"));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(createError(502, stderr.trim() || stdout.trim() || `Codex CLI 退出码 ${code}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function readCodexCliReply(outputFile, stdout) {
  if (fs.existsSync(outputFile)) {
    const text = fs.readFileSync(outputFile, "utf8").trim();
    if (text) return text;
  }

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("OpenAI Codex v"))
    .filter((line) => !line.startsWith("workdir:"))
    .filter((line) => !line.startsWith("model:"))
    .filter((line) => !line.startsWith("provider:"))
    .filter((line) => !line.startsWith("approval:"))
    .filter((line) => !line.startsWith("sandbox:"))
    .filter((line) => !line.startsWith("reasoning effort:"))
    .filter((line) => !line.startsWith("reasoning summaries:"))
    .filter((line) => !line.startsWith("session id:"))
    .filter((line) => line !== "--------")
    .filter((line) => line !== "user")
    .filter((line) => line !== "codex")
    .filter((line) => line !== "tokens used")
    .filter((line) => !/^[\d,]+$/.test(line))
    .join("\n")
    .trim();
}

async function parseCodexDesktopSse(response) {
  const raw = await response.text();
  const chunks = raw.split("\n\n").filter(Boolean);
  let reply = "";
  let previousResponseId = "";

  for (const chunk of chunks) {
    const dataLine = chunk
      .split("\n")
      .find((line) => line.startsWith("data: "));
    if (!dataLine) continue;

    let data;
    try {
      data = JSON.parse(dataLine.slice(6));
    } catch {
      continue;
    }

    if (data.type === "response.created" && data.response?.id) {
      previousResponseId = data.response.id;
    }

    if (data.type === "response.output_text.delta" && data.delta) {
      reply += data.delta;
    }

    if (data.type === "response.completed" && data.response) {
      previousResponseId = data.response.id || previousResponseId;
      const completedText = extractResponseText(data.response);
      if (completedText) {
        reply = completedText;
      }
    }
  }

  return {
    previousResponseId,
    reply: reply.trim() || "Codex Desktop 返回了空结果。",
  };
}
