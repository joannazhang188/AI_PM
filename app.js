const STORAGE_KEY = "pm-workbench-ui-replica-v2";

const shortcuts = [
  { name: "需求澄清", theme: "sky-lime", icon: "note" },
  { name: "生成PRD", theme: "ice-mint", icon: "doc" },
  { name: "需求评审", theme: "sky-amber", icon: "review" },
  { name: "任务拆解", theme: "blue-green", icon: "task" },
  { name: "生成测试用例", theme: "mint-yellow", icon: "flask" },
  { name: "测试用例评审", theme: "teal-lime", icon: "checklist" },
  { name: "产品更新说明", theme: "cyan-grass", icon: "refresh" },
  { name: "产品竞品分析", theme: "blue-leaf", icon: "chart" },
  { name: "产品调研报告", theme: "ocean-lime", icon: "search" },
  { name: "产品介绍 PPT", theme: "aqua-sun", icon: "presentation" },
];

const documents = {
  doc_prd_preview: {
    id: "doc_prd_preview",
    title: "文档标题",
    createdAt: "文档生成时间",
    format: "md",
    preview: [
      { type: "h2", text: "文档标题" },
      { type: "meta", text: "文档生成时间" },
      { type: "h3", text: "文档正文标题" },
      ...Array.from({ length: 8 }, () => ({ type: "p", text: "这是一段文档内容" })),
      { type: "h3", text: "md 文档" },
      ...Array.from({ length: 18 }, () => ({ type: "p", text: "这是一段文档内容" })),
    ],
    code: `# 文档标题\n\n## 文档正文标题\n\n这是一段文档内容\n这是一段文档内容\n这是一段文档内容`,
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
  composerText: "",
  composerMode: "",
  modelMode: "auto",
  draftProjectId: null,
  attachments: [],
  isGenerating: false,
  openMenu: null,
  exportMenuOpen: false,
  resources: [],
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
          cards: [{ id: "doc_prd_preview", title: "PRD 精简版文档卡片" }],
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
  const documentIds = Object.keys(documents);
  merged.mainView = ["home", "library", "conversation"].includes(merged.mainView) ? merged.mainView : "home";
  merged.docMode = ["preview", "code"].includes(merged.docMode) ? merged.docMode : "preview";
  merged.attachments = Array.isArray(merged.attachments) ? merged.attachments : [];
  merged.resources = Array.isArray(merged.resources) ? merged.resources : [];
  merged.projects = Array.isArray(merged.projects) ? merged.projects : structuredClone(defaultState.projects);
  merged.conversations = Array.isArray(merged.conversations) ? merged.conversations : structuredClone(defaultState.conversations);
  merged.composerText = typeof merged.composerText === "string" ? merged.composerText : "";
  merged.composerMode = typeof merged.composerMode === "string" ? merged.composerMode : "";
  merged.modelMode = ["auto", "fast", "quality"].includes(merged.modelMode) ? merged.modelMode : "auto";
  merged.activeConversationId = merged.conversations.some((item) => item?.id === merged.activeConversationId) ? merged.activeConversationId : "";
  merged.lastConversationId = merged.conversations.some((item) => item?.id === merged.lastConversationId) ? merged.lastConversationId : "";
  merged.activeProjectId = merged.projects.some((item) => item?.id === merged.activeProjectId) ? merged.activeProjectId : null;
  merged.draftProjectId = merged.projects.some((item) => item?.id === merged.draftProjectId) ? merged.draftProjectId : null;
  merged.activeDocumentId = documentIds.includes(merged.activeDocumentId) ? merged.activeDocumentId : defaultState.activeDocumentId;
  merged.documentOpen = Boolean(merged.documentOpen && documentIds.includes(merged.activeDocumentId));
  return merged;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
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
  const draftTitle = state.composerText.trim() ? buildConversationTitle(state.composerText) : "新对话";
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
      return `<div class="bubble-row bubble-row--user"><div class="bubble-user">${escapeHtml(message.bubble)}</div></div>`;
    }
    if (message.streaming) {
      return `<div class="bubble-row"><div class="assistant-block"><div class="streaming-indicator"><span></span><span></span><span></span></div></div></div>`;
    }
    return `
      <div class="bubble-row">
        <div class="assistant-block">
          ${message.content.map((line) => {
            if (!line) return "<div style='height:12px'></div>";
            const normalized = escapeHtml(line).replace("/Users/mac/AI 项目/项目/werewolf-miniapp", "<span class='inline-code'>/Users/mac/AI 项目/项目/werewolf-miniapp</span>");
            return `<div>${normalized}</div>`;
          }).join("")}
          ${message.cards?.length ? `<div class="document-card-list">${message.cards.map((card) => `
            <div class="document-card">
              <span class="document-card__title">${card.title}</span>
              <button class="doc-quote" data-action="open-document" data-document-id="${card.id}">引用</button>
            </div>`).join("")}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function renderDocumentPanel() {
  const documentItem = documents[state.activeDocumentId];
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
          <button class="icon-button">${editIcon()}</button>
          <button class="icon-button">${copyIcon()}</button>
        </div>
      </div>
      <div class="doc-content">${state.docMode === "code" ? `<div class="doc-code">${escapeHtml(documentItem.code)}</div>` : renderDocPreview(documentItem)}</div>
    </aside>
  `;
}

function renderDocPreview(documentItem) {
  return documentItem.preview.map((block) => {
    if (block.type === "h2") return `<h2>${block.text}</h2>`;
    if (block.type === "meta") return `<div class="doc-meta">${block.text}</div>`;
    if (block.type === "h3") return `<h3>${block.text}</h3>`;
    return `<p>${block.text}</p>`;
  }).join("");
}

function renderComposer(withSelect) {
  const hasFile = state.attachments.some((item) => item.kind === "file");
  const hasImage = state.attachments.some((item) => item.kind === "image");
  const sendEnabled = canSend();
  return `
    <div class="composer-card">
      <div class="composer-inner">
        ${(state.attachments.length || state.composerMode) ? `<div class="attachment-strip">
          ${state.composerMode ? `<span class="attachment-chip attachment-chip--mode">${renderShortcutIcon((shortcuts.find((item) => item.name === state.composerMode) || shortcuts[0]).icon)}${escapeHtml(state.composerMode)}<button data-action="clear-mode">×</button></span>` : ""}
          ${state.attachments.map((item) => `<span class="attachment-chip">${escapeHtml(item.name)}<button data-action="remove-attachment" data-attachment-id="${item.id}">×</button></span>`).join("")}
        </div>` : ""}
        <textarea id="composerInput" class="composer-textarea" placeholder="直接输入您的问题，支持上传图片/文件辅助说明">${escapeHtml(state.composerText)}</textarea>
        <div class="composer-footer">
          <div class="tool-row">
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
                ${shortcuts.map((item) => `<option value="${item.name}" ${state.composerMode === item.name ? "selected" : ""}>${item.name}</option>`).join("")}
              </select>
              <select id="modelModeSelectChat" class="tool-select tool-select--model">
                ${renderModelModeOptions()}
              </select>` : ""}
          </div>
          <div class="send-row">
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
      state.composerText = event.target.value;
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
      state.composerMode = event.target.value;
      persist();
    };
  }
  document.querySelectorAll("#modelModeSelectHome, #modelModeSelectChat").forEach((selectNode) => {
    selectNode.onchange = (event) => {
      state.modelMode = event.target.value;
      persist();
    };
  });
  document.querySelectorAll("input[data-upload-kind]").forEach((inputEl) => {
    inputEl.onchange = (event) => handleFileSelection(event.target.files, event.target.dataset.uploadKind);
  });
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
    state.composerMode = node.dataset.shortcut;
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
    state.documentOpen = false;
    render();
    return;
  }
  if (action === "remove-attachment") {
    state.attachments = state.attachments.filter((item) => item.id !== node.dataset.attachmentId);
    render();
    return;
  }
  if (action === "clear-mode") {
    state.composerMode = "";
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
    render();
    return;
  }
  if (action === "close-document") {
    state.documentOpen = false;
    state.exportMenuOpen = false;
    render();
    return;
  }
  if (action === "switch-doc-mode") {
    state.docMode = node.dataset.mode;
    state.exportMenuOpen = false;
    render();
    return;
  }
  if (action === "quote-resource") {
    quoteResourceToComposer(node.dataset.resourceId);
    render();
    return;
  }
  if (action === "delete-resource") {
    state.resources = state.resources.filter((item) => item.id !== node.dataset.resourceId);
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
  return !state.isGenerating && Boolean(state.composerText.trim() || state.attachments.length);
}

function sendCurrentMessage() {
  if (!canSend()) return;
  let conversation = getActiveConversation();
  if (!conversation) {
    conversation = createConversation(state.draftProjectId, true);
  }
  if (!conversation.title || conversation.title === "新对话") {
    conversation.title = buildConversationTitle(state.composerText);
  }
  const text = state.composerText.trim() || "请结合附件处理";
  const requestAttachments = [...state.attachments];
  conversation.messages.push({ id: createId(), role: "user", bubble: text });
  conversation.messages.push({ id: createId(), role: "assistant", streaming: true, content: [] });
  conversation.updatedAt = Date.now();
  state.isGenerating = true;
  const selectedShortcut = state.composerMode || conversation.shortcut || "需求评审";
  conversation.shortcut = selectedShortcut;
  state.composerText = "";
  state.attachments = [];
  state.mainView = "conversation";
  state.draftProjectId = conversation.projectId;
  render();
  void requestAssistantReply(conversation.id, selectedShortcut, text, requestAttachments);
}

async function requestAssistantReply(conversationId, shortcutName, text, attachments) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;
  try {
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
        model: resolveModelForShortcut(shortcutName),
        branchId: getBranchIdByShortcut(shortcutName),
        branchName: shortcutName || "普通对话",
        message: text,
        attachments: attachments.map(serializeAttachmentForApi),
        history,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "模型请求失败");
    }
    finishAssistantReply(conversationId, shortcutName, data.reply);
  } catch (error) {
    finishAssistantReply(conversationId, shortcutName, `请求失败：${error.message}`);
  }
}

function finishAssistantReply(conversationId, shortcutName, replyText) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;
  const target = conversation.messages.find((item) => item.streaming);
  if (!target) return;
  target.streaming = false;
  const artifact = extractArtifactFromReply(replyText, shortcutName, conversation.title);
  target.content = artifact.summaryLines;
  target.cards = artifact.card ? [artifact.card] : [];
  state.isGenerating = false;
  render();
}

function exportDocument(exportType) {
  const documentItem = documents[state.activeDocumentId];
  if (!documentItem) return;
  const conversation = getActiveConversation();
  if (exportType === "resource") {
    state.resources.unshift({
      id: createResourceId(),
      name: documentItem.title,
      type: conversation?.shortcut || state.composerMode || "普通对话",
      createdAt: documentItem.createdAt,
      description: conversation?.title || "未命名对话",
      content: state.docMode === "code" ? documentItem.code : JSON.stringify(documentItem.preview),
      format: state.docMode === "code" ? (documentItem.format || "md") : "json",
      sourceDocumentId: documentItem.id,
    });
    state.exportMenuOpen = false;
    window.alert("已导出到资源库。后端接入后可在这里改为持久化保存。");
    render();
    return;
  }
  const blob = new Blob([state.docMode === "code" ? documentItem.code : documentItem.preview.map((item) => item.text).join("\n")], { type: "text/plain;charset=utf-8" });
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
    state.attachments.push(await createAttachment(file, kind));
  }
  render();
}

function quoteResourceToComposer(resourceId) {
  const resource = state.resources.find((item) => item.id === resourceId);
  if (!resource) return;
  const isImage = ["png", "jpg", "jpeg", "image/png", "image/jpeg"].includes(resource.format);
  state.attachments.push({
    id: createId(),
    name: `${resource.name}.${resource.format}`,
    kind: isImage ? "image" : "file",
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
    state.composerText = `${state.composerText}${state.composerText ? "\n" : ""}${text}`;
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
    title: buildConversationTitle(state.composerText),
    projectId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    shortcut: state.composerMode,
    messages: [],
  };
  state.conversations.unshift(conversation);
  state.activeConversationId = conversation.id;
  state.activeProjectId = projectId;
  state.draftProjectId = projectId;
  state.lastConversationId = conversation.id;
  state.mainView = "conversation";
  state.openMenu = null;
  if (openConversationView) render();
  return conversation;
}

function openDraftConversation(projectId = null) {
  state.mainView = "conversation";
  state.activeConversationId = "";
  state.activeProjectId = projectId;
  state.draftProjectId = projectId;
  state.documentOpen = false;
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
  state.projects = state.projects.filter((item) => item.id !== projectId);
  state.conversations = state.conversations.filter((item) => item.projectId !== projectId);
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
  state.mainView = "conversation";
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
    .map((item) => `<option value="${item.value}" ${state.modelMode === item.value ? "selected" : ""}>${item.label}</option>`)
    .join("");
}

function resolveModelForShortcut(shortcutName) {
  if (state.modelMode === "fast") {
    return "gpt-4.1-mini";
  }
  if (state.modelMode === "quality") {
    return "gpt-5.2";
  }
  const qualityFirstShortcuts = new Set([
    "生成PRD",
    "需求评审",
    "生成测试用例",
    "测试用例评审",
    "产品更新说明",
    "产品竞品分析",
    "产品调研报告",
    "产品介绍 PPT",
  ]);
  return qualityFirstShortcuts.has(shortcutName) ? "gpt-5.2" : "gpt-4.1-mini";
}

function getBranchIdByShortcut(shortcutName) {
  const map = {
    "需求澄清": "requirement",
    "生成PRD": "prd",
    "需求评审": "prdReview",
    "任务拆解": "story",
    "生成测试用例": "testCase",
    "测试用例评审": "testReview",
    "产品更新说明": "releaseNote",
    "产品竞品分析": "competitorAnalysis",
    "产品调研报告": "productResearch",
    "产品介绍 PPT": "productResearch",
  };
  return map[shortcutName] || "general";
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
  };
}

function extractArtifactFromReply(replyText, shortcutName, conversationTitle) {
  const normalized = String(replyText || "").trim() || "模型返回了空结果。";
  const shouldCreateCard = normalized.length > 600 || /^#|\n#|```|^\|/m.test(normalized);
  if (!shouldCreateCard) {
    return { summaryLines: normalized.split("\n"), card: null };
  }
  const documentId = createId();
  const title = inferDocumentTitle(shortcutName, conversationTitle);
  documents[documentId] = {
    id: documentId,
    title,
    createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    format: normalized.includes("{") && normalized.includes("}") ? "json" : "md",
    preview: normalized.split("\n").filter(Boolean).map((line, index) => {
      if (index === 0) return { type: "h2", text: title };
      if (line.startsWith("## ")) return { type: "h3", text: line.replace(/^## /, "") };
      return { type: "p", text: line.replace(/^# /, "") };
    }),
    code: normalized,
  };
  return {
    summaryLines: [`已生成 ${title}。`, "你可以在下方卡片中查看、引用或导出。"],
    card: { id: documentId, title },
  };
}


function inferDocumentTitle(shortcutName, conversationTitle) {
  const suffixMap = {
    "需求澄清": "需求澄清说明",
    "生成PRD": "PRD 文档",
    "需求评审": "需求评审结果",
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
