const state = {
  userAvatar: "https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png",
  shortcutAbilities: [
    { id: 1, name: "需求澄清", desc: "输入您模糊的需求，AI协助您输出完善的需求说明", type: "purple", placeholder: "请输入模糊的需求描述，我会帮您完善为清晰的需求说明…" },
    { id: 2, name: "生成PRD", desc: "基于需求说明生成PRD文档", type: "purple", placeholder: "请粘贴需求说明，我会帮您生成完整的PRD文档…" },
    { id: 3, name: "需求评审", desc: "从产品、业务、技术角度对需求文档进行评审", type: "orange", placeholder: "请粘贴PRD文档内容，我会从多维度为您评审…" },
    { id: 4, name: "拆解 Story", desc: "将 PRD 拆解为可执行的用户故事", type: "green", placeholder: "请粘贴PRD文档内容，我会帮您拆解为用户故事…" },
    { id: 5, name: "生成测试用例", desc: "基于 story 生成完整的测试用例", type: "orange-bg", placeholder: "请粘贴用户故事内容，我会帮您生成完整的测试用例…" },
    { id: 6, name: "测试用例评审", desc: "从 PRD 角度评审测试用例是否完善", type: "green", placeholder: "请粘贴测试用例内容，我会基于PRD评审完善性…" },
    { id: 7, name: "竞品分析报告", desc: "基于需求说明，查阅竞品信息生成报告", type: "blue", placeholder: "请输入需求说明，我会帮您生成竞品分析报告…" },
    { id: 8, name: "产品调研报告", desc: "基于需求说明，市面调研相关产品生成报告", type: "green-bg", placeholder: "请输入需求说明，我会帮您生成产品调研报告…" },
    { id: 9, name: "产品功能更新说明书", desc: "基于 PRD 生成本次产品的功能更新说明文档", type: "purple-bg", placeholder: "请粘贴PRD文档内容，我会帮您生成功能更新说明书…" },
  ],
  projectList: [
    { id: "proj_1", name: "电商平台V2.0", desc: "电商平台二期迭代", pinned: false, chats: [] },
    { id: "proj_2", name: "用户中心重构", desc: "用户中心模块重构项目", pinned: false, chats: [] },
  ],
  uncategorizedChats: [],
  currentChatId: "",
  currentChatTitle: "",
  currentChatMessages: [],
  inputContent: "",
  emptyInputContent: "",
  activeAbility: null,
  uploadedFiles: [],
  emptyUploadedFiles: [],
  currentRenameItem: null,
  movingChatId: "",
};

const els = {
  sidebarTree: document.querySelector("#sidebarTree"),
  emptyChat: document.querySelector("#emptyChat"),
  chatContainer: document.querySelector("#chatContainer"),
  shortcutAbilities: document.querySelector("#shortcutAbilities"),
  createNewChatBtn: document.querySelector("#createNewChatBtn"),
  createNewProjectBtn: document.querySelector("#createNewProjectBtn"),
  userMenuButton: document.querySelector("#userMenuButton"),
  emptyInputContent: document.querySelector("#emptyInputContent"),
  inputContent: document.querySelector("#inputContent"),
  emptyUploadPreview: document.querySelector("#emptyUploadPreview"),
  uploadPreview: document.querySelector("#uploadPreview"),
  emptyImageInput: document.querySelector("#emptyImageInput"),
  emptyFileInput: document.querySelector("#emptyFileInput"),
  imageInput: document.querySelector("#imageInput"),
  fileInput: document.querySelector("#fileInput"),
  sendEmptyChatBtn: document.querySelector("#sendEmptyChatBtn"),
  sendMessageBtn: document.querySelector("#sendMessageBtn"),
  currentChatTitle: document.querySelector("#currentChatTitle"),
  messageList: document.querySelector("#messageList"),
  activeAbilityTag: document.querySelector("#activeAbilityTag"),
  activeAbilityName: document.querySelector("#activeAbilityName"),
  closeAbilityBtn: document.querySelector("#closeAbilityBtn"),
  exitCurrentChatBtn: document.querySelector("#exitCurrentChatBtn"),
  libraryBtnEmpty: document.querySelector("#libraryBtnEmpty"),
  libraryBtnChat: document.querySelector("#libraryBtnChat"),
  chatActionBtn: document.querySelector("#chatActionBtn"),
  itemMenu: document.querySelector("#itemMenu"),
  modalOverlay: document.querySelector("#modalOverlay"),
  projectModal: document.querySelector("#projectModal"),
  projectNameInput: document.querySelector("#projectNameInput"),
  projectDescInput: document.querySelector("#projectDescInput"),
  projectModalCancel: document.querySelector("#projectModalCancel"),
  projectModalConfirm: document.querySelector("#projectModalConfirm"),
  renameModal: document.querySelector("#renameModal"),
  renameModalTitle: document.querySelector("#renameModalTitle"),
  renameInput: document.querySelector("#renameInput"),
  renameModalCancel: document.querySelector("#renameModalCancel"),
  renameModalConfirm: document.querySelector("#renameModalConfirm"),
  moveModal: document.querySelector("#moveModal"),
  moveSelect: document.querySelector("#moveSelect"),
  moveModalCancel: document.querySelector("#moveModalCancel"),
  moveModalConfirm: document.querySelector("#moveModalConfirm"),
};

