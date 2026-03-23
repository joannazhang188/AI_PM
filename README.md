# 产品经理工作台

## 启动

1. 复制配置文件：

```bash
cp .env.example .env
```

2. 在 `.env` 中配置至少一种通道：

- `本机 Codex CLI`：默认读取 `codex exec`，推荐优先使用
- `Codex Desktop Auth`：无需额外配置，自动读取 `~/.codex/auth.json`
- `OPENAI_API_KEY`：启用 OpenAI API
- `CODEX_PROXY_BASE_URL`：启用本地 Codex 代理

3. 启动服务：

```bash
node server.js
```

4. 打开：

```text
http://127.0.0.1:4173/
```

## 当前实现

- 前端支持 7 条支线切换
- 支持真实对话请求
- 支持本机 `codex exec` 通道
- 支持 OpenAI Responses API
- 支持 Codex Desktop Auth
- 支持 OpenAI-compatible 的本地 Codex 代理
- 支持图片、PDF、文本文件随消息提交

## 说明

- OpenAI 侧使用 Responses API。
- 本机 Codex CLI 侧通过后端执行 `codex exec --ephemeral -C <workdir> -m <model> -o <outputFile> ...`。
- Codex Desktop Auth 侧使用 `https://chatgpt.com/backend-api/codex/responses` 的 SSE 流式接口。
- 图片通过 `input_image` 发送。
- PDF 通过 `input_file` 的 Base64 data URL 发送。
- 文本类文件会直接把内容拼入本轮上下文。
