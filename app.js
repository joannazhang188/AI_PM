const STORAGE_KEY = "pm-workbench-ui-replica-v2";

const shortcuts = [
  { name: "需求澄清", theme: "sky-lime", icon: "note" },
  { name: "生成PRD", theme: "ice-mint", icon: "doc" },
  { name: "需求评审", theme: "sky-amber", icon: "review" },
  { name: "生成原型图", theme: "sand-khaki", icon: "prototype" },
  { name: "任务拆解", theme: "blue-green", icon: "task" },
  { name: "生成测试用例", theme: "mint-yellow", icon: "flask" },
  { name: "测试用例评审", theme: "teal-lime", icon: "checklist" },
  { name: "产品更新说明", theme: "cyan-grass", icon: "refresh" },
  { name: "产品竞品分析", theme: "blue-leaf", icon: "chart" },
  { name: "产品调研报告", theme: "ocean-lime", icon: "search" },
  { name: "产品介绍 PPT", theme: "aqua-sun", icon: "presentation" },
];

const defaultDocuments = {
  doc_prd_preview: {
    id: "doc_prd_preview",
    conversationId: "conv-d",
    sourceMessageId: "msg-2",
    workflowId: "prdReview",
    title: "文档标题",
    createdAt: "文档生成时间",
    updatedAt: "文档生成时间",
    version: 1,
    isEdited: false,
    format: "md",
    content: `# 文档标题\n\n## 文档正文标题\n\n这是一段文档内容\n这是一段文档内容\n这是一段文档内容`,
  },
};

const ACTIVE_PROVIDER = "codexCli";

const defaultState = {
  sidebarCollapsed: false,
  mainView: "home",
  activeConversationId: "",
  activeProjectId: null,
  lastConversationId: "",
  libraryReturnToConversation: false,
  documentOpen: false,
  activeDocumentId: "doc_prd_preview",
  docMode: "preview",
  docIsEditing: false,
  docEditorText: "",
  composerDraft: {
    text: "",
    selectedWorkflowId: "",
    attachments: [],
    modelMode: "auto",
  },
  draftProjectId: null,
  isGenerating: false,
  openMenu: null,
  exportMenuOpen: false,
  resources: [],
  documents: normalizeDocuments(defaultDocuments),
  projects: [
    { id: "project-1", name: "狼人杀游戏", expanded: true, createdAt: Date.now() - 300000 },
    { id: "project-2", name: "项目名称 2", expanded: true, createdAt: Date.now() - 200000 },
    { id: "project-3", name: "项目名称 3", expanded: true, createdAt: Date.now() - 100000 },
    { id: "project-4", name: "项目名称 4", expanded: false, createdAt: Date.now() - 50000 },
  ],
  conversations: [
    { id: "conv-a", title: "狼人杀游戏需求澄清", projectId: "project-1", createdAt: Date.now() - 260000, updatedAt: Date.now() - 260000, shortcut: "需求澄清", messages: [] },
    { id: "conv-b", title: "狼人杀游戏需求", projectId: "project-1", createdAt: Date.now() - 80000, updatedAt: Date.now() - 80000, shortcut: "生成PRD", messages: [] },
    { id: "conv-c", title: "对话名称 1", projectId: "project-2", createdAt: Date.now() - 86000, updatedAt: Date.now() - 86000, shortcut: "", messages: [] },
    {
      id: "conv-d",
      title: "对话名称 2",
      projectId: "project-2",
      createdAt: Date.now() - 3600,
      updatedAt: Date.now() - 3600,
      workflowId: "prdReview",
      shortcut: "需求评审",
      messages: [
        { id: "msg-1", role: "user", bubble: "我要怎么运行" },
        {
          id: "msg-2",
          role: "assistant",
          content: [
            "1. 打开微信开发者工具。",
            "2. 选择“导入项目”。",
            "3. 项目目录选这个： /Users/mac/AI 项目/项目/werewolf-miniapp",
            "4. AppID 用测试号即可（项目里已是 touristappid）。",
            "5. 点击“进入项目”后，编译运行。",
            "",
            "如果导入时报 AppID 问题：",
            "1. 在开发者工具里改成你自己的小程序 AppID。",
            "2. 或继续用“测试号/无 AppID 模式”运行。",
          ],
          cards: [{ artifactId: "doc_prd_preview", title: "PRD 精简版文档卡片", kind: "document" }],
        },
      ],
    },
  ],
};

const state = loadState();
const els = {
  sidebar: document.querySelector("#sidebar"),
  mainView: document.querySelector("#mainView"),
};

render();

function loadState() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (!saved || typeof saved !== "object") {
    return structuredClone(defaultState);
  }

  const merged = { ...structuredClone(defaultState), ...saved };
  const draftSource = saved.composerDraft && typeof saved.composerDraft === "object"
    ? saved.composerDraft
    : {
        text: saved.composerText || "",
        selectedWorkflowId: saved.composerMode || "",
        attachments: Array.isArray(saved.attachments) ? saved.attachments : [],
        modelMode: saved.modelMode || "auto",
      };

  merged.mainView = ["home", "library", "conversation"].includes(merged.mainView) ? merged.mainView : "home";
  merged.docMode = ["preview", "code"].includes(merged.docMode) ? merged.docMode : "preview";
  merged.resources = Array.isArray(merged.resources) ? merged.resources : [];
  merged.projects = Array.isArray(merged.projects) ? merged.projects : structuredClone(defaultState.projects);
  merged.conversations = Array.isArray(merged.conversations) ? merged.conversations : structuredClone(defaultState.conversations);
  merged.documents = normalizeDocuments(saved.documents && typeof saved.documents === "object" ? saved.documents : defaultDocuments);
  merged.composerDraft = {
    text: typeof draftSource.text === "string" ? draftSource.text : "",
    selectedWorkflowId: normalizeWorkflowId(draftSource.selectedWorkflowId || ""),
    attachments: Array.isArray(draftSource.attachments) ? draftSource.attachments : [],
    modelMode: ["auto", "fast", "quality"].includes(draftSource.modelMode) ? draftSource.modelMode : "auto",
  };
  merged.activeConversationId = merged.conversations.some((item) => item?.id === merged.activeConversationId) ? merged.activeConversationId : "";
  merged.lastConversationId = merged.conversations.some((item) => item?.id === merged.lastConversationId) ? merged.lastConversationId : "";
  merged.activeProjectId = merged.projects.some((item) => item?.id === merged.activeProjectId) ? merged.activeProjectId : null;
  merged.draftProjectId = merged.projects.some((item) => item?.id === merged.draftProjectId) ? merged.draftProjectId : null;
  const documentIds = Object.keys(merged.documents);
  merged.activeDocumentId = documentIds.includes(merged.activeDocumentId) ? merged.activeDocumentId : defaultState.activeDocumentId;
  merged.documentOpen = Boolean(merged.documentOpen && documentIds.includes(merged.activeDocumentId));
  merged.docIsEditing = Boolean(merged.docIsEditing);
  merged.docEditorText = typeof merged.docEditorText === "string" ? merged.docEditorText : "";
  merged.conversations = merged.conversations.map((conversation) => ({
    ...conversation,
    workflowId: normalizeWorkflowId(conversation.workflowId || getWorkflowIdByShortcut(conversation.shortcut || "")),
    messages: Array.isArray(conversation.messages) ? conversation.messages.map((message) => ({
      ...message,
      cards: Array.isArray(message.cards)
        ? message.cards.map((card) => ({
            artifactId: card.artifactId || card.id,
            title: card.title,
            kind: "document",
          }))
        : [],
    })) : [],
  }));
  return merged;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  syncDocumentPanelState();
  renderSidebar();
  renderMainView();
  bindSidebarEvents();
  renderFloatingMenu();
  persist();
}

