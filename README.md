# cmdhelper

紧凑的命令助手：知道命令名，通过参数表单或终端逐步提示生成完整命令。首批支持 OpenSSH scp、ssh，包含常用参数介绍和模糊搜索。

## 开发

需要 Node.js 22.12+、pnpm 10。

```sh
pnpm install
pnpm dev
pnpm cli ssh
pnpm cli scp
pnpm cli search 端口
pnpm cli explain ssh
pnpm test
pnpm build
```

## 目录

- `commands/`：一级目录，每个命令一个 JSON，命令介绍、参数、提示、官方来源均结构化存储，是内容唯一维护入口。
- `articles/`：一级目录，结构化文章 JSON，含元数据、摘要和分节正文。
- `apps/web/`：Vite 网站，三栏助手、文章列表/详情、关于，使用 hash 路由适配静态托管。
- `apps/cli/`：npm 包 `cmdhelper`，交互式逐步输入、搜索和解释，只生成命令。
- `packages/core/`：共享工具包 `@cmdhelper/core`，命令生成、验证、Shell 引用与模糊搜索。
- `packages/core/data/`：命令资料的发布快照，修改根目录资料后运行 `pnpm prepare:packages` 同步。
- `docs/`：网站构建产物。

新增命令时在 `commands/` 添加 JSON，并更新资料同步脚本和 core 的导入注册；网页和 CLI 自动使用注册后的参数表。新增文章只需添加 `articles/*.json`。

## GitHub Pages

目标： https://oft.github.io/cmdhelper/ 。Vite base 固定为 `/cmdhelper/`。仓库为 `oft/cmdhelper`，默认分支为 `main`。

1. 首次运行前，在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. 推送到 `main`，或在 **Actions → Build and deploy Pages → Run workflow** 手动运行。工作流安装依赖、测试并生成 `docs/`，上传该目录为 Pages artifact，再由部署任务发布。
3. 如果 `configure-pages` 报 `Get Pages site failed` / `Not Found`，先完成第 1 步，再重新运行工作流。默认 `GITHUB_TOKEN` 不能自动首次启用 Pages，直接添加 `enablement: true` 仍需要额外的授权令牌。

使用此工作流时无需提交生成的 `docs/`。若选择手动构建并提交 `docs/`，则在 Source 选择 **Deploy from a branch**，指定 `main` 的 `/docs`，并停用此工作流；两种发布方式选择一种，避免重复部署。

## npm 发布准备

目前没有发布 npm。先确认 `cmdhelper`、`@cmdhelper/core` 名称及发布权限。统一修改版本，运行 `pnpm prepare:packages`、`pnpm test`、`pnpm build`，分别在两个包目录 `pnpm pack` 检查。先发布 core，再发布 CLI；pnpm 打包会把 workspace 依赖改为真实版本。网站包和根包均为 private。首次发布还需要按实际 npm 账号配置访问权限或 Trusted Publishing。

## 使用边界

支持 POSIX/Bash 与 PowerShell，不支持 cmd.exe。CLI 在 Windows 默认输出 PowerShell 语法，可用 `--shell posix` 覆盖。输入仅保存在内存中；不会自动执行命令，不收集密码。远程路径可能受远端 Shell 和 OpenSSH 版本影响，执行前检查生成结果。本项目覆盖常用参数，不替代完整手册。