init();

function init() {
  renderAbilityCards();
  bindEvents();
  render();
}

function bindEvents() {
  els.createNewChatBtn.addEventListener("click", createNewChat);
  els.createNewProjectBtn.addEventListener("click", openProjectModal);
  els.userMenuButton.addEventListener("click", () => window.alert("用户菜单已打开（示例功能）"));
  els.sendEmptyChatBtn.addEventListener("click", sendEmptyChatMessage);
  els.sendMessageBtn.addEventListener("click", sendMessage);
  els.closeAbilityBtn.addEventListener("click", () => {
    state.activeAbility = null;
    renderChatComposer();
  });
  els.exitCurrentChatBtn.addEventListener("click", createNewChat);
  els.libraryBtnEmpty.addEventListener("click", goToLibrary);
  els.libraryBtnChat.addEventListener("click", goToLibrary);
  els.chatActionBtn.addEventListener("click", (event) => {
    const item = buildChatMenuItem(state.currentChatId);
    if (item) showMenu(item, event.currentTarget);
  });

  bindTextInput(els.emptyInputContent, "emptyInputContent", renderEmptyComposer, sendEmptyChatMessage);
  bindTextInput(els.inputContent, "inputContent", renderChatComposer, sendMessage);
  bindUpload(els.emptyImageInput, "image", "empty");
  bindUpload(els.emptyFileInput, "file", "empty");
  bindUpload(els.imageInput, "image", "chat");
  bindUpload(els.fileInput, "file", "chat");

  els.modalOverlay.addEventListener("click", closeAllModals);
  els.projectModalCancel.addEventListener("click", closeAllModals);
  els.projectModalConfirm.addEventListener("click", confirmCreateProject);
  els.renameModalCancel.addEventListener("click", closeAllModals);
  els.renameModalConfirm.addEventListener("click", confirmRenameItem);
  els.moveModalCancel.addEventListener("click", closeAllModals);
  els.moveModalConfirm.addEventListener("click", confirmMoveChat);

  document.addEventListener("click", (event) => {
    if (!els.itemMenu.contains(event.target) && event.target !== els.chatActionBtn) {
      hideMenu();
    }
  });
}

function bindTextInput(element, key, renderFn, sendFn) {
  element.addEventListener("input", (event) => {
    state[key] = event.target.value;
    renderFn();
  });
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendFn();
    }
  });
}

function bindUpload(element, type, zone) {
  element.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    if (file) addUploadedFile(file, type, zone);
    event.target.value = "";
  });
}

function createNewChat() {
  cleanupObjectUrls(state.uploadedFiles);
  cleanupObjectUrls(state.emptyUploadedFiles);
  state.currentChatId = "";
  state.currentChatTitle = "";
  state.currentChatMessages = [];
  state.inputContent = "";
  state.emptyInputContent = "";
  state.activeAbility = null;
  state.uploadedFiles = [];
  state.emptyUploadedFiles = [];
  render();
}

function openProjectModal() {
  els.projectNameInput.value = "";
  els.projectDescInput.value = "";
  openModal(els.projectModal);
}