function renderSidebar() {
  els.sidebar.className = `sidebar${state.sidebarCollapsed ? " is-collapsed" : ""}`;
  const ungrouped = getUngroupedConversations();
  els.sidebar.innerHTML = `
    <div class="sidebar-shell">
      <div class="brand-row">
        <div class="brand-mark">${homeIcon()}</div>
        <div class="brand-title">产品经理工作台</div>
        <button class="icon-button" data-action="toggle-sidebar" aria-label="切换侧边栏">${chevronIcon()}</button>
      </div>
      <div class="action-stack">
        <button class="action-button" data-action="new-project">${plusIcon()}<span class="action-label">新建项目</span></button>
        <button class="action-button" data-action="new-conversation">${chatIcon()}<span class="action-label">新对话</span></button>
        <button class="action-button${state.mainView === "library" ? " action-button--active" : ""}" data-action="open-library">${stackIcon()}<span class="action-label">资源库</span></button>
      </div>
      ${state.sidebarCollapsed ? "" : `
        <div class="tree-list">
          ${ungrouped.length ? renderUngroupedGroup(ungrouped) : ""}
          ${state.projects.map(renderProjectNode).join("")}
        </div>
      `}
    </div>
  `;
}

function renderUngroupedGroup(conversations) {
  return `
    <section class="tree-project">
      <div class="tree-row">
        <span class="tree-icon">${chatIcon()}</span>
        <div class="tree-copy"><span class="tree-title">无项目对话</span></div>
      </div>
      <div class="tree-children">${conversations.map((conversation) => renderConversationLink(conversation)).join("")}</div>
    </section>
  `;
}

function renderProjectNode(project) {
  const conversations = getProjectConversations(project.id);
  return `
    <section class="tree-project">
      <div class="tree-row">
        <span class="tree-icon">${briefcaseIcon()}</span>
        <div class="tree-copy"><span class="tree-title">${escapeHtml(project.name)}</span></div>
        <button class="tree-trigger" data-action="toggle-project" data-project-id="${project.id}" aria-label="展开或收起项目">${project.expanded ? upChevronIcon() : downChevronIcon()}</button>
        <button class="tree-trigger" data-action="toggle-menu" data-menu-type="project" data-menu-id="${project.id}" aria-label="更多">...</button>
      </div>
      ${project.expanded ? `
        <div class="tree-children">
          ${conversations.length ? conversations.map((conversation) => renderConversationLink(conversation)).join("") : `<span class="tree-subtitle">该项目下暂无对话记录</span>`}
        </div>
      ` : ""}
    </section>
  `;
}

function renderProjectMenu(projectId) {
  return `
    <div class="side-menu">
      <button class="side-menu__item" data-action="create-project-conversation" data-project-id="${projectId}">新建对话</button>
      <button class="side-menu__item" data-action="rename-project" data-project-id="${projectId}">项目重命名</button>
      <button class="side-menu__item side-menu__item--danger" data-action="delete-project" data-project-id="${projectId}">删除</button>
    </div>
  `;
}

function renderConversationLink(conversation) {
  return `
    <div class="tree-conversation-wrap">
      <button class="conversation-link${state.activeConversationId === conversation.id && state.mainView === "conversation" ? " is-active" : ""}" data-action="open-conversation" data-conversation-id="${conversation.id}">
        <div class="tree-copy"><span class="tree-title">${escapeHtml(conversation.title)}</span></div>
        <span class="tree-time">${formatRelative(conversation.updatedAt)}</span>
      </button>
      <button class="tree-trigger" data-action="toggle-menu" data-menu-type="conversation" data-menu-id="${conversation.id}" aria-label="更多">...</button>
    </div>
  `;
}

function renderConversationMenu(conversationId) {
  return `
    <div class="side-menu side-menu--conversation">
      <button class="side-menu__item" data-action="rename-conversation" data-conversation-id="${conversationId}">重命名</button>
      <button class="side-menu__item" data-action="move-conversation" data-conversation-id="${conversationId}">转移至项目</button>
      <button class="side-menu__item side-menu__item--danger" data-action="delete-conversation" data-conversation-id="${conversationId}">删除</button>
    </div>
  `;
}

function renderMainView() {
  if (state.mainView === "library") {
    els.mainView.innerHTML = renderLibraryView();
    bindMainEvents();
    return;
  }
  if (state.mainView === "conversation") {
    els.mainView.innerHTML = renderConversationView();
    bindMainEvents();
    return;
  }
  els.mainView.innerHTML = renderHomeView();
  bindMainEvents();
}

function renderHomeView() {
  return `
    <section class="home-view">
      <div class="hero-panel">
        <div class="hero-badge">产品团队超级智能体</div>
        <h1 class="hero-title">需要我为你做些什么呢?</h1>
      </div>
      ${renderComposer(false)}
      <div class="section-label">快捷功能</div>
      <div class="shortcut-grid">
        ${shortcuts.map((item) => `<button class="shortcut-card shortcut-card--${item.theme}" data-action="shortcut" data-shortcut="${item.name}"><span class="shortcut-card__icon">${renderShortcutIcon(item.icon)}</span>${item.name}</button>`).join("")}
      </div>
    </section>
  `;
}

