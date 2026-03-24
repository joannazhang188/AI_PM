# 产品经理工作台优化说明

## 1. 目标

本说明用于指导下一阶段的前后端开发，目标不是直接叠加功能，而是在现有框架上先收敛状态模型、交互边界和后端协议，避免继续修改时引入新的 UI 变形、状态混乱和工作流串线问题。

本轮需要同时解决两类问题：

1. 对话页面 UI 和文档交互不稳定
2. 快捷功能与大模型工作流绑定不清晰，文档编辑后的内容无法成为后续引用和资源导出的统一真源

## 2. 当前问题归因

结合现有实现，问题主要来自四类结构性原因：

### 2.1 输入区承担了过多临时状态

当前输入区同时承载：

- 文本输入
- 附件
- 引用资源
- 快捷功能
- 模型模式
- 发送状态

但这些状态没有被拆成稳定的数据结构，导致：

- UI 容器高度和按钮尺寸容易互相挤压
- 快捷功能、引用附件、文档卡片引用之间缺少统一约束
- 一次渲染修改容易影响整个输入区布局

### 2.2 快捷功能既像会话状态，又像本轮输入状态

当前“快捷功能”在逻辑上没有明确区分：

- 会话当前工作流
- 输入区本轮选中的工作流

这会导致几个问题：

- 进入会话后再改快捷功能，旧状态可能残留
- 清空快捷功能时，后端仍可能沿用历史工作流
- 会话展示和实际请求使用的工作流可能不一致

### 2.3 文档没有单一真源

当前文档相关数据分散在多个位置：

- 对话消息中的卡片
- 右侧文档栏展示对象
- 资源库导出内容
- 输入区引用标签

如果用户编辑了文档，但没有一个统一的 `document.content` 作为主数据源，就会出现：

- 右侧编辑的是一份
- 资源库导出的是另一份
- 引用进入下一轮的又是第三份

### 2.4 后端仍是“支线提示词 + 原始文本拼接”模式

当前后端对快捷功能的处理仍偏轻量：

- 根据 `branchName` 注入简单支线提示词
- 把文本和附件内容拼成 prompt
- 前端再通过长度或 Markdown 特征猜测是否为长文档

这种模式在简单对话能工作，但会在以下场景失稳：

- 快捷功能切换
- 引用已有文档后增量修改
- 文档编辑后再次引用
- 资源库保存编辑后内容
- 文档和普通文本输出混合

## 3. 设计原则

后续优化必须遵守以下原则，否则功能会继续互相耦合：

### 3.1 单一真源

- 快捷功能只有一个当前值
- 文档内容只有一个当前值
- 输入区的引用对象只引用实体 ID，不复制业务内容

### 3.2 会话状态与输入状态分离

- 会话负责记录当前上下文和历史
- 输入区只负责本轮草稿
- 本轮发送时，再把草稿合并进请求

### 3.3 后端返回结构化结果

- 不再依赖前端用文本启发式判断“是不是文档”
- 后端明确告诉前端本轮有没有 artifact
- artifact 明确区分文档、代码、表格等类型

### 3.4 文档引用和文档查看分离

- 点击卡片主体：打开右侧文档栏
- 点击卡片“引用”：只把文档加入输入区引用列表

### 3.5 编辑后的文档必须覆盖旧内容

只要用户在右侧文档栏编辑并保存，后续：

- 再次打开文档
- 引用到输入区
- 导出到资源库
- 导出本地

都必须基于编辑后的最新内容。

## 4. 前端优化方案

## 4.1 输入区重构建议

### 目标

解决对话页底部输入框变形、按钮跑出容器、布局不稳定的问题。

### 方案

将输入区拆成固定三层，而不是把所有元素平铺在同一层内：

1. `composer-header`
   - 展示快捷功能标签
   - 展示引用文档/资源/文件/图片标签
2. `composer-body`
   - 只放文本输入区
3. `composer-footer`
   - 左侧是上传、引用资源库、快捷功能选择、模型模式
   - 右侧是语音和发送按钮

### 约束

- 输入区在对话页使用 `position: sticky` 或稳定底部容器，不跟消息区抢高度
- 发送按钮、语音按钮使用固定宽高，不受容器压缩影响
- `footer` 允许换行，但按钮不允许压缩变形
- 引用标签区最多占两行，超出后内部滚动

### 前端数据结构建议

```ts
type ComposerDraft = {
  text: string;
  selectedWorkflowId: string | null;
  attachments: ComposerAttachmentRef[];
  quotedArtifactIds: string[];
  quotedResourceIds: string[];
  modelMode: "auto" | "fast" | "quality";
};
```

说明：

- 输入区只维护 `ComposerDraft`
- 不直接把会话历史或完整文档对象塞进输入区状态

## 4.2 快捷功能状态归一

### 目标

保证任一时刻只存在一个有效快捷功能，并且 UI 展示与实际发送使用的工作流完全一致。

### 规则