function confirmCreateProject() {
  const name = els.projectNameInput.value.trim();
  const desc = els.projectDescInput.value.trim();
  if (!name || name.length < 2 || name.length > 20) {
    window.alert("项目名称长度需在 2 到 20 个字符之间");
    return;
  }
  state.projectList.push({ id: `proj_${Date.now()}`, name, desc, pinned: false, chats: [] });
  closeAllModals();
  render();
}

function createChatInProject(projectId) {
  createNewChat();
  state.currentChatId = `temp_${Date.now()}_proj_${projectId}`;
  state.currentChatTitle = "新建对话";
  render();
}

function selectChat(chatId) {
  const chat = findChat(chatId);
  if (!chat) return;
  cleanupObjectUrls(state.uploadedFiles);
  cleanupObjectUrls(state.emptyUploadedFiles);
  state.currentChatId = chat.id;
  state.currentChatTitle = chat.title;
  state.currentChatMessages = chat.messages;
  state.uploadedFiles = [];
  state.emptyUploadedFiles = [];
  state.emptyInputContent = "";
  state.inputContent = "";
  state.activeAbility = chat.ability || null;
  render();
  scrollToBottom();
}

function activateAbility(ability) {
  state.activeAbility = ability;
  state.inputContent = state.emptyInputContent;
  cleanupObjectUrls(state.uploadedFiles);
  state.uploadedFiles = cloneFiles(state.emptyUploadedFiles);
  if (!state.currentChatId) {
    state.currentChatId = `temp_${Date.now()}`;
    state.currentChatTitle = `准备${ability.name}`;
  }
  render();
}

function addUploadedFile(file, type, zone) {
  if (file.size / 1024 / 1024 > 50) {
    window.alert("上传文件大小不能超过 50MB");
    return;
  }
  const target = zone === "empty" ? state.emptyUploadedFiles : state.uploadedFiles;
  target.push(createFileItem(file, type));
  render();
}

function createFileItem(file, type) {
  if (type === "image") return { type, name: file.name, size: file.size, url: URL.createObjectURL(file), objectUrl: true };
  return { type, name: file.name, size: file.size, url: "#", objectUrl: false };
}

function sendEmptyChatMessage() {
  const content = state.emptyInputContent.trim();
  const files = state.emptyUploadedFiles;
  if (!content && files.length === 0) {
    window.alert("请输入内容或上传文件/图片后发送");
    return;
  }
  const newChat = {
    id: String(Date.now()),
    title: content.slice(0, 20) || files[0]?.name || "普通咨询",
    pinned: false,
    ability: null,
    messages: [buildUserMessage(content, files)],
  };
  state.uncategorizedChats.push(newChat);
  state.currentChatId = newChat.id;
  state.currentChatTitle = newChat.title;
  state.currentChatMessages = newChat.messages;

  const contentSnapshot = content;
  const filesSnapshot = cloneFiles(files);
  state.emptyInputContent = "";
  cleanupObjectUrls(state.emptyUploadedFiles);
  state.emptyUploadedFiles = [];
  render();
  scrollToBottom();

  window.setTimeout(() => {
    newChat.messages.push({ id: `${Date.now()}_ai`, role: "ai", type: "text", content: buildGeneralReply(contentSnapshot, filesSnapshot) });
    state.currentChatMessages = newChat.messages;
    render();
    scrollToBottom();
  }, 800);
}