参考：[ssh](https://man.openbsd.org/ssh.1)、[scp](https://man.openbsd.org/scp.1)。

## 问题导航原型

顶部“问题导航”按对象、位置、目标变化、时间频率、连接条件、媒体要求匹配方案。提供设备/文件状态示意、前后变化、选择依据、步骤、限制与官方来源。SCP、SSH 方案可进入命令助手；rsync、FFmpeg 当前只有导航资料，没有参数编辑器。

`problems/catalog.json` 是根目录结构化问题资料，含维度、快捷问题、方案匹配规则、前置条件和说明。`packages/core/src/problems.js` 提供无 UI 的规则匹配，后续可供 CLI 或独立项目复用。未满足前置条件的候选显示“需要确认条件”，未覆盖组合明确显示暂无收录，不等同于无解。

进一步独立项目时，可把方案拆成带输入/输出状态的能力步骤，再加入平台、权限、成本、质量与失败恢复约束。只有偏好和约束明确后才比较“最佳”；当前不做最优性评分，也不自动探测设备或执行工具。

## 工具前置条件与验收

`tools/catalog.json` 定义当前全部工具的平台适用性、安装状态、连接、服务与认证条件；`problems/catalog.json` 补充方案特有的读写权限、空间、覆盖策略、编码或转发条件及结果验收。每条检查含作用设备、检查方法与不满足时的处理办法。

问题导航展示待确认、已人工确认满足、不满足三个状态。所有前置条件确认且问题条件匹配后才开放方案的命令助手入口；执行后需另行填写验收结果。改变问题坐标会清除本轮确认，改变前置条件会清除已有验收。状态仅保存在页面内存中，不自动检测环境、不执行命令；“完成”只代表用户报告验收通过。直接访问命令助手仍可独立生成命令。

当前 SCP 方案面向使用 SFTP 的现代 OpenSSH 客户端：远端需要 SSH 服务及 SFTP 子系统，并非统一要求远端 scp 二进制；旧协议需要独立建模。rsync-over-SSH 则分别要求两端 rsync。缺失软件时应先确认平台支持、安装途径和权限，再安装并重新验证；不会自动安装或变更设备。

## 问题树与处理优先级

每个方案在 `problems/catalog.json` 声明 `checkTree`，按层级递进：L0 目标与路线匹配 → L1 平台和连接可行性 → L2 安装、认证与服务能力 → L3 输入和操作细节 → L4 执行后验收。同层检查并列，全部通过才展开子层。上层失败或待确认时，下层仅显示暂缓摘要，不展示具体检查项；页面显示当前最高优先级阻塞点，提示先修复或更换路线。

修改上层检查会清除后代层级证据与验收，保留无依赖的同层检查；改变问题坐标仍清除本轮全部确认。树结构属于方案数据，可按问题调整，不能把所有问题强制套入相同分类。后续可将替代路线建为 OR 分支；当前是每个候选方案独立的 AND 检查树，没有自动求解替代方案。

## 标准问题与投入模型 v0.1

- `problems/model.json`：模型约定、投入维度、短文本问题模板与三条人工编写的方案。
- `problems/instance.schema.json`：标准问题实例的 JSON Schema（2020-12）；约束实体、目标、资源、证据来源和验收等结构。目前是格式契约，页面尚未提供通用实例导入或 Schema 运行时校验。
- `problems/short-text.example.json`：显式保留未知条件的初始实例示例。
- `packages/core/src/resources.js`：确定性资源筛选规则，输出可选择、待澄清、不符合投入，并给出原因。

问题导航先展示投入与便利条件，用户选择工具路线后才展开工具条件树。短文本示例可比较直接输入、已有且允许使用的通道、保存为文件后用 SCP 传输；手工与已有通道包含步骤、前后状态与人工验收，SCP 路线继续使用工具前置检查及命令助手。

成本当前用准备、单次操作、维护三个维度定性说明，没有分钟数、付费估算或最优性保证。时间偏好和频率用于说明与排序，不代表用户已给定精确时间预算。当前不自动理解口语、不自动规划组合、不自动执行、不探测环境；原始描述及证据格式为后续扩展准备，页面以预置模板及选择项工作。

## 维度滑块

问题坐标与投入维度使用带文字刻度的离散滑块，支持拖动、点击刻度和键盘方向键 / Home / End。刻度下方的数量表示：保留其他条件，只切换当前维度选项时得到的候选方案数（问题坐标）或可选路线数（投入条件）。结果区分别显示候选、条件匹配、前置检查通过与待补充信息，匹配不代表已验证可执行。不相关维度禁用并显示“不适用”；模式切换、检查和验收状态仍使用选择控件。