1. 输入区只允许选择一个快捷功能
2. 快捷功能选择结果以标签形式展示在输入区
3. 若用户重新选择新的快捷功能，则旧标签立即被替换
4. 若用户把选择切回“选择快捷功能”，则当前 `selectedWorkflowId = null`
5. 发送时若 `selectedWorkflowId = null`，后端走普通对话模式，不套用任何快捷工作流

### 会话与输入区关系

推荐不要把快捷功能永久绑死到会话对象里，而是区分两层：

```ts
type ConversationState = {
  id: string;
  currentWorkflowId: string | null;
  messages: Message[];
};
```

```ts
type ComposerDraft = {
  selectedWorkflowId: string | null;
};
```

发送时规则：

- 若本轮草稿里有 `selectedWorkflowId`，则本轮请求使用它，并同步覆盖会话的 `currentWorkflowId`
- 若草稿里为空，则本轮请求不使用工作流，并同步把会话 `currentWorkflowId` 置空

这样能准确满足你的需求：

- 初始页选了“需求评审”进入对话页
- 在对话页改成“生成测试用例”
- 本轮发送后以“生成测试用例”为准
- 如果又切回“选择快捷功能”，则本轮发送按普通对话处理

## 4.3 文档实体统一管理

### 目标

解决文档查看、编辑、引用、导出、资源库存储不是同一份数据的问题。

### 方案

把文档从消息卡片里抽成独立实体，消息中只保留引用关系。

```ts
type ArtifactDocument = {
  id: string;
  conversationId: string;
  sourceMessageId: string;
  workflowId: string | null;
  title: string;
  format: "md" | "json" | "html" | "code";
  content: string;
  preview: DocumentBlock[];
  createdAt: string;
  updatedAt: string;
  version: number;
  isEdited: boolean;
};
```

消息卡片只保留：

```ts
type MessageArtifactRef = {
  artifactId: string;
  title: string;
  kind: "document";
};
```

### 这样带来的好处

- 卡片点击打开时，通过 `artifactId` 找到文档实体
- 点击引用时，不复制文档全文，只记录引用 `artifactId`
- 编辑保存时，只更新文档实体
- 导出资源库时，直接取文档实体的最新 `content`

## 4.4 文档栏交互方案

### 编辑按钮

点击编辑后，右侧文档栏进入可编辑状态：

- `preview` 模式可切换成富文本编辑或 Markdown 编辑
- `code` 模式直接编辑原始字符串

推荐第一阶段先做统一文本编辑：

- 不区分富文本和 Markdown 编辑器
- 直接编辑 `content`
- 预览区由 `content -> preview` 重新解析生成

### 复制按钮

复制当前文档栏正在展示的实际内容：

- 在 `preview` 模式下复制渲染前的完整文本内容
- 在 `code` 模式下复制原始 `content`

### 点击卡片 vs 点击引用

必须拆成两个事件：

1. 点击文档卡片主体
   - 打开右侧文档栏
2. 点击“引用”
   - 将 `artifactId` 插入输入区引用列表
   - 不自动打开右侧文档栏

## 4.5 资源库存储规则

导出到资源库时，资源内容必须来自文档实体的最新内容，而不是首次生成时的静态副本。

资源实体建议：

```ts
type ResourceRecord = {
  id: string;
  sourceArtifactId: string;
  name: string;
  workflowId: string | null;
  format: string;
  content: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};
```

若后端已持久化资源库，导出动作应为“保存当前 artifact 的最新版本内容”。

## 5. 后端优化方案

## 5.1 从“支线提示词”升级到“工作流注册表”

### 当前问题

当前后端只是按 `branchName` 拼几句提示词，不足以支持：

- 输出格式约束
- 文档型产物生成
- 增量修改
- 资源引用
- 文档编辑后再引用

### 方案

后端建立统一的工作流注册表：

```ts
type WorkflowConfig = {
  id: string;
  name: string;
  systemPrompt: string;
  outputMode: "chat" | "artifact";
  artifactType?: "prd" | "review" | "testcase" | "report" | "ppt" | "generic";
  preferredFormat?: "md" | "json" | "html";
  editStrategy: "rewrite" | "patch";
};
```

例如：

- `prd_generate`
  - 输出模式：`artifact`
  - 类型：`prd`
  - 首选格式：`md`
  - 编辑策略：`patch`
- `review_requirement`
  - 输出模式：`artifact`
  - 类型：`review`
  - 首选格式：`md`
- `generic_chat`
  - 输出模式：`chat`
  - 无 artifact

## 5.2 请求协议升级

前端发送时，不再只发 `branchName + 文本 + attachments`，而是发结构化请求：

```ts
type ChatRequest = {
  conversationId: string | null;
  workflowId: string | null;
  message: string;
  history: ChatHistoryItem[];
  attachments: AttachmentPayload[];
  quotedArtifacts: QuotedArtifactPayload[];
  quotedResources: QuotedResourcePayload[];
  targetArtifactId?: string | null;
  artifactEditIntent?: "none" | "modify";
  modelMode: "auto" | "fast" | "quality";
};
```

### 关键字段说明

- `workflowId`
  - 当前轮使用的工作流
  - 可为空，表示普通对话
- `quotedArtifacts`
  - 本轮引用的会话内文档