function sendMessage() {
  const content = state.inputContent.trim();
  const files = state.uploadedFiles;
  if (!content && files.length === 0) {
    window.alert("请输入内容或上传文件/图片后发送");
    return;
  }

  let chat;
  if (!state.currentChatId || state.currentChatId.startsWith("temp_")) {
    const projectId = state.currentChatId.includes("_proj_") ? state.currentChatId.split("_proj_")[1] : "";
    chat = {
      id: String(Date.now()),
      title: state.activeAbility
        ? `${state.activeAbility.name}-${content.slice(0, 10) || files[0]?.name || "文件/图片咨询"}`
        : content.slice(0, 20) || files[0]?.name || "文件/图片咨询",
      pinned: false,
      ability: state.activeAbility,
      messages: [buildUserMessage(content, files)],
    };
    pushChat(chat, projectId);
    state.currentChatId = chat.id;
    state.currentChatTitle = chat.title;
    state.currentChatMessages = chat.messages;
  } else {
    chat = findChat(state.currentChatId);
    if (!chat) return;
    chat.messages.push(buildUserMessage(content, files));
    state.currentChatMessages = chat.messages;
  }

  const abilityName = state.activeAbility?.name || "普通";
  const contentSnapshot = content;
  const filesSnapshot = cloneFiles(files);
  state.inputContent = "";
  state.activeAbility = null;
  cleanupObjectUrls(state.uploadedFiles);
  state.uploadedFiles = [];
  render();
  scrollToBottom();

  window.setTimeout(() => {
    chat.messages.push({ id: `${Date.now()}_ai`, role: "ai", type: "text", content: buildAbilityReply(abilityName, contentSnapshot, filesSnapshot) });
    state.currentChatMessages = chat.messages;
    render();
    scrollToBottom();
  }, 800);
}

function buildUserMessage(content, files) {
  const id = `${Date.now()}_user`;
  const first = files[0];
  if (content && files.length === 0) return { id, role: "user", type: "text", content };
  if (!content && files.length > 0) {
    if (first.type === "image") return { id, role: "user", type: "image", content: first.url, fileName: first.name, fileSize: first.size };
    return { id, role: "user", type: "file", content: first.url, fileName: first.name, fileSize: first.size };
  }
  const mixed = { id, role: "user", type: "mixed", textContent: content, fileName: first.name, fileSize: first.size };
  if (first.type === "image") mixed.imageContent = first.url;
  else mixed.fileContent = first.url;
  return mixed;
}

function buildGeneralReply(content, files) {
  if (files.length > 0) {
    const first = files[0];
    return `已收到你的咨询请求，包含${first.type === "image" ? "图片" : "文件"}：${first.name}
文本内容：${content || "无"}

我已理解你的需求，以下是我的回复：
（此处为模拟回复，实际对接AI接口后会分析${first.type === "image" ? "图片" : "文件"}并返回真实结果）`;
  }
  return `已收到你的咨询请求：${content}

我已理解你的需求，以下是我的回复：
（此处为模拟回复，实际对接AI接口后会返回真实的回复结果）`;
}

function buildAbilityReply(abilityName, content, files) {
  if (files.length > 0) {
    const first = files[0];
    return `已收到你的【${abilityName}】请求，包含${first.type === "image" ? "图片" : "文件"}：${first.name}
文本内容：${content || "无"}

我会按照${abilityName}的标准流程结合${first.type === "image" ? "图片内容" : "文件内容"}为你处理，以下是生成的结果：
（此处为模拟回复，实际对接AI接口后会分析${first.type === "image" ? "图片" : "文件"}并返回真实结果）`;
  }
  return `已收到你的【${abilityName}】请求：${content}

我会按照${abilityName}的标准流程为你处理，以下是生成的结果：
（此处为模拟回复，实际对接AI接口后会返回真实的${abilityName}结果）`;
}

function showMenu(item, anchor) {
  if (!item) return;
  const rect = anchor.getBoundingClientRect();
  els.itemMenu.style.top = `${rect.bottom + 6}px`;
  els.itemMenu.style.left = `${Math.max(12, rect.left - 120)}px`;
  els.itemMenu.innerHTML = "";

  addMenuButton("重命名", () => renameItem(item));
  addMenuButton(item.pinned ? "取消置顶" : "置顶", () => togglePinItem(item));
  if (item.type === "chat") addMenuButton("移动至项目", () => openMoveModal(item.id), true);
  addMenuButton("删除", () => deleteItem(item), true, true);
  els.itemMenu.classList.remove("hidden");
}

function addMenuButton(label, onClick, divided = false, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `context-item${divided ? " divided" : ""}${danger ? " danger" : ""}`;
  button.textContent = label;
  button.addEventListener("click", () => {
    hideMenu();
    onClick();
  });
  els.itemMenu.append(button);
}

function hideMenu() {
  els.itemMenu.classList.add("hidden");
}