function renderLibraryView() {
  return `
    <section class="library-view">
      <div class="library-toolbar">
        <button class="back-button" data-action="back-from-library"><span>${backIcon()}</span><span>返回对话</span></button>
      </div>
      <div class="library-title-block"><h2 class="library-title">资源库</h2></div>
      ${state.resources.length ? `
        <div class="table-shell">
          <table>
            <colgroup>
              <col class="library-col-id" />
              <col class="library-col-name" />
              <col class="library-col-type" />
              <col class="library-col-date" />
              <col class="library-col-desc" />
              <col class="library-col-action" />
            </colgroup>
            <thead>
              <tr><th>资源 ID</th><th>资源名称</th><th>所属类型</th><th>创建日期</th><th>说明</th><th>操作</th></tr>
            </thead>
            <tbody>
              ${state.resources.map((item) => `
                <tr>
                  <td>${item.id}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.type)}</td><td>${item.createdAt}</td><td>${escapeHtml(item.description)}</td>
                  <td><button class="table-action" data-action="quote-resource" data-resource-id="${item.id}">引用至对话</button><button class="table-action table-action--danger" data-action="delete-resource" data-resource-id="${item.id}">删除</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="library-empty">暂无保存资源</div>`}
    </section>
  `;
}

function renderConversationView() {
  const conversation = getActiveConversation();
  const draftTitle = state.composerDraft.text.trim() ? buildConversationTitle(state.composerDraft.text) : "新对话";
  const layoutClass = state.documentOpen ? "conversation-layout has-document" : "conversation-layout";
  return `
    <section class="conversation-view">
      <div class="${layoutClass}">
        <div class="chat-shell">
          <div class="chat-header">
            <span>${escapeHtml(conversation?.title || draftTitle)}</span>
            <button class="chat-exit" data-action="exit-conversation">退出对话</button>
          </div>
          <div class="chat-messages ${conversation?.messages?.length ? "" : "chat-empty"}">
            ${conversation ? renderMessages(conversation) : ""}
          </div>
          <div class="chat-input-dock">${renderComposer(true)}</div>
        </div>
        ${state.documentOpen ? renderDocumentPanel() : ""}
      </div>
    </section>
  `;
}

function renderMessages(conversation) {
  if (!conversation.messages.length) return "";
  return conversation.messages.map((message) => {
    if (message.role === "user") {
      return `
        <div class="bubble-row bubble-row--user">
          <div class="bubble-user-wrap">
            <div class="bubble-user">${escapeHtml(message.bubble)}</div>
            ${message.references?.length ? renderMessageReferences(message.references) : ""}
          </div>
        </div>
      `;
    }
    if (message.streaming) {
      return `
        <div class="bubble-row">
          <div class="assistant-block">
            ${message.content?.length ? renderAssistantContent(message.content, true) : `<div class="streaming-indicator"><span></span><span></span><span></span></div>`}
          </div>
        </div>
      `;
    }
    return `
      <div class="bubble-row">
        <div class="assistant-block">
          ${renderAssistantContent(message.content)}
          ${message.cards?.length ? `<div class="document-card-list">${message.cards.map((card) => `
            <div class="document-card">
              <button class="document-card__body" data-action="open-document" data-document-id="${card.artifactId}">
                <span class="document-card__title">${escapeHtml(card.title)}</span>
                <span class="document-card__meta">点击查看详情</span>
              </button>
              <button class="doc-quote" data-action="quote-document" data-document-id="${card.artifactId}">引用</button>
            </div>`).join("")}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function renderAssistantContent(lines, isStreaming = false) {
  return `
    ${lines.map((line) => {
      if (!line) return "<div style='height:12px'></div>";
      const normalized = escapeHtml(line).replace("/Users/mac/AI 项目/项目/werewolf-miniapp", "<span class='inline-code'>/Users/mac/AI 项目/项目/werewolf-miniapp</span>");
      return `<div>${normalized}</div>`;
    }).join("")}
    ${isStreaming ? `<span class="assistant-cursor" aria-hidden="true"></span>` : ""}
  `;
}

function renderMessageReferences(references) {
  return `
    <div class="message-reference-list">
      ${references.map((reference) => {
        const missing = isReferenceMissing(reference);
        return `
          <button
            class="message-reference-chip${missing ? " is-missing" : ""}"
            data-action="quote-history-reference"
            data-reference-type="${reference.referenceType}"
            data-reference-id="${reference.referenceId}"
            title="${missing ? "该文档已不存在" : "引用到对话框"}"
            aria-disabled="${missing ? "true" : "false"}"
          >
            <span class="message-reference-chip__name">${escapeHtml(reference.name)}</span>
            ${missing ? `<span class="message-reference-chip__badge">已失效</span>` : ""}
            <span class="message-reference-chip__meta">${missing ? "该文档已不存在" : "点击引用"}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderDocumentPanel() {
  const documentItem = getDocumentById(state.activeDocumentId);
  if (!documentItem) return "";
  return `
    <aside class="doc-panel">
      <div class="doc-toolbar">
        <div class="doc-toolbar-left"><button class="icon-button" data-action="close-document">${backIcon()}</button></div>
        <div class="doc-tabset">
          <button class="doc-tab${state.docMode === "code" ? " is-active" : ""}" data-action="switch-doc-mode" data-mode="code">代码</button>
          <button class="doc-tab${state.docMode === "preview" ? " is-active" : ""}" data-action="switch-doc-mode" data-mode="preview">预览</button>
        </div>
        <div class="doc-toolbar-right">
          <div class="doc-export-wrap">
            <button class="icon-button" data-action="toggle-export-menu">${downloadIcon()}</button>
            ${state.exportMenuOpen ? `
              <div class="doc-export-menu">
                <button class="doc-export-menu__item" data-action="export-document" data-export-type="pdf">导出为本地pdf</button>
                <button class="doc-export-menu__item" data-action="export-document" data-export-type="md">导出为本地 md</button>
                <button class="doc-export-menu__item" data-action="export-document" data-export-type="doc">导出为本地 doc</button>
                <button class="doc-export-menu__item" data-action="export-document" data-export-type="resource">导出到资源库</button>
              </div>
            ` : ""}
          </div>
          ${state.docIsEditing ? `<button class="doc-text-button" data-action="save-document">保存</button>` : `<button class="icon-button" data-action="edit-document" aria-label="编辑文档">${editIcon()}</button>`}
          <button class="icon-button" data-action="copy-document" aria-label="复制文档">${copyIcon()}</button>
        </div>
      </div>
      <div class="doc-content">
        ${state.docIsEditing ? `
          <textarea id="docEditorInput" class="doc-editor-textarea">${escapeHtml(state.docEditorText || documentItem.content || "")}</textarea>
        ` : state.docMode === "code" ? `<div class="doc-code">${escapeHtml(documentItem.content)}</div>` : renderDocPreview(documentItem)}
      </div>
    </aside>
  `;
}

function renderDocPreview(documentItem) {
  if (documentItem.format === "html") {
    return `<iframe class="doc-preview-frame" title="${escapeHtml(documentItem.title)}" srcdoc="${escapeHtml(documentItem.content)}"></iframe>`;
  }
  return buildDocumentPreview(
    documentItem.content,
    documentItem.title,
    documentItem.createdAt,
  ).map((block) => {
    if (block.type === "h2") return `<h2>${escapeHtml(block.text)}</h2>`;
    if (block.type === "meta") return `<div class="doc-meta">${escapeHtml(block.text)}</div>`;
    if (block.type === "h3") return `<h3>${escapeHtml(block.text)}</h3>`;
    return `<p>${escapeHtml(block.text)}</p>`;
  }).join("");
}

function getDocumentPreviewText(documentItem) {
  return buildDocumentPreview(
    documentItem.content,
    documentItem.title,
    documentItem.createdAt,
  ).map((block) => block.text).filter(Boolean).join("\n");
}

function renderComposer(withSelect) {
  const draft = state.composerDraft;
  const hasFile = draft.attachments.some((item) => item.kind === "file");
  const hasImage = draft.attachments.some((item) => item.kind === "image");
  const sendEnabled = canSend();
  const workflowId = draft.selectedWorkflowId;
  const workflowLabel = getShortcutByWorkflowId(workflowId);
  const workflowIcon = (shortcuts.find((item) => item.name === workflowLabel) || shortcuts[0]).icon;
  return `
    <div class="composer-card">
      <div class="composer-inner">
        <div class="composer-header${(draft.attachments.length || workflowId) ? "" : " is-empty"}">
          ${workflowId ? `<span class="attachment-chip attachment-chip--mode">${renderShortcutIcon(workflowIcon)}${escapeHtml(workflowLabel)}<button data-action="clear-mode">×</button></span>` : ""}
          ${draft.attachments.map((item) => `<span class="attachment-chip attachment-chip--${item.sourceType || item.kind}">${escapeHtml(item.name)}<button data-action="remove-attachment" data-attachment-id="${item.id}">×</button></span>`).join("")}
        </div>
        <div class="composer-body">
          <textarea id="composerInput" class="composer-textarea" placeholder="直接输入您的问题，支持上传图片/文件辅助说明">${escapeHtml(draft.text)}</textarea>
        </div>
        <div class="composer-footer">
          <div class="composer-footer__left">
            <label class="icon-button${hasFile ? " is-selected" : ""}" title="上传文件">${fileIcon()}<input id="fileInput" type="file" hidden multiple data-upload-kind="file" /></label>
            <label class="icon-button${hasImage ? " is-selected" : ""}" title="上传图片">${imageIcon()}<input id="imageInput" type="file" hidden multiple accept="image/*" data-upload-kind="image" /></label>
            <button class="tool-pill" data-action="open-library-from-composer">引用资源库</button>
            ${!withSelect ? `
              <select id="modelModeSelectHome" class="tool-select tool-select--model">
                ${renderModelModeOptions()}
              </select>` : ""}
            ${withSelect ? `
              <select id="composerModeSelect" class="tool-select">
                <option value="">选择快捷功能</option>
                ${shortcuts.map((item) => {
                  const value = getWorkflowIdByShortcut(item.name);
                  return `<option value="${value}" ${workflowId === value ? "selected" : ""}>${item.name}</option>`;
                }).join("")}
              </select>
              <select id="modelModeSelectChat" class="tool-select tool-select--model">
                ${renderModelModeOptions()}
              </select>` : ""}
          </div>
          <div class="composer-footer__right">
            <button class="icon-button voice-button" data-action="voice-input" title="语音输入" aria-label="语音输入">${micIcon()}</button>
            <button class="send-icon${sendEnabled ? " is-active" : ""}" data-action="send-message" ${sendEnabled ? "" : "disabled"}>${sendIcon()}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindSidebarEvents() {
  els.sidebar.querySelectorAll("[data-action]").forEach((node) => node.onclick = handleAction);
}

function bindMainEvents() {
  els.mainView.querySelectorAll("[data-action]").forEach((node) => node.onclick = handleAction);
  const input = document.querySelector("#composerInput");
  if (input) {
    input.addEventListener("input", (event) => {
      state.composerDraft.text = event.target.value;
      syncComposerUi();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (canSend()) sendCurrentMessage();
      }
    });
  }
  const select = document.querySelector("#composerModeSelect");
  if (select) {
    select.onchange = (event) => {
      state.composerDraft.selectedWorkflowId = normalizeWorkflowId(event.target.value);
      render();
    };
  }
  document.querySelectorAll("#modelModeSelectHome, #modelModeSelectChat").forEach((selectNode) => {
    selectNode.onchange = (event) => {
      state.composerDraft.modelMode = event.target.value;
      persist();
    };
  });
  document.querySelectorAll("input[data-upload-kind]").forEach((inputEl) => {
    inputEl.onchange = (event) => handleFileSelection(event.target.files, event.target.dataset.uploadKind);
  });
  const docEditor = document.querySelector("#docEditorInput");
  if (docEditor) {
    docEditor.addEventListener("input", (event) => {
      state.docEditorText = event.target.value;
    });
  }
  syncComposerUi();
}

function handleAction(event) {
  const node = event.currentTarget;
  const action = node.dataset.action;
  if (action === "toggle-sidebar") {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    render();
    return;
  }
  if (action === "toggle-project") {
    const project = getProjectById(node.dataset.projectId);
    if (project) project.expanded = !project.expanded;
    render();
    return;
  }
  if (action === "toggle-menu") {
    const type = node.dataset.menuType;
    const id = node.dataset.menuId;
    state.openMenu = state.openMenu?.type === type && state.openMenu.id === id ? null : { type, id };
    render();
    return;
  }
  if (action === "new-project") {
    createProject();
    return;
  }
  if (action === "new-conversation") {
    openDraftConversation(null);
    return;
  }
  if (action === "create-project-conversation") {
    openDraftConversation(node.dataset.projectId);
    return;
  }
  if (action === "rename-project") {
    renameProject(node.dataset.projectId);
    return;
  }
  if (action === "delete-project") {
    deleteProject(node.dataset.projectId);
    return;
  }
  if (action === "open-library" || action === "open-library-from-composer") {
    state.libraryReturnToConversation = state.mainView === "conversation";
    state.mainView = "library";
    state.openMenu = null;
    state.exportMenuOpen = false;
    render();
    return;
  }
  if (action === "back-from-library") {
    state.mainView = state.libraryReturnToConversation && state.lastConversationId ? "conversation" : "home";
    state.activeConversationId = state.libraryReturnToConversation ? state.lastConversationId : "";
    render();
    return;
  }
  if (action === "shortcut") {
    state.composerDraft.selectedWorkflowId = getWorkflowIdByShortcut(node.dataset.shortcut);
    render();
    return;
  }
  if (action === "open-conversation") {
    openConversation(node.dataset.conversationId);
    return;
  }
  if (action === "send-message") {
    sendCurrentMessage();
    return;
  }
  if (action === "exit-conversation") {
    state.mainView = "home";
    state.activeConversationId = "";
    resetDocumentPanelState();
    render();
    return;
  }
  if (action === "remove-attachment") {
    state.composerDraft.attachments = state.composerDraft.attachments.filter((item) => item.id !== node.dataset.attachmentId);
    render();
    return;
  }
  if (action === "clear-mode") {
    state.composerDraft.selectedWorkflowId = "";
    render();
    return;
  }
  if (action === "voice-input") {
    startVoiceInput();
    return;
  }
  if (action === "open-document") {
    state.documentOpen = true;
    state.activeDocumentId = node.dataset.documentId;
    state.exportMenuOpen = false;
    state.docIsEditing = false;
    state.docEditorText = "";
    render();
    return;
  }
  if (action === "quote-document") {
    quoteDocumentToComposer(node.dataset.documentId);
    render();
    return;
  }
  if (action === "close-document") {
    resetDocumentPanelState();
    render();
    return;
  }
  if (action === "switch-doc-mode") {
    state.docMode = node.dataset.mode;
    state.exportMenuOpen = false;
    render();
    return;
  }
  if (action === "edit-document") {
    startDocumentEditing();
    render();
    return;
  }
  if (action === "save-document") {
    void saveDocumentEdits();
    return;
  }
  if (action === "copy-document") {
    void copyCurrentDocument();
    return;
  }
  if (action === "quote-resource") {
    quoteResourceToComposer(node.dataset.resourceId);
    render();
    return;
  }
  if (action === "quote-history-reference") {
    quoteHistoryReference(node.dataset.referenceType, node.dataset.referenceId);
    return;
  }
  if (action === "delete-resource") {
    const resource = state.resources.find((item) => item.id === node.dataset.resourceId);
    if (!resource) return;
    if (!window.confirm(`确认删除资源「${resource.name}」？`)) return;
    state.resources = state.resources.filter((item) => item.id !== node.dataset.resourceId);
    const removedCount = removeComposerResourceReferences(node.dataset.resourceId);
    showToast(removedCount ? `删除成功，已移除 ${removedCount} 个失效引用` : "删除成功");
    render();
    return;
  }
  if (action === "rename-conversation") {
    renameConversation(node.dataset.conversationId);
    return;
  }
  if (action === "delete-conversation") {
    deleteConversation(node.dataset.conversationId);
    return;
  }
  if (action === "move-conversation") {
    moveConversation(node.dataset.conversationId);
    return;
  }
  if (action === "toggle-export-menu") {
    state.exportMenuOpen = !state.exportMenuOpen;
    render();
    return;
  }
  if (action === "export-document") {
    exportDocument(node.dataset.exportType);
    return;
  }
}

function canSend() {
  return !state.isGenerating && Boolean(state.composerDraft.text.trim() || state.composerDraft.attachments.length);
}

function sendCurrentMessage() {
  if (!canSend()) return;
  let conversation = state.mainView === "conversation" ? getActiveConversation() : null;
  if (!conversation) {
    conversation = createConversation(state.draftProjectId, true);
  }
  if (!conversation.title || conversation.title === "新对话") {
    conversation.title = buildConversationTitle(state.composerDraft.text);
  }
  const text = state.composerDraft.text.trim() || "请结合附件处理";
  const requestAttachments = state.composerDraft.attachments.map((item) => ({ ...item }));
  conversation.messages.push({
    id: createId(),
    role: "user",
    bubble: text,
    references: requestAttachments
      .filter((item) => item.sourceType === "resource" || item.sourceType === "document")
      .map((item) => ({
        referenceType: item.sourceType,
        referenceId: item.sourceType === "resource" ? item.sourceResourceId : item.sourceArtifactId,
        name: item.name,
      })),
  });
  conversation.messages.push({ id: createId(), role: "assistant", streaming: true, content: [] });
  conversation.updatedAt = Date.now();
  state.isGenerating = true;
  const selectedWorkflowId = normalizeWorkflowId(state.composerDraft.selectedWorkflowId);
  conversation.workflowId = selectedWorkflowId;
  conversation.shortcut = getShortcutByWorkflowId(selectedWorkflowId);
  state.composerDraft.text = "";
  state.composerDraft.attachments = [];
  state.mainView = "conversation";
  state.draftProjectId = conversation.projectId;
  render();
  void requestAssistantReply(conversation.id, selectedWorkflowId, text, requestAttachments);
}

async function requestAssistantReply(conversationId, workflowId, text, attachments) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;
  try {
    const targetArtifactId = resolveTargetArtifactForRequest(workflowId, text, attachments);
    const history = conversation.messages
      .filter((item) => !item.streaming)
      .map((item) => ({
        role: item.role,
        content: item.role === "user" ? item.bubble : item.content.join("\n"),
      }));

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: ACTIVE_PROVIDER,
        model: resolveModelForShortcut(getShortcutByWorkflowId(workflowId)),
        workflowId,
        workflowName: getShortcutByWorkflowId(workflowId) || "普通对话",
        branchId: workflowId || "general",
        branchName: getShortcutByWorkflowId(workflowId) || "普通对话",
        conversationId,
        message: text,
        attachments: attachments.map(serializeAttachmentForApi),
        history,
        quotedArtifacts: attachments
          .filter((item) => item.sourceType === "document")
          .map((item) => ({
            artifactId: item.sourceArtifactId,
            title: item.name,
            content: item.payload?.text || "",
            format: item.fileType || "md",
          })),
        quotedResources: attachments
          .filter((item) => item.sourceType === "resource")
          .map((item) => ({
            resourceId: item.sourceResourceId,
            sourceArtifactId: item.sourceArtifactId || "",
            name: item.name,
            content: item.payload?.text || "",
            format: item.fileType || "md",
          })),
        targetArtifactId: targetArtifactId || null,
        artifactEditIntent: targetArtifactId ? "modify" : "none",
        templateConfirmed: isTemplateConfirmationText(text, conversation),
        templateSource: detectTemplateSourceFromDraft(text, attachments),
        modelMode: state.composerDraft.modelMode,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "模型请求失败");
    }
    await finishAssistantReply(conversationId, workflowId, data);
  } catch (error) {
    await finishAssistantReply(conversationId, workflowId, { replyText: `请求失败：${error.message}`, artifacts: [] });
  }
}

async function finishAssistantReply(conversationId, workflowId, responseData) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;
  const target = conversation.messages.find((item) => item.streaming);
  if (!target) return;
  conversation.lastWorkflowStage = responseData.stage || "";
  const replyText = responseData.replyText || responseData.reply || "";
  const backendArtifacts = Array.isArray(responseData.artifacts) ? responseData.artifacts : [];
  const artifacts = backendArtifacts.length
    ? backendArtifacts.map((item) => upsertDocumentEntity(item))
    : responseData.stage === "template_confirm"
      ? []
      : collectFallbackArtifacts(replyText, workflowId, conversation);
  if (artifacts.length) {
    target.content = [`已生成 ${artifacts[0].title}。`, "你可以在下方卡片中查看、引用、编辑或导出。"];
  } else {
    await streamAssistantReply(target, normalizeReplyLines(replyText));
  }
  target.streaming = false;
  target.cards = artifacts.map((item) => ({
    artifactId: item.id,
    title: item.title,
    kind: "document",
  }));
  state.isGenerating = false;
  render();
}

async function streamAssistantReply(message, lines) {
  const fullText = lines.join("\n");
  if (!fullText.trim()) {
    message.content = lines;
    return;
  }
  const chunkSize = fullText.length > 1600 ? 42 : fullText.length > 800 ? 30 : 18;
  for (let index = chunkSize; index <= fullText.length + chunkSize; index += chunkSize) {
    message.content = fullText.slice(0, Math.min(index, fullText.length)).split("\n");
    render();
    if (index < fullText.length) {
      await wait(22);
    }
  }
}

async function exportDocument(exportType) {
  const documentItem = getDocumentById(state.activeDocumentId);
  if (!documentItem) return;
  const conversation = getActiveConversation();
  if (exportType === "resource") {
    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artifactId: documentItem.id,
          conversationId: conversation?.id || null,
          workflowId: documentItem.workflowId || conversation?.workflowId || null,
          name: documentItem.title,
          description: conversation?.title || "未命名对话",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "导出资源失败");
      }
      upsertResourceRecord(data.resource || data);
      state.exportMenuOpen = false;
      window.alert("已导出到资源库。");
    } catch (error) {
      upsertResourceRecord({
        id: createResourceId(),
        sourceArtifactId: documentItem.id,
        name: documentItem.title,
        type: getShortcutByWorkflowId(documentItem.workflowId) || "普通对话",
        workflowId: documentItem.workflowId || null,
        createdAt: documentItem.updatedAt || documentItem.createdAt,
        updatedAt: documentItem.updatedAt || documentItem.createdAt,
        description: conversation?.title || "未命名对话",
        content: documentItem.content,
        format: documentItem.format || "md",
      });
      state.exportMenuOpen = false;
      window.alert("已导出到资源库（本地回退模式）。");
    }
    render();
    return;
  }
  const mimeType = exportType === "pdf"
    ? "application/pdf"
    : exportType === "doc"
      ? "application/msword"
      : documentItem.format === "html"
        ? "text/html;charset=utf-8"
        : "text/markdown;charset=utf-8";
  const blob = new Blob([documentItem.content], { type: mimeType });
  const ext = exportType === "pdf" ? "pdf" : exportType === "doc" ? "doc" : "md";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${documentItem.title}.${ext}`;
  link.click();
  URL.revokeObjectURL(url);
  state.exportMenuOpen = false;
  render();
}

async function handleFileSelection(fileList, kind) {
  const files = Array.from(fileList || []);
  for (const file of files) {
    state.composerDraft.attachments.push(await createAttachment(file, kind));
  }
  render();
}

function quoteResourceToComposer(resourceId) {
  const resource = state.resources.find((item) => item.id === resourceId);
  if (!resource) {
    showToast("该文档已不存在");
    return;
  }
  const isImage = ["png", "jpg", "jpeg", "image/png", "image/jpeg"].includes(resource.format);
  state.composerDraft.attachments.push({
    id: createId(),
    name: resource.name,
    kind: isImage ? "image" : "file",
    sourceType: "resource",
    sourceResourceId: resource.id,
    sourceArtifactId: resource.sourceArtifactId || "",
    fileType: resource.format,
    size: resource.content?.length || 0,
    payload: {
      mode: isImage ? "image" : "text",
      ...(isImage ? { dataUrl: resource.content } : { text: resource.content }),
    },
  });
  state.mainView = state.activeConversationId ? "conversation" : "home";
}


function startVoiceInput() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    window.alert("当前浏览器暂不支持语音输入。");
    return;
  }
  const recognition = new Recognition();
  recognition.lang = "zh-CN";
  recognition.onresult = (event) => {
    const text = Array.from(event.results).map((result) => result[0].transcript).join("");
    state.composerDraft.text = `${state.composerDraft.text}${state.composerDraft.text ? "\n" : ""}${text}`;
    render();
  };
  recognition.start();
}

function createProject() {
  const name = window.prompt("请输入项目名称");
  if (!name?.trim()) return;
  state.projects.unshift({ id: createId(), name: name.trim(), expanded: true, createdAt: Date.now() });
  state.mainView = "home";
  state.openMenu = null;
  render();
}

function createConversation(projectId = null, openConversationView = false) {
  const conversation = {
    id: createId(),
    title: buildConversationTitle(state.composerDraft.text),
    projectId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    workflowId: normalizeWorkflowId(state.composerDraft.selectedWorkflowId),
    shortcut: getShortcutByWorkflowId(state.composerDraft.selectedWorkflowId),
    messages: [],
  };
  state.conversations.unshift(conversation);
  state.activeConversationId = conversation.id;
  state.activeProjectId = projectId;
  state.draftProjectId = projectId;
  state.lastConversationId = conversation.id;
  state.mainView = "conversation";
  resetDocumentPanelState();
  state.openMenu = null;
  if (openConversationView) render();
  return conversation;
}

function openDraftConversation(projectId = null) {
  state.mainView = "conversation";
  state.activeConversationId = "";
  state.activeProjectId = projectId;
  state.draftProjectId = projectId;
  resetDocumentPanelState();
  if (!state.composerDraft.text && !state.composerDraft.attachments.length) {
    state.composerDraft.selectedWorkflowId = "";
  }
  state.openMenu = null;
  render();
}

function syncComposerUi() {
  const sendButton = document.querySelector('[data-action="send-message"]');
  if (!sendButton) return;
  const enabled = canSend();
  sendButton.disabled = !enabled;
  sendButton.classList.toggle("is-active", enabled);
}

function renderFloatingMenu() {
  const prev = document.querySelector("#floatingMenu");
  if (prev) prev.remove();
  if (!state.openMenu) return;
  const trigger = document.querySelector(`[data-action="toggle-menu"][data-menu-id="${state.openMenu.id}"]`);
  if (!trigger) return;
  const menu = document.createElement("div");
  menu.id = "floatingMenu";
  menu.className = "floating-menu-layer";
  menu.innerHTML = state.openMenu.type === "project" ? renderProjectMenu(state.openMenu.id) : renderConversationMenu(state.openMenu.id);
  document.body.appendChild(menu);
  const rect = trigger.getBoundingClientRect();
  const left = Math.min(window.innerWidth - 180, rect.right + 10);
  const top = Math.max(12, rect.top - 4);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.querySelectorAll("[data-action]").forEach((node) => node.onclick = handleAction);
}

function renameProject(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;
  const nextName = window.prompt("请输入新的项目名称", project.name);
  if (!nextName?.trim()) return;
  project.name = nextName.trim();
  state.openMenu = null;
  render();
}

function deleteProject(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;
  if (!window.confirm(`确认删除项目「${project.name}」？该项目下所有对话也会被删除。`)) return;
  const deletedConversationIds = new Set(
    state.conversations.filter((item) => item.projectId === projectId).map((item) => item.id),
  );
  state.projects = state.projects.filter((item) => item.id !== projectId);
  state.conversations = state.conversations.filter((item) => item.projectId !== projectId);
  removeDocumentsByConversationIds(deletedConversationIds);
  if (deletedConversationIds.has(state.lastConversationId)) {
    state.lastConversationId = "";
  }
  if (state.activeProjectId === projectId) {
    state.activeProjectId = null;
    state.activeConversationId = "";
    state.mainView = "home";
  }
  state.openMenu = null;
  render();
}

function renameConversation(conversationId) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;
  const nextName = window.prompt("请输入新的对话名称", conversation.title);
  if (!nextName?.trim()) return;
  conversation.title = nextName.trim();
  state.openMenu = null;
  render();
}

function deleteConversation(conversationId) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;
  if (!window.confirm(`确认删除对话「${conversation.title}」？`)) return;
  state.conversations = state.conversations.filter((item) => item.id !== conversationId);
  removeDocumentsByConversationIds(new Set([conversationId]));
  if (state.lastConversationId === conversationId) {
    state.lastConversationId = "";
  }
  if (state.activeConversationId === conversationId) {
    state.activeConversationId = "";
    state.activeProjectId = null;
    state.mainView = "home";
  }
  state.openMenu = null;
  render();
}

function moveConversation(conversationId) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;
  const projects = state.projects.map((item, index) => `${index + 1}. ${item.name}`).join("\n");
  const value = window.prompt(`请选择目标项目编号：\n0. 无项目对话\n${projects}`, "0");
  if (value === null) return;
  const index = Number(value);
  if (!Number.isInteger(index) || index < 0 || index > state.projects.length) {
    window.alert("编号无效");
    return;
  }
  conversation.projectId = index === 0 ? null : state.projects[index - 1].id;
  conversation.updatedAt = Date.now();
  state.openMenu = null;
  render();
}

function openConversation(conversationId) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;
  state.activeConversationId = conversation.id;
  state.activeProjectId = conversation.projectId;
  state.lastConversationId = conversation.id;
  state.composerDraft.selectedWorkflowId = normalizeWorkflowId(conversation.workflowId || getWorkflowIdByShortcut(conversation.shortcut || ""));
  state.mainView = "conversation";
  resetDocumentPanelState();
  state.openMenu = null;
  render();
}

function getActiveConversation() {
  return getConversationById(state.activeConversationId);
}

function getConversationById(conversationId) {
  return state.conversations.find((item) => item.id === conversationId) || null;
}

function getProjectById(projectId) {
  return state.projects.find((item) => item.id === projectId) || null;
}

function getProjectConversations(projectId) {
  return state.conversations
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function getUngroupedConversations() {
  return state.conversations
    .filter((item) => !item.projectId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function buildConversationTitle(text) {
  const cleaned = (text || "").trim();
  if (!cleaned) return "新对话";
  return cleaned.slice(0, 15);
}

function formatRelative(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return "刚刚";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
}

function createId() {
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

function createResourceId() {
  return `res-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function homeIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4.5 9.5 12 4l7.5 5.5V18A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18z"/><path d="M9.5 19.5v-5h5v5"/></svg>`; }
function chevronIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 6.5 9.5 12 15 17.5"/></svg>`; }
function plusIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 7v10M7 12h10"/></svg>`; }
function chatIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 7.5A1.5 1.5 0 0 1 7.5 6h9A1.5 1.5 0 0 1 18 7.5v6A1.5 1.5 0 0 1 16.5 15h-5.2l-3.3 3v-3H7.5A1.5 1.5 0 0 1 6 13.5z"/><path d="M9.5 10.5h5"/></svg>`; }
function stackIcon() { return `<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="6.5" rx="5.5" ry="2.5"/><path d="M6.5 10.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5M6.5 14.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5"/><path d="M6.5 6.5v8M17.5 6.5v8"/></svg>`; }
function briefcaseIcon() { return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1h3a1 1 0 0 1 1 1v3H4V7a1 1 0 0 1 1-1zm1 0h6V5H9z"/><path d="M4 11h16v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>`; }
function upChevronIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 14.5 12 10.5 16 14.5"/></svg>`; }
function downChevronIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 10.5 12 14.5 16 10.5"/></svg>`; }
function backIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 6 5 12l6 6"/><path d="M5 12h14"/></svg>`; }
function fileIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3H8a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8z"/><path d="M14 3v5h5"/></svg>`; }
function imageIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="5" width="14" height="14" rx="2.5"/><circle cx="10" cy="10" r="1.2"/><path d="m8 16 3.2-3.2a1 1 0 0 1 1.4 0L16 16"/></svg>`; }
function micIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5.5a2 2 0 0 1 2 2v4a2 2 0 0 1-4 0v-4a2 2 0 0 1 2-2Z"/><path d="M8.5 11.5a3.5 3.5 0 0 0 7 0"/><path d="M12 15v3"/><path d="M9.5 18h5"/></svg>`; }
function sendIcon() { return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m3 11 17-8-4 18-4.7-6.4z"/><path d="M20 3 9.3 14.6" fill="none" stroke="#fff" stroke-width="1.4"/></svg>`; }
function downloadIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v9"/><path d="m8.5 10.5 3.5 3.5 3.5-3.5"/><path d="M5 18.5h14"/></svg>`; }
function editIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m4 20 4.5-1 9-9a1.6 1.6 0 0 0-4.5-4.5l-9 9z"/><path d="m12.5 5.5 4.5 4.5"/></svg>`; }
function copyIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="7" width="10" height="12" rx="2"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>`; }
function renderShortcutIcon(icon) {
  const icons = {
    note: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 5.5h6l3 3V18a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 18V7a1.5 1.5 0 0 1 1-1.5z"/><path d="M14 5.5V9h3.5"/><path d="M9.5 12h5M9.5 15h5"/></svg>`,
    doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 4.5h6l3 3V18a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 18V6a1.5 1.5 0 0 1 1-1.5z"/><path d="M14 4.5V8h3"/><path d="M9.5 11.5h5M9.5 14.5h5M9.5 17.5h5"/></svg>`,
    review: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="4.5" width="14" height="15" rx="2.5"/><path d="M8 7.5h8M8 11.5h5M8 15.5h4"/><path d="m15.5 15.2 1.4 1.4 2.6-3"/></svg>`,
    task: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 7h8M10 12h8M10 17h8"/><path d="m5.5 7.5 1.3 1.3 2.2-2.4M5.5 12.5l1.3 1.3 2.2-2.4M5.5 17.5l1.3 1.3 2.2-2.4"/></svg>`,
    flask: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 4.5h4M10 4.5v5.5l-2.7 5a2.5 2.5 0 0 0 2.2 3.7h4.9a2.5 2.5 0 0 0 2.2-3.7L14 10V4.5"/><path d="M9.5 13.5h5"/></svg>`,
    checklist: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9.5 7.5h8M9.5 12h8M9.5 16.5h8"/><path d="m4.8 7.7 1.4 1.4 2.2-2.4M4.8 12.2l1.4 1.4 2.2-2.4M4.8 16.7l1.4 1.4 2.2-2.4"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 7v5h-5"/><path d="M5 17v-5h5"/><path d="M7.5 9A6 6 0 0 1 17 7M16.5 15A6 6 0 0 1 7 17"/></svg>`,
    chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 18.5h14"/><path d="M7 16V10M12 16V6.5M17 16v-3.5"/><path d="m7 8 5-3 5 4"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="5.5"/><path d="m15.2 15.2 3.3 3.3"/><path d="M11 8.5v5M8.5 11H13.5"/></svg>`,
    presentation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="5" width="14" height="10" rx="1.8"/><path d="M12 15v4"/><path d="M9 19h6"/><path d="M8.5 8.5h7M8.5 11.5h4.5"/></svg>`,
    prototype: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4.5" y="5" width="15" height="14" rx="2.5"/><path d="M8 5v14M4.5 9.5h15"/><path d="M11.5 13h4M11.5 16h2.8"/></svg>`,
  };
  return icons[icon] || icons.note;
}