- `quotedResources`
  - 本轮引用的资源库内容
- `targetArtifactId`
  - 如果用户是在修改某个现有文档，这里明确指向它
- `artifactEditIntent`
  - 后端不要再从自然语言里猜“是不是修改”，前端直接显式传递

## 5.3 后端上下文组装规则

后端应按以下顺序组装模型上下文：

1. 系统层
   - 当前工作流配置
   - 输出要求
   - 是否需要产出 artifact
2. 会话层
   - 精简后的历史消息
3. 本轮输入层
   - 文本
   - 文件解析内容
   - 图片说明
   - 引用资源
   - 引用文档
4. 编辑层
   - 若 `artifactEditIntent = modify`
   - 明确告诉模型：基于目标 artifact 修改，不要重写未提及内容

### 重要要求

后端不要再依赖“用户用了修改、优化、补充等词汇”来猜编辑意图。

编辑意图应由前端显式确定，规则可以是：

- 本轮引用了一个 artifact
- 且当前工作流与该 artifact 的生成工作流兼容
- 用户从卡片或文档栏发起“引用并继续修改”

## 5.4 响应协议升级

前端不应继续通过 `extractArtifactFromReply()` 这类文本启发式逻辑判断是否生成文档。

后端应显式返回：

```ts
type ChatResponse = {
  replyText: string;
  workflowUsed: string | null;
  artifacts: OutputArtifact[];
  citations?: CitationRef[];
};
```

```ts
type OutputArtifact = {
  id: string;
  kind: "document" | "code" | "table";
  title: string;
  format: "md" | "json" | "html" | "txt";
  content: string;
  preview: DocumentBlock[];
  createdAt: string;
  workflowId: string | null;
};
```

这样前端只需要：

- 渲染 `replyText`
- 渲染 `artifacts`
- 不再从纯文本里猜卡片

## 5.5 文档编辑后的保存链路

### 原则

文档一旦可编辑，后端必须支持 artifact 更新接口，否则前端编辑只是临时态。

建议增加接口：

```ts
PATCH /api/artifacts/:artifactId
```

请求体：

```ts
{
  content: string,
  format: "md",
  title?: string
}
```

返回更新后的 artifact。

### 后续依赖此接口的功能

- 文档栏编辑保存
- 文档再次引用
- 导出到资源库
- 导出本地
- 后续多轮继续修改

## 5.6 资源库保存策略

导出到资源库时，不要再从前端当前显示模式临时拼内容。

推荐后端接口：

```ts
POST /api/resources
```

请求体：

```ts
{
  artifactId: string,
  conversationId: string,
  workflowId: string | null,
  name: string,
  description: string
}
```

后端根据 `artifactId` 读取该文档的最新内容并入库。

这样能保证：

- 资源库存的是编辑后的最新版本
- 后续引用资源时仍是最新版本

## 6. 推荐开发顺序

为了减少新 bug，建议不要 UI 和工作流一起硬改，而是分三阶段推进。

### 阶段一：前端状态收敛

只做以下事情：

- 重构输入区布局
- 拆分 `ComposerDraft`
- 快捷功能单选化
- 文档卡片点击和引用分离
- 文档实体统一管理

这一阶段先不改后端协议，只做前端结构整理。

### 阶段二：后端协议升级

只做以下事情：

- 引入 `workflow registry`
- 请求协议增加 `workflowId / quotedArtifacts / targetArtifactId / artifactEditIntent`
- 响应协议返回 `artifacts`

这一阶段先不做真正的文档编辑保存，只完成结构化对话链路。

### 阶段三：文档编辑与资源库闭环

最后做：

- artifact 编辑保存接口
- 文档编辑后再引用
- 导出到资源库保存最新内容
- 文档本地导出使用最新内容

## 7. 验收标准

前端和后端完成后，至少应验证以下场景：

### 场景 A：输入区稳定性

- 对话页底部输入框固定
- 多个标签存在时不变形
- 发送按钮和语音按钮不跑出容器

### 场景 B：快捷功能切换

- 初始页选“需求评审”进入对话
- 对话页改成“生成测试用例”
- 本轮发送按测试用例工作流执行
- 再切回“选择快捷功能”
- 本轮发送按普通对话执行

### 场景 C：文档查看与引用

- 点击卡片主体只打开右栏
- 点击“引用”只加入输入区

### 场景 D：文档编辑闭环

- 打开文档
- 编辑内容并保存
- 再次打开仍是新内容
- 引用进入输入区是新内容
- 导出到资源库保存的也是新内容

### 场景 E：增量修改

- 生成一份 PRD
- 引用该 PRD
- 在同一工作流下要求修改某段
- 返回结果基于原文档修改，不重写整份

## 8. 结论

本轮优化的关键不是继续叠加交互，而是先把三件事做成稳定底座：

1. 输入区草稿状态独立
2. 文档实体单一真源
3. 后端工作流和 artifact 协议结构化

只有这三件事先收住，后续再加 UI 效果、资源库、文档编辑和多轮工作流，才不会继续产生状态串线和难回归的问题。