function renameItem(item) {
  state.currentRenameItem = item;
  els.renameModalTitle.textContent = `重命名${item.type === "project" ? "项目" : "对话"}`;
  els.renameInput.value = item.name || item.title || "";
  openModal(els.renameModal);
}

function confirmRenameItem() {
  const value = els.renameInput.value.trim();
  if (!value || value.length < 2 || value.length > 20) {
    window.alert("名称长度需在 2 到 20 个字符之间");
    return;
  }
  const item = state.currentRenameItem;
  if (!item) return;
  if (item.type === "project") {
    const project = state.projectList.find((entry) => entry.id === item.id);
    if (project) project.name = value;
  } else {
    const chat = findChat(item.id);
    if (chat) {
      chat.title = value;
      if (state.currentChatId === item.id) state.currentChatTitle = value;
    }
  }
  closeAllModals();
  render();
}

function togglePinItem(item) {
  if (item.type === "project") {
    const project = state.projectList.find((entry) => entry.id === item.id);
    if (project) project.pinned = !project.pinned;
  } else {
    const chat = findChat(item.id);
    if (chat) chat.pinned = !chat.pinned;
  }
  render();
}

function deleteItem(item) {
  if (item.type === "project") {
    const ok = window.confirm('删除项目会将项目内的所有对话移至"全部对话"，确定要删除吗？');
    if (!ok) return;
    const index = state.projectList.findIndex((entry) => entry.id === item.id);
    if (index > -1) {
      const project = state.projectList[index];
      state.uncategorizedChats.push(...project.chats);
      state.projectList.splice(index, 1);
    }
  } else {
    const ok = window.confirm("确定要删除该对话吗？");
    if (!ok) return;
    removeChat(item.id);
  }
  render();
}

function openMoveModal(chatId) {
  state.movingChatId = chatId;
  els.moveSelect.innerHTML = `<option value="">未归类</option>`;
  state.projectList.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    els.moveSelect.append(option);
  });
  openModal(els.moveModal);
}

function confirmMoveChat() {
  moveChat(state.movingChatId, els.moveSelect.value);
  closeAllModals();
  render();
}

function moveChat(chatId, projectId) {
  const chat = removeChatFromStore(chatId);
  if (!chat) return;
  pushChat(chat, projectId);
}

function pushChat(chat, projectId) {
  if (projectId) {
    const project = state.projectList.find((entry) => entry.id === projectId);
    if (project) {
      project.chats.push(chat);
      return;
    }
  }
  state.uncategorizedChats.push(chat);
}

function removeChat(chatId) {
  const removed = removeChatFromStore(chatId);
  if (!removed) return;
  if (state.currentChatId === chatId) createNewChat();
}

function removeChatFromStore(chatId) {
  const uncategorizedIndex = state.uncategorizedChats.findIndex((item) => item.id === chatId);
  if (uncategorizedIndex > -1) return state.uncategorizedChats.splice(uncategorizedIndex, 1)[0];
  for (const project of state.projectList) {
    const index = project.chats.findIndex((item) => item.id === chatId);
    if (index > -1) return project.chats.splice(index, 1)[0];
  }
  return null;
}

function findChat(chatId) {
  let chat = state.uncategorizedChats.find((item) => item.id === chatId);
  if (chat) return chat;
  for (const project of state.projectList) {
    chat = project.chats.find((item) => item.id === chatId);
    if (chat) return chat;
  }
  return null;
}

function locateChat(chatId) {
  if (state.uncategorizedChats.some((item) => item.id === chatId)) return "";
  for (const project of state.projectList) {
    if (project.chats.some((item) => item.id === chatId)) return project.id;
  }
  return "";
}

function buildChatMenuItem(chatId) {
  const chat = findChat(chatId);
  if (!chat) return null;
  return { type: "chat", id: chat.id, title: chat.title, pinned: Boolean(chat.pinned), projectId: locateChat(chat.id) };
}

function goToLibrary() {
  window.alert("跳转到资料库页面（示例功能）");
}

function openModal(modal) {
  els.modalOverlay.classList.remove("hidden");
  modal.classList.remove("hidden");
}