function renderModelModeOptions() {
  const options = [
    { value: "auto", label: "自动" },
    { value: "fast", label: "快速" },
    { value: "quality", label: "高质量" },
  ];
  return options
    .map((item) => `<option value="${item.value}" ${state.composerDraft.modelMode === item.value ? "selected" : ""}>${item.label}</option>`)
    .join("");
}

function resolveModelForShortcut(shortcutName) {
  if (state.composerDraft.modelMode === "fast") {
    return "gpt-5.4";
  }
  if (state.composerDraft.modelMode === "quality") {
    return "gpt-5.2";
  }
  const qualityFirstShortcuts = new Set([
    "生成PRD",
    "需求评审",
    "生成原型图",
    "生成测试用例",
    "测试用例评审",
    "产品更新说明",
    "产品竞品分析",
    "产品调研报告",
    "产品介绍 PPT",
  ]);
  return qualityFirstShortcuts.has(shortcutName) ? "gpt-5.2" : "gpt-5.4";
}

function getWorkflowIdByShortcut(shortcutName) {
  const map = {
    "需求澄清": "requirement",
    "生成PRD": "prd",
    "需求评审": "prdReview",
    "生成原型图": "prototype",
    "任务拆解": "story",
    "生成测试用例": "testCase",
    "测试用例评审": "testReview",
    "产品更新说明": "releaseNote",
    "产品竞品分析": "competitorAnalysis",
    "产品调研报告": "productResearch",
    "产品介绍 PPT": "productPresentation",
  };
  return map[shortcutName] || "";
}

