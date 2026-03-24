const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { URL } = require("node:url");

const env = loadEnv(path.join(__dirname, ".env"));
const PORT = Number(process.env.PORT || env.PORT || 4173);
const MAX_BODY_SIZE = 30 * 1024 * 1024;
const artifactStore = new Map();
const resourceStore = new Map();
const workflowRegistry = {
  general: {
    id: "general",
    name: "普通对话",
    outputMode: "chat",
    artifactType: "generic",
    preferredFormat: "md",
    editStrategy: "rewrite",
    requiresClarify: false,
    requiresTemplateConfirm: false,
    supportsRevision: false,
    allowWebSearch: false,
    systemPrompt: "你是产品经理工作台中的通用 AI 助手。只围绕用户当前输入、引用内容和附件进行理解与输出，不要默认套用任何快捷功能工作流。",
  },
  requirement: {
    id: "requirement",
    name: "需求澄清",
    outputMode: "artifact",
    artifactType: "clarification",
    preferredFormat: "md",
    editStrategy: "patch",
    requiresClarify: true,
    requiresTemplateConfirm: true,
    supportsRevision: true,
    allowWebSearch: false,
    systemPrompt: "你负责需求澄清。与用户对话时要优先求证关键需求细节，确认场景、边界、角色、交互方式和限制条件，最后形成需求理解摘要。",
    defaultTemplate: "# 需求理解摘要\n\n## 背景与目标\n\n## 使用场景\n\n## 关键需求\n\n## 约束与边界\n\n## 待确认问题\n",
  },
  prd: {
    id: "prd",
    name: "生成PRD",
    outputMode: "artifact",
    artifactType: "prd",
    preferredFormat: "md",
    editStrategy: "patch",
    requiresClarify: false,
    requiresTemplateConfirm: true,
    supportsRevision: true,
    allowWebSearch: false,
    systemPrompt: "你负责生成 PRD 文档。先确认 PRD 模板或目录，再输出结构化、可继续编辑的完整 PRD。",
    defaultTemplate: "# 产品需求文档\n\n## 1. 背景与目标\n\n## 2. 用户与场景\n\n## 3. 功能范围\n\n## 4. 详细需求\n\n## 5. 非功能要求\n\n## 6. 风险与依赖\n",
  },
  prdReview: {
    id: "prdReview",
    name: "需求评审",
    outputMode: "artifact",
    artifactType: "review",
    preferredFormat: "md",
    editStrategy: "patch",
    requiresClarify: false,
    requiresTemplateConfirm: true,
    supportsRevision: true,
    allowWebSearch: false,
    systemPrompt: "你负责需求评审。应从产品、技术、业务和交付风险角度输出评审意见和修改建议。",
    defaultTemplate: "# PRD 评审意见\n\n## 评审范围\n\n## 产品角度\n\n## 技术角度\n\n## 业务角度\n\n## 风险与建议\n",
  },
  prototype: {
    id: "prototype",
    name: "生成原型图",
    outputMode: "artifact",
    artifactType: "prototype",
    preferredFormat: "html",
    editStrategy: "patch",
    requiresClarify: false,
    requiresTemplateConfirm: true,
    supportsRevision: true,
    allowWebSearch: false,
    systemPrompt: "你负责生成原型图。请先确认页面结构或原型范围，再输出可直接预览的完整 HTML 原型文件。",
    defaultTemplate: "<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"UTF-8\" />\n  <title>原型页面</title>\n</head>\n<body>\n  <main>\n    <header>页面标题</header>\n    <section>核心内容区</section>\n    <footer>底部操作区</footer>\n  </main>\n</body>\n</html>",
  },
  story: {
    id: "story",
    name: "任务拆解",
    outputMode: "artifact",
    artifactType: "story",
    preferredFormat: "md",
    editStrategy: "patch",
    requiresClarify: false,
    requiresTemplateConfirm: true,
    supportsRevision: true,
    allowWebSearch: false,
    systemPrompt: "你负责任务拆解。根据 PRD 或需求描述输出结构化 Story 任务。",
    defaultTemplate: "# Story 拆解\n\n## Epic\n\n## Story 列表\n\n### Story 1\n- 目标\n- 验收标准\n",
  },
  testCase: {
    id: "testCase",
    name: "生成测试用例",
    outputMode: "artifact",
    artifactType: "testcase",
    preferredFormat: "md",
    editStrategy: "patch",
    requiresClarify: false,
    requiresTemplateConfirm: true,
    supportsRevision: true,
    allowWebSearch: false,
    systemPrompt: "你负责生成测试用例。根据 Story 或需求输出结构化、可继续编辑的测试用例。",
    defaultTemplate: "# 测试用例\n\n| 编号 | 场景 | 前置条件 | 步骤 | 预期结果 |\n| --- | --- | --- | --- | --- |\n",
  },
  testReview: {
    id: "testReview",
    name: "测试用例评审",
    outputMode: "artifact",
    artifactType: "review",
    preferredFormat: "md",
    editStrategy: "patch",
    requiresClarify: false,
    requiresTemplateConfirm: true,
    supportsRevision: true,
    allowWebSearch: false,
    systemPrompt: "你负责测试用例评审。根据 PRD 评估测试用例的覆盖完整性、遗漏场景和风险。",
    defaultTemplate: "# 测试用例评审\n\n## 评审范围\n\n## 覆盖充分场景\n\n## 漏测风险\n\n## 修改建议\n",
  },
  releaseNote: {
    id: "releaseNote",
    name: "产品更新说明",
    outputMode: "artifact",
    artifactType: "release",
    preferredFormat: "md",
    editStrategy: "patch",
    requiresClarify: false,
    requiresTemplateConfirm: true,
    supportsRevision: true,
    allowWebSearch: false,
    systemPrompt: "你负责产品更新说明。根据 PRD 输出可直接对外或对内发布的功能更新说明。",
    defaultTemplate: "# 产品功能更新说明\n\n## 版本信息\n\n## 本次更新内容\n\n## 用户价值\n\n## 注意事项\n",
  },
  competitorAnalysis: {
    id: "competitorAnalysis",
    name: "产品竞品分析",
    outputMode: "artifact",
    artifactType: "analysis",
    preferredFormat: "md",
    editStrategy: "patch",
    requiresClarify: true,
    requiresTemplateConfirm: true,
    supportsRevision: true,
    allowWebSearch: true,
    systemPrompt: "你负责产品竞品分析。根据用户需求识别竞品范围，必要时联网检索并输出结构化分析报告，若缺少检索能力需明确说明。",
    defaultTemplate: "# 竞品分析报告\n\n## 分析目标\n\n## 竞品列表\n\n## 核心能力对比\n\n## 差异点分析\n\n## 结论与建议\n",
  },
  productResearch: {
    id: "productResearch",
    name: "产品调研报告",
    outputMode: "artifact",
    artifactType: "report",
    preferredFormat: "md",
    editStrategy: "patch",
    requiresClarify: true,
    requiresTemplateConfirm: true,
    supportsRevision: true,
    allowWebSearch: true,
    systemPrompt: "你负责产品调研报告。根据输入需求明确调研方向，必要时联网检索并输出带来源信息的调研报告，若缺少检索能力需明确说明。",
    defaultTemplate: "# 产品调研报告\n\n## 调研目标\n\n## 行业/用户洞察\n\n## 关键发现\n\n## 机会点\n\n## 结论与建议\n",
  },
  productPresentation: {
    id: "productPresentation",
    name: "产品介绍 PPT",
    outputMode: "artifact",
    artifactType: "presentation",
    preferredFormat: "md",
    editStrategy: "patch",
    requiresClarify: false,
    requiresTemplateConfirm: true,
    supportsRevision: true,
    allowWebSearch: false,
    systemPrompt: "你负责生成产品介绍 PPT 内容。请先确认页面结构，再输出逐页可继续编辑的内容。",
    defaultTemplate: "# 产品介绍 PPT\n\n## 第 1 页：封面\n\n## 第 2 页：产品定位\n\n## 第 3 页：核心功能\n\n## 第 4 页：用户价值\n\n## 第 5 页：总结\n",
  },
};

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

    if (req.method === "PATCH" && url.pathname.startsWith("/api/artifacts/")) {
      const artifactId = decodeURIComponent(url.pathname.replace("/api/artifacts/", ""));
      const body = await readJsonBody(req);
      const result = updateArtifact(artifactId, body);
      return sendJson(res, 200, { artifact: result });
    }

    if (req.method === "POST" && url.pathname === "/api/resources") {
      const body = await readJsonBody(req);
      const result = createResourceFromArtifact(body);
      return sendJson(res, 200, { resource: result });
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
  const request = normalizeChatRequest(body);
  let providerResult;

  if (request.provider === "codexCli") {
    providerResult = await callCodexCli(request);
  } else if (request.provider === "codexDesktop") {
    providerResult = await callCodexDesktop(request);
  } else if (request.provider === "openai") {
    providerResult = await callOpenAI(request);
  } else if (request.provider === "codexProxy") {
    providerResult = await callCodexProxy(request);
  } else {
    throw createError(400, "Unsupported provider");
  }

  return finalizeChatResponse(request, providerResult);
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
    const prompt = buildCodexCliPrompt(body, body.history);
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
      replyText: reply,
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
      text: buildOpenAITextPrompt(body),
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
    instructions: buildWorkflowInstructions(body),
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
    replyText: extractResponseText(data),
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
      instructions: buildWorkflowInstructions(body),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildCodexTextPrompt(body),
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
      replyText: extractResponseText(response),
    };
  }

  const messages = [
    {
      role: "system",
      content: buildWorkflowInstructions(body),
    },
    ...body.history,
    {
      role: "user",
      content: buildCodexTextPrompt(body),
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
    replyText: normalizeChatContent(reply),
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
      text: buildOpenAITextPrompt(body),
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
    instructions: buildWorkflowInstructions(body),
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
    replyText: parsed.reply,
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

function normalizeChatRequest(body) {
  const workflowId = normalizeWorkflowId(body.workflowId || body.branchId || "");
  const workflow = workflowRegistry[workflowId] || workflowRegistry.general;
  const request = {
    provider: body.provider,
    model: body.model || "",
    conversationId: body.conversationId || "",
    workflowId: workflow.id,
    workflow,
    workflowName: workflow.name,
    message: body.message || body.messageText || "",
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    history: Array.isArray(body.history) ? body.history : [],
    quotedArtifacts: Array.isArray(body.quotedArtifacts) ? body.quotedArtifacts : [],
    quotedResources: Array.isArray(body.quotedResources) ? body.quotedResources : [],
    targetArtifactId: body.targetArtifactId || "",
    artifactEditIntent: body.artifactEditIntent === "modify" ? "modify" : "none",
    templateConfirmed: Boolean(body.templateConfirmed),
    templateSource: body.templateSource || "system_default_template",
    previousResponseId: body.previousResponseId || "",
    branchId: workflow.id,
    branchName: workflow.name,
  };
  request.stageState = determineWorkflowStage(request);
  return request;
}

function normalizeWorkflowId(workflowId) {
  if (!workflowId) return "general";
  return workflowRegistry[workflowId] ? workflowId : "general";
}

function determineWorkflowStage(request) {
  if (request.workflow.id === "general") {
    return { stage: "general_chat", needsUserConfirmation: false };
  }

  if (
    request.workflow.supportsRevision
    && request.artifactEditIntent === "modify"
    && (request.targetArtifactId || request.quotedArtifacts.length || request.quotedResources.length)
  ) {
    return { stage: "revise_existing", needsUserConfirmation: false };
  }

  if (shouldEnterClarify(request)) {
    return { stage: "clarify", needsUserConfirmation: false };
  }

  if (shouldEnterTemplateConfirm(request)) {
    return { stage: "template_confirm", needsUserConfirmation: true };
  }

  return { stage: "draft_generate", needsUserConfirmation: false };
}

function shouldEnterClarify(request) {
  if (!request.workflow.requiresClarify) return false;
  const message = String(request.message || "").trim();
  const hasSupportMaterials = Boolean(
    message.length >= 18
    || request.attachments.length
    || request.quotedArtifacts.length
    || request.quotedResources.length,
  );

  if (request.workflow.id === "requirement") {
    const wantsSummary = /摘要|总结|整理|汇总|输出文档|生成文档|形成摘要/i.test(message);
    return !wantsSummary;
  }

  return !hasSupportMaterials;
}

function shouldEnterTemplateConfirm(request) {
  if (!request.workflow.requiresTemplateConfirm) return false;
  if (request.templateConfirmed) return false;
  if (hasExplicitTemplateInput(request)) return false;
  return true;
}

function hasExplicitTemplateInput(request) {
  if (["uploaded_template", "quoted_template", "user_defined_template"].includes(request.templateSource)) {
    return true;
  }
  const message = String(request.message || "");
  return /模板|大纲|按以下结构|按这个结构|按此结构|template/i.test(message);
}

function appendQuotedContext(blocks, request) {
  if (request.quotedArtifacts?.length) {
    blocks.push("本轮引用的会话文档：");
    request.quotedArtifacts.forEach((item, index) => {
      blocks.push(`${index + 1}. ${item.title || item.artifactId}\n${item.content || ""}`);
    });
  }

  if (request.quotedResources?.length) {
    blocks.push("本轮引用的资源库内容：");
    request.quotedResources.forEach((item, index) => {
      blocks.push(`${index + 1}. ${item.name || item.resourceId}\n${item.content || ""}`);
    });
  }
}

function finalizeChatResponse(request, providerResult) {
  const replyText = providerResult.replyText || providerResult.reply || "模型返回了空结果。";
  const artifacts = buildArtifactsFromReply(request, replyText);
  return {
    provider: providerResult.provider,
    model: providerResult.model,
    previousResponseId: providerResult.previousResponseId || "",
    reply: replyText,
    replyText,
    workflowUsed: request.workflow.id === "general" ? "" : request.workflow.id,
    stage: request.stageState.stage,
    needsUserConfirmation: request.stageState.needsUserConfirmation,
    questions: request.stageState.stage === "clarify" ? extractQuestionCandidates(replyText) : [],
    templateProposal: request.stageState.stage === "template_confirm"
      ? {
          title: `${request.workflow.name}模板建议`,
          content: replyText,
          source: request.templateSource || "system_default_template",
        }
      : null,
    artifacts,
    citations: [],
  };
}

function buildArtifactsFromReply(request, replyText) {
  const normalized = String(replyText || "").trim();
  const shouldCreateArtifact = ["draft_generate", "revise_existing", "finalize"].includes(request.stageState.stage)
    && (request.workflow.outputMode === "artifact" || normalized.length > 600 || /^#|\n#|```|^\|/m.test(normalized));
  if (!shouldCreateArtifact) return [];

  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  const artifact = {
    id: createId("artifact"),
    conversationId: request.conversationId || "",
    sourceMessageId: "",
    workflowId: request.workflow.id === "general" ? "" : request.workflow.id,
    kind: "document",
    title: buildArtifactTitle(request),
    format: request.workflow.preferredFormat || inferArtifactFormat(normalized),
    content: normalized,
    preview: buildDocumentPreview(normalized, buildArtifactTitle(request), now),
    createdAt: now,
    updatedAt: now,
    version: 1,
    isEdited: false,
  };
  artifactStore.set(artifact.id, artifact);
  return [artifact];
}

function buildArtifactTitle(request) {
  const suffixMap = {
    requirement: "需求澄清说明",
    prd: "PRD 文档",
    prdReview: "需求评审结果",
    prototype: "原型 HTML",
    story: "任务拆解文档",
    testCase: "测试用例表",
    testReview: "测试用例评审结果",
    releaseNote: "产品更新说明",
    competitorAnalysis: "竞品分析报告",
    productResearch: "产品调研报告",
    productPresentation: "产品介绍内容",
    general: "文档",
  };
  return `${request.workflow.name}-${suffixMap[request.workflow.id] || "文档"}`;
}

function inferArtifactFormat(content) {
  if (/<!DOCTYPE html>|<html[\s>]/i.test(content)) return "html";
  return content.includes("{") && content.includes("}") ? "json" : "md";
}

function extractQuestionCandidates(replyText) {
  return String(replyText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /[？?]$/.test(line) || /^\d+[.)、]/.test(line))
    .slice(0, 5);
}

function buildDocumentPreview(content, title, createdAt) {
  const lines = String(content || "").split("\n").filter(Boolean);
  const normalizedTitle = extractDocumentTitle(content, title);
  const preview = [
    { type: "h2", text: normalizedTitle },
    { type: "meta", text: createdAt || "" },
  ];
  lines.forEach((line) => {
    if (line.startsWith("# ")) return;
    if (line.startsWith("## ")) {
      preview.push({ type: "h3", text: line.replace(/^## /, "") });
      return;
    }
    preview.push({ type: "p", text: line });
  });
  if (preview.length === 2) {
    preview.push({ type: "p", text: "暂无内容" });
  }
  return preview;
}

function extractDocumentTitle(content, fallbackTitle = "未命名文档") {
  const firstHeading = String(content || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^#\s+/.test(line));
  return firstHeading ? firstHeading.replace(/^#\s+/, "").trim() : (fallbackTitle || "未命名文档");
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

function buildWorkflowInstructions(request) {
  const workflowName = request.workflow?.name || "普通对话";
  const stage = request.stageState?.stage || "general_chat";
  const stageInstructionMap = {
    general_chat: "当前阶段是普通对话。直接理解用户输入并给出有帮助的回复，不要强行套用模板或生成正式产物。",
    clarify: "当前阶段是需求澄清。先提出最关键的补充问题，不要直接输出最终成品。问题要尽量少，但必须覆盖会影响结果的关键约束。",
    template_confirm: "当前阶段是模板确认。不要直接输出最终成品。请给出建议模板、大纲或页面结构，等待用户确认后再生成正式内容。",
    draft_generate: "当前阶段是正式生成。请基于已确认的模板或默认模板，直接输出完整成品。",
    revise_existing: "当前阶段是基于原文修改。请严格依据引用/目标文档更新完整版本，未提及部分尽量保持不变，不要重写成无关新文档。",
    finalize: "当前阶段是最终交付。请输出最终可直接使用的成品。",
  };
  return [
    `你是产品经理工作台中“${workflowName}”工作流的 AI 助手。`,
    request.workflow?.systemPrompt || workflowRegistry.general.systemPrompt,
    stageInstructionMap[stage] || stageInstructionMap.general_chat,
    request.workflow.allowWebSearch
      ? "该工作流允许联网搜索。若当前执行环境具备搜索能力，请使用可信来源并在结果中保留来源信息；若不具备，请明确说明限制。"
      : "该工作流默认不依赖联网搜索，优先基于用户提供资料完成任务。",
    request.workflow.requiresTemplateConfirm
      ? `若用户未给模板，可参考以下默认模板结构：\n${request.workflow.defaultTemplate || "无"}`
      : "该工作流不要求额外模板确认。",
    request.artifactEditIntent === "modify" && request.targetArtifactId
      ? "本轮是基于已存在文档的修改任务。除非用户明确要求重写，否则优先在原内容基础上修改，未提及部分尽量保持不变。"
      : "若当前阶段是生成类任务，请优先输出可继续编辑、可直接复用的内容。",
  ].join("\n");
}

function buildOpenAITextPrompt(request) {
  const textBlocks = [];
  textBlocks.push(`当前工作流：${request.workflow?.name || "普通对话"}`);
  textBlocks.push(`当前阶段：${request.stageState?.stage || "general_chat"}`);
  textBlocks.push(`模板来源：${request.templateSource || "system_default_template"}`);
  textBlocks.push(`用户输入：${request.message || "请结合附件继续处理。"} `);

  const textAttachments = (request.attachments || []).filter((item) => item.payload?.mode === "text");
  if (textAttachments.length) {
    textBlocks.push("以下是用户上传的文本型文件内容：");
    textAttachments.forEach((item, index) => {
      textBlocks.push(`文件 ${index + 1}：${item.name}\n${item.payload.text}`);
    });
  }

  const otherAttachments = (request.attachments || []).filter((item) => item.payload?.mode !== "text");
  if (otherAttachments.length) {
    textBlocks.push("本轮同时附带以下非文本附件：");
    otherAttachments.forEach((item, index) => {
      textBlocks.push(`${index + 1}. ${item.kind} - ${item.name} - ${item.meta}`);
    });
  }

  appendQuotedContext(textBlocks, request);

  return textBlocks.join("\n\n");
}

function buildCodexTextPrompt(request) {
  const blocks = [];
  blocks.push(`当前工作流：${request.workflow?.name || "普通对话"}`);
  blocks.push(`当前阶段：${request.stageState?.stage || "general_chat"}`);
  blocks.push(`模板来源：${request.templateSource || "system_default_template"}`);
  blocks.push(`用户输入：${request.message || "请结合附件继续处理。"} `);

  if (request.attachments?.length) {
    blocks.push("附件信息：");
    request.attachments.forEach((item, index) => {
      blocks.push(`${index + 1}. ${item.kind} - ${item.name} - ${item.meta}`);
      if (item.payload?.mode === "text" && item.payload.text) {
        blocks.push(`文件内容摘要：\n${item.payload.text}`);
      }
    });
  }

  appendQuotedContext(blocks, request);

  return blocks.join("\n\n");
}

function buildCodexCliPrompt(request, history) {
  const blocks = [buildWorkflowInstructions(request)];

  if (history?.length) {
    blocks.push("以下是同一工作流下的历史对话，请延续上下文：");
    history.forEach((item, index) => {
      blocks.push(`${index + 1}. ${item.role === "assistant" ? "助手" : "用户"}：${item.content}`);
    });
  }

  blocks.push("以下是本轮用户输入与附件信息：");
  blocks.push(buildCodexTextPrompt(request));
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

function updateArtifact(artifactId, body) {
  const current = artifactStore.get(artifactId);
  if (!current) {
    throw createError(404, "未找到对应文档");
  }
  const nextContent = typeof body.content === "string" ? body.content : current.content;
  const nextTitle = extractDocumentTitle(nextContent, body.title || current.title);
  const next = {
    ...current,
    title: nextTitle,
    format: body.format || current.format,
    content: nextContent,
    updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    version: Number(current.version || 1) + 1,
    isEdited: true,
  };
  next.preview = buildDocumentPreview(next.content, next.title, next.createdAt);
  artifactStore.set(artifactId, next);
  return next;
}

function createResourceFromArtifact(body) {
  const artifact = artifactStore.get(body.artifactId);
  if (!artifact) {
    throw createError(404, "未找到对应 artifact");
  }
  const record = {
    id: createId("resource"),
    artifactId: artifact.id,
    sourceArtifactId: artifact.id,
    workflowId: artifact.workflowId || body.workflowId || "",
    name: body.name || artifact.title,
    type: workflowRegistry[artifact.workflowId]?.name || body.workflowId || "普通对话",
    format: artifact.format,
    content: artifact.content,
    description: body.description || "未命名对话",
    createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
  };
  resourceStore.set(record.id, record);
  return record;
}

function validateChatBody(body) {
  if (!body || typeof body !== "object") {
    throw createError(400, "请求体无效");
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

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