function closeAllModals() {
  els.modalOverlay.classList.add("hidden");
  els.projectModal.classList.add("hidden");
  els.renameModal.classList.add("hidden");
  els.moveModal.classList.add("hidden");
}

function render() {
  const activeChat = findChat(state.currentChatId);
  const hasCurrentChat = Boolean(state.currentChatId && (activeChat || state.currentChatId.startsWith("temp_")));
  els.emptyChat.classList.toggle("hidden", hasCurrentChat);
  els.chatContainer.classList.toggle("hidden", !hasCurrentChat);
  renderSidebar();
  renderAbilityCards();
  renderEmptyComposer();
  renderChatComposer();
  if (activeChat) renderMessages();
  else if (hasCurrentChat) {
    els.currentChatTitle.textContent = state.currentChatTitle || "未命名对话";
    els.messageList.innerHTML = "";
  }
}

function renderSidebar() {
  els.sidebarTree.innerHTML = "";

  const allChatsGroup = document.createElement("div");
  allChatsGroup.className = "tree-group";
  allChatsGroup.innerHTML = `<div class="tree-title">全部对话</div>`;
  const allChatsList = document.createElement("div");
  allChatsList.className = "tree-items";
  getSortedChats(state.uncategorizedChats).forEach((chat) => allChatsList.append(buildChatNode(chat, "")));
  allChatsGroup.append(allChatsList);
  els.sidebarTree.append(allChatsGroup);

  getSortedProjects().forEach((project) => {
    const section = document.createElement("div");
    section.className = "tree-group";

    const header = document.createElement("div");
    header.className = "project-header";
    const title = document.createElement("span");
    title.className = "project-name";
    title.textContent = project.name;

    const menu = document.createElement("button");
    menu.type = "button";
    menu.className = "item-actions";
    menu.textContent = "⋯";
    menu.addEventListener("click", () => showMenu({ type: "project", id: project.id, name: project.name, pinned: Boolean(project.pinned) }, menu));

    header.append(title, menu);

    const list = document.createElement("div");
    list.className = "tree-items";
    getSortedChats(project.chats).forEach((chat) => list.append(buildChatNode(chat, project.id)));

    const inlineCreate = document.createElement("button");
    inlineCreate.className = "inline-create";
    inlineCreate.type = "button";
    inlineCreate.textContent = "在本项目新建对话";
    inlineCreate.addEventListener("click", () => createChatInProject(project.id));
    list.append(inlineCreate);

    section.append(header, list);
    els.sidebarTree.append(section);
  });
}

function buildChatNode(chat, projectId) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = `chat-item${chat.id === state.currentChatId ? " active" : ""}`;
  item.addEventListener("click", () => selectChat(chat.id));

  const title = document.createElement("span");
  title.className = "chat-item-title";
  title.textContent = chat.title || "未命名对话";

  const menu = document.createElement("button");
  menu.type = "button";
  menu.className = "item-actions";
  menu.textContent = "⋯";
  menu.addEventListener("click", (event) => {
    event.stopPropagation();
    showMenu({ type: "chat", id: chat.id, title: chat.title, pinned: Boolean(chat.pinned), projectId }, menu);
  });

  item.append(title, menu);
  return item;
}

function getSortedProjects() {
  return [...state.projectList].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
}

function getSortedChats(chats) {
  return [...chats].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
}

function renderAbilityCards() {
  els.shortcutAbilities.innerHTML = "";
  state.shortcutAbilities.forEach((ability) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `ability-card ability-${ability.type}`;
    card.addEventListener("click", () => activateAbility(ability));
    card.innerHTML = `
      <div class="card-icon">✦</div>
      <div class="card-content">
        <div class="card-title">${escapeHtml(ability.name)}</div>
        <div class="card-desc">${escapeHtml(ability.desc)}</div>
      </div>
      <div class="card-arrow">›</div>
    `;
    els.shortcutAbilities.append(card);
  });
}

function renderEmptyComposer() {
  els.emptyInputContent.value = state.emptyInputContent;
  els.sendEmptyChatBtn.disabled = !state.emptyInputContent.trim() && state.emptyUploadedFiles.length === 0;
  renderPreviewList(els.emptyUploadPreview, state.emptyUploadedFiles, removeEmptyUploadedFile);
}