function getShortcutByWorkflowId(workflowId) {
  const map = {
    requirement: "需求澄清",
    prd: "生成PRD",
    prdReview: "需求评审",
    prototype: "生成原型图",
    story: "任务拆解",
    testCase: "生成测试用例",
    testReview: "测试用例评审",
    releaseNote: "产品更新说明",
    competitorAnalysis: "产品竞品分析",
    productResearch: "产品调研报告",
    productPresentation: "产品介绍 PPT",
  };
  return map[workflowId] || "";
}

function normalizeWorkflowId(workflowId) {
  if (!workflowId) return "";
  if (getShortcutByWorkflowId(workflowId)) return workflowId;
  return getWorkflowIdByShortcut(workflowId) || "";
}

async function createAttachment(file, kind) {
  const base = {
    id: createId(),
    name: file.name,
    kind,
    fileType: file.type || "",
    size: file.size || 0,
  };
  if (kind === "image") {
    return {
      ...base,
      payload: {
        mode: "image",
        dataUrl: await readFileAsDataUrl(file),
      },
    };
  }
  if (file.type === "application/pdf") {
    return {
      ...base,
      payload: {
        mode: "pdf",
        dataUrl: await readFileAsDataUrl(file),
      },
    };
  }
  return {
    ...base,
    payload: {
      mode: "text",
      text: await readFileAsText(file),
    },
  };
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function serializeAttachmentForApi(attachment) {
  return {
    id: attachment.id,
    kind: attachment.kind === "image" ? "图片" : "文件",
    name: attachment.name,
    size: attachment.size || 0,
    type: attachment.fileType || "",
    meta: `${attachment.kind} · ${attachment.size || 0}B`,
    payload: attachment.payload,
    sourceType: attachment.sourceType || "",
    sourceArtifactId: attachment.sourceArtifactId || "",
    sourceResourceId: attachment.sourceResourceId || "",
  };
}

function extractArtifactFromReply(replyText, shortcutName, conversation) {
  const normalized = String(replyText || "").trim() || "模型返回了空结果。";
  const shouldCreateCard = normalized.length > 600 || /^#|\n#|```|^\|/m.test(normalized);
  if (!shouldCreateCard) {
    return [];
  }
  return [upsertDocumentEntity({
    id: createId(),
    conversationId: conversation.id,
    sourceMessageId: conversation.messages.findLast((item) => item.role === "assistant")?.id || "",
    workflowId: normalizeWorkflowId(conversation.workflowId),
    title: inferDocumentTitle(shortcutName, conversation.title),
    format: /<!DOCTYPE html>|<html[\s>]/i.test(normalized) ? "html" : normalized.includes("{") && normalized.includes("}") ? "json" : "md",
    content: normalized,
    createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
  })];
}


function inferDocumentTitle(shortcutName, conversationTitle) {
  const suffixMap = {
    "需求澄清": "需求澄清说明",
    "生成PRD": "PRD 文档",
    "需求评审": "需求评审结果",
    "生成原型图": "原型 HTML",
    "任务拆解": "任务拆解文档",
    "生成测试用例": "测试用例表",
    "测试用例评审": "测试用例评审结果",
    "产品更新说明": "产品更新说明",
    "产品竞品分析": "竞品分析报告",
    "产品调研报告": "产品调研报告",
    "产品介绍 PPT": "产品介绍内容",
  };
  return `${conversationTitle || "未命名对话"}-${suffixMap[shortcutName] || "文档"}`;
}

function normalizeReplyLines(replyText) {
  const normalized = String(replyText || "").trim() || "模型返回了空结果。";
  return normalized.split("\n");
}

function collectFallbackArtifacts(replyText, workflowId, conversation) {
  const shortcutName = getShortcutByWorkflowId(workflowId);
  return extractArtifactFromReply(replyText, shortcutName, conversation);
}

function normalizeDocuments(source) {
  return Object.fromEntries(
    Object.entries(source || {}).map(([id, documentItem]) => {
      const content = documentItem.content || documentItem.code || "";
      const createdAt = documentItem.createdAt || new Date().toLocaleString("zh-CN", { hour12: false });
      return [id, {
        id,
        conversationId: documentItem.conversationId || "",
        sourceMessageId: documentItem.sourceMessageId || "",
        workflowId: normalizeWorkflowId(documentItem.workflowId || ""),
        title: documentItem.title || "未命名文档",
        format: documentItem.format || "md",
        content,
        preview: Array.isArray(documentItem.preview) && documentItem.preview.length
          ? documentItem.preview
          : buildDocumentPreview(content, documentItem.title || "未命名文档", createdAt),
        createdAt,
        updatedAt: documentItem.updatedAt || createdAt,
        version: Number(documentItem.version || 1),
        isEdited: Boolean(documentItem.isEdited),
      }];
    }),
  );
}

function buildDocumentPreview(content, title, createdAt) {
  const lines = String(content || "").split("\n").filter(Boolean);
  const normalizedTitle = extractDocumentTitle(content, title);
  if (!lines.length) {
    return [
      { type: "h2", text: normalizedTitle },
      { type: "meta", text: createdAt || "" },
      { type: "p", text: "暂无内容" },
    ];
  }
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
  return preview;
}

function extractDocumentTitle(content, fallbackTitle = "未命名文档") {
  const firstHeading = String(content || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^#\s+/.test(line));
  return firstHeading ? firstHeading.replace(/^#\s+/, "").trim() : (fallbackTitle || "未命名文档");
}

function getDocumentById(documentId) {
  return state.documents[documentId] || null;
}

function upsertDocumentEntity(documentInput) {
  const current = state.documents[documentInput.id] || null;
  const nextContent = documentInput.content || current?.content || "";
  const nextTitle = extractDocumentTitle(nextContent, documentInput.title || current?.title || "未命名文档");
  const next = {
    id: documentInput.id || createId(),
    conversationId: documentInput.conversationId || current?.conversationId || state.activeConversationId || "",
    sourceMessageId: documentInput.sourceMessageId || current?.sourceMessageId || "",
    workflowId: normalizeWorkflowId(documentInput.workflowId || current?.workflowId || ""),
    title: nextTitle,
    format: documentInput.format || current?.format || "md",
    content: nextContent,
    createdAt: documentInput.createdAt || current?.createdAt || new Date().toLocaleString("zh-CN", { hour12: false }),
    updatedAt: documentInput.updatedAt || new Date().toLocaleString("zh-CN", { hour12: false }),
    version: Number(documentInput.version || (current?.version || 0) + 1),
    isEdited: Boolean(documentInput.isEdited || current?.isEdited),
  };
  next.preview = Array.isArray(documentInput.preview) && documentInput.preview.length
    ? documentInput.preview
    : buildDocumentPreview(next.content, next.title, next.createdAt);
  state.documents[next.id] = next;
  return next;
}

function upsertResourceRecord(resource) {
  const next = {
    id: resource.id || createResourceId(),
    sourceArtifactId: resource.sourceArtifactId || resource.artifactId || "",
    name: resource.name || "未命名资源",
    type: resource.type || getShortcutByWorkflowId(resource.workflowId) || "普通对话",
    workflowId: normalizeWorkflowId(resource.workflowId || ""),
    format: resource.format || "md",
    content: resource.content || "",
    description: resource.description || "未命名对话",
    createdAt: resource.createdAt || new Date().toLocaleString("zh-CN", { hour12: false }),
    updatedAt: resource.updatedAt || resource.createdAt || new Date().toLocaleString("zh-CN", { hour12: false }),
  };
  const index = state.resources.findIndex((item) => item.id === next.id);
  if (index >= 0) {
    state.resources.splice(index, 1, next);
  } else {
    state.resources.unshift(next);
  }
  return next;
}

function resetDocumentPanelState() {
  state.documentOpen = false;
  state.activeDocumentId = "";
  state.exportMenuOpen = false;
  state.docIsEditing = false;
  state.docEditorText = "";
}

function syncDocumentPanelState() {
  if (!state.documentOpen) return;
  if (state.mainView !== "conversation") {
    resetDocumentPanelState();
    return;
  }
  const conversation = getActiveConversation();
  const documentItem = getDocumentById(state.activeDocumentId);
  if (!conversation || !documentItem || documentItem.conversationId !== conversation.id) {
    resetDocumentPanelState();
  }
}

function removeDocumentsByConversationIds(conversationIds) {
  if (!conversationIds?.size) return;
  const activeDocument = getDocumentById(state.activeDocumentId);
  if (activeDocument && conversationIds.has(activeDocument.conversationId)) {
    resetDocumentPanelState();
  }
  state.documents = Object.fromEntries(
    Object.entries(state.documents).filter(([, item]) => !conversationIds.has(item.conversationId)),
  );
}

function quoteDocumentToComposer(documentId) {
  const documentItem = getDocumentById(documentId);
  if (!documentItem) {
    showToast("该文档已不存在");
    return;
  }
  state.composerDraft.attachments = state.composerDraft.attachments.filter((item) => item.sourceArtifactId !== documentId);
  state.composerDraft.attachments.push({
    id: createId(),
    name: documentItem.title,
    kind: "file",
    sourceType: "document",
    sourceArtifactId: documentItem.id,
    fileType: documentItem.format,
    size: documentItem.content.length,
    payload: {
      mode: "text",
      text: documentItem.content,
    },
  });
}

function startDocumentEditing() {
  const documentItem = getDocumentById(state.activeDocumentId);
  if (!documentItem) return;
  state.docIsEditing = true;
  state.docEditorText = documentItem.content;
}

async function saveDocumentEdits() {
  const documentItem = getDocumentById(state.activeDocumentId);
  if (!documentItem) return;
  const content = state.docEditorText;
  let nextDocument;
  try {
    const nextTitle = extractDocumentTitle(content, documentItem.title);
    const response = await fetch(`/api/artifacts/${documentItem.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: nextTitle,
        format: documentItem.format,
        content,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "保存文档失败");
    }
    nextDocument = upsertDocumentEntity({
      ...(data.artifact || data),
      isEdited: true,
    });
  } catch (error) {
    nextDocument = upsertDocumentEntity({
      ...documentItem,
      content,
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      version: (documentItem.version || 1) + 1,
      isEdited: true,
    });
  }
  if (nextDocument) {
    state.activeDocumentId = nextDocument.id;
  }
  state.docIsEditing = false;
  state.docEditorText = "";
  state.docMode = "preview";
  showToast("保存成功");
  render();
}

async function copyCurrentDocument() {
  const documentItem = getDocumentById(state.activeDocumentId);
  if (!documentItem) return;
  const copyText = state.docIsEditing
    ? state.docEditorText
    : state.docMode === "preview"
      ? documentItem.format === "html"
        ? documentItem.content
        : getDocumentPreviewText(documentItem)
      : documentItem.content;
  if (!navigator.clipboard?.writeText) {
    window.alert("当前浏览器暂不支持复制。");
    return;
  }
  await navigator.clipboard.writeText(copyText);
  showToast("已复制内容");
}

function quoteHistoryReference(referenceType, referenceId) {
  if (referenceType === "resource") {
    const exists = state.resources.some((item) => item.id === referenceId);
    if (!exists) {
      showToast("该文档已不存在");
      return;
    }
    quoteResourceToComposer(referenceId);
    render();
    return;
  }

  if (referenceType === "document") {
    const exists = Boolean(getDocumentById(referenceId));
    if (!exists) {
      showToast("该文档已不存在");
      return;
    }
    quoteDocumentToComposer(referenceId);
    render();
  }
}

function isReferenceMissing(reference) {
  if (reference.referenceType === "resource") {
    return !state.resources.some((item) => item.id === reference.referenceId);
  }
  if (reference.referenceType === "document") {
    return !getDocumentById(reference.referenceId);
  }
  return false;
}

function removeComposerResourceReferences(resourceId) {
  const before = state.composerDraft.attachments.length;
  state.composerDraft.attachments = state.composerDraft.attachments.filter((item) => item.sourceResourceId !== resourceId);
  return before - state.composerDraft.attachments.length;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isTemplateConfirmationText(text, conversation) {
  if (conversation?.lastWorkflowStage !== "template_confirm") return false;
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  return /确认|按这个|按此|照这个|照此|用这个|用此|继续生成|开始生成|生成吧|就按|没问题|可以|OK|ok/i.test(normalized);
}

function detectTemplateSourceFromDraft(text, attachments) {
  const normalizedText = String(text || "");
  if (attachments.some((item) => !item.sourceType && /(模板|template|大纲)/i.test(item.name || ""))) {
    return "uploaded_template";
  }
  if (attachments.some((item) => ["document", "resource"].includes(item.sourceType) && /(模板|template|大纲)/i.test(item.name || ""))) {
    return "quoted_template";
  }
  if (/模板|按以下结构|按这个结构|以下大纲|以下模板/i.test(normalizedText)) {
    return "user_defined_template";
  }
  return "system_default_template";
}

function isRevisionIntentText(text) {
  return /修改|改成|改为|调整|补充|完善|修订|优化|更新|在原文基础上|基于.*修改/i.test(String(text || ""));
}

function resolveTargetArtifactForRequest(workflowId, text, attachments) {
  if (!workflowId || !isRevisionIntentText(text)) return "";
  const quotedDocument = attachments.find((item) => {
    if (item.sourceType !== "document" || !item.sourceArtifactId) return false;
    const documentItem = getDocumentById(item.sourceArtifactId);
    return documentItem?.workflowId === workflowId;
  });
  if (quotedDocument?.sourceArtifactId) {
    return quotedDocument.sourceArtifactId;
  }
  const quotedResource = attachments.find((item) => {
    if (item.sourceType !== "resource" || !item.sourceArtifactId) return false;
    const resource = state.resources.find((record) => record.id === item.sourceResourceId);
    return resource?.workflowId === workflowId;
  });
  return quotedResource?.sourceArtifactId || "";
}

function showToast(message) {
  const existing = document.querySelector("#toastMessage");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "toastMessage";
  toast.className = "toast-message";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 180);
  }, 1800);
}