function renderChatComposer() {
  els.inputContent.value = state.inputContent;
  els.inputContent.placeholder = state.activeAbility ? state.activeAbility.placeholder : "发消息…支持上传图片/文件辅助说明";
  els.currentChatTitle.textContent = state.currentChatTitle || "未命名对话";
  els.activeAbilityTag.classList.toggle("hidden", !state.activeAbility);
  els.activeAbilityName.textContent = state.activeAbility?.name || "";
  els.sendMessageBtn.disabled = !state.inputContent.trim() && state.uploadedFiles.length === 0;
  renderPreviewList(els.uploadPreview, state.uploadedFiles, removeUploadedFile);
}

function renderPreviewList(container, files, onRemove) {
  container.innerHTML = "";
  container.classList.toggle("hidden", files.length === 0);
  files.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "preview-item";
    item.innerHTML = file.type === "image"
      ? `<div class="preview-image"><img class="preview-thumb" src="${file.url}" alt="${escapeHtml(file.name)}" /></div>`
      : `<div class="preview-file"><span class="preview-file-icon">📄</span><span class="file-name">${escapeHtml(file.name)}</span><span class="file-size">(${formatFileSize(file.size)})</span></div>`;
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "preview-delete";
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => onRemove(index));
    item.append(removeButton);
    container.append(item);
  });
}

function renderMessages() {
  const chat = findChat(state.currentChatId);
  if (!chat) return;
  els.currentChatTitle.textContent = chat.title || "未命名对话";
  els.messageList.innerHTML = "";
  chat.messages.forEach((msg) => {
    const row = document.createElement("div");
    row.className = `message-row ${msg.role === "user" ? "user" : "ai"}`;
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.innerHTML = msg.role === "user" ? `<img src="${state.userAvatar}" alt="用户头像" />` : "AI";
    const content = document.createElement("div");
    content.className = "message-content";
    if (msg.role === "ai") content.textContent = msg.content;
    else renderUserMessageBody(content, msg);
    row.append(avatar, content);
    els.messageList.append(row);
  });
}

function renderUserMessageBody(container, msg) {
  if (msg.type === "text") {
    container.textContent = msg.content;
    return;
  }
  if (msg.type === "image") {
    container.innerHTML = `<img class="chat-image" src="${msg.content}" alt="${escapeHtml(msg.fileName || "上传图片")}" />`;
    return;
  }
  if (msg.type === "file") {
    container.innerHTML = `<div class="file-content"><span class="preview-file-icon">📄</span><span class="file-link">${escapeHtml(msg.fileName)}</span><span class="file-size">(${formatFileSize(msg.fileSize)})</span></div>`;
    return;
  }
  const mixed = document.createElement("div");
  mixed.className = "mixed-content";
  const text = document.createElement("div");
  text.textContent = msg.textContent;
  mixed.append(text);
  if (msg.imageContent) {
    const image = document.createElement("img");
    image.className = "chat-image small";
    image.src = msg.imageContent;
    mixed.append(image);
  }
  if (msg.fileContent) {
    const file = document.createElement("div");
    file.className = "mixed-file";
    file.innerHTML = `<span class="preview-file-icon">📄</span><span class="file-link">${escapeHtml(msg.fileName)}</span><span class="file-size">(${formatFileSize(msg.fileSize)})</span>`;
    mixed.append(file);
  }
  container.append(mixed);
}

function removeUploadedFile(index) {
  removeFileAt(state.uploadedFiles, index);
  renderChatComposer();
}

function removeEmptyUploadedFile(index) {
  removeFileAt(state.emptyUploadedFiles, index);
  renderEmptyComposer();
}

function removeFileAt(list, index) {
  const item = list[index];
  if (!item) return;
  if (item.objectUrl && item.url) URL.revokeObjectURL(item.url);
  list.splice(index, 1);
}

function cloneFiles(files) {
  return files.map((file) => ({ ...file }));
}

function cleanupObjectUrls(files) {
  files.forEach((file) => {
    if (file.objectUrl && file.url) URL.revokeObjectURL(file.url);
  });
}

function scrollToBottom() {
  els.messageList.scrollTop = els.messageList.scrollHeight;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
