# dsh-session-artifacts

侧边栏里的「本会话产物」标签页：把**当前对话产出过哪些文件**列出来，带完整路径，可打开、复制路径、移入回收站。

解决的痛点：DSH 的会话记录里其实已经写下了每一个产物（`deliverables/presented` 是 `present` 工具声明过的交付物，`tool/call` 是每次写入型工具调用的参数），但没有任何界面把它读出来。想找上一次生成的图片或 blend 文件，只能靠聊天记录往上翻。

## 功能

- **两个分组**
  - **交付物**：agent 用 `present` 明确声明过的文件，带当时的描述、第几轮交付；同一个文件被重复交付会合并成一条，保留最新描述并记下所有轮次
  - **过程产物**：写入型工具（`write`/`edit`/`blender_export`/`godot_export_project`/`office_export_pdf` 等）碰过的文件，可折叠
- **完整绝对路径**：点「路径」按钮复制到剪贴板；下方显示目录与大小
- **点开就在侧栏内预览**：点整行，预览层在标签页内部铺满（不弹全屏窗口，也不遮挡旁边的对话）——图片按原比例缩放、视频音频带控件、代码和文本读前 256KB、其他类型给提示。`Esc` 或点空白处关闭，`←` `→` 在本次会话的所有文件之间翻页，另有「在编辑器中打开」和「复制完整路径」
- **已消失的文件**：文件不在磁盘上了会划掉并标注，不会假装它还在。这种行的按钮变成「移除」而不是「删除」——没什么可删的，点它只是把这条死记录从列表里划掉（记在 `~/.dsh/dsh-session-artifacts/dismissed/<会话id>.json`）。顶部摘要里的「N 个已丢失 · 清除」可以一次清掉本会话全部死记录
- **会话切换器**：顶部下拉可切到磁盘上任意历史会话，看它当时产出了什么；默认跟随当前打开的会话，手动选过之后不再被自动切走
- **派生会话默认不列出**：从别的会话 fork 出来的（header 里 `delegationDepth > 0`，比如侧边对话、subagent fork）会**继承父会话的整段历史事件**，所以它的产物列表必然是父会话的副本。选择器默认隐藏它们，底部显示「另有 N 个派生会话」可展开，展开后带「派生」角标。实测那份数据里 4 个派生会话的独有产物是 0 个
- **删除要过回收站**：删除 = 移到 `~/.dsh/dsh-session-artifacts/trash/<时间戳>-<随机>/`，原文件的字节完好保存，随时可恢复。回收站面板里可逐条「恢复」或「彻底删除」
- 盘根、家目录、`DSH_HOME` 本体直接拒绝入回收站，避免手滑

## 前置要求

| 依赖 | 版本 | 必需？ | 说明 |
| --- | --- | --- | --- |
| DeepSeek Harness | `>= 0.2.1-rc.2` | **必需** | host 端注册 HTTP 路由，用的是 `ctx.webServer` |
| [dsh-better-sidebar](https://www.npmjs.com/package/dsh-better-sidebar) | `>= 0.28.0` | **必需** | 侧边栏标签页是它的扩展点；`registerTab` 从 0.28.0 才对外开放 |
| Node.js | `>= 20` | 必需 | 用了 `zlib.zstdDecompressSync` 解会话文件 |

分工很清楚：**host 端**（`lib/index.js`）只 `inject: ['webServer']`，不碰 better-sidebar，所以没装 better-sidebar 时路由照样能注册、接口照样能调；**client 端**（`lib/client.js`）`inject: ['betterSidebar']`，没有它就不注册标签页——插件不会报错，只是侧边栏里没有那一页。

`dsh-better-sidebar` 已在 `peerDependencies` 里声明，但 DSH 不会替你装 peer（profile 的 pnpm 配置是 `autoInstallPeers: false`），得自己先装好：

```powershell
cd ~/.dsh/profiles/desktop
pnpm add dsh-better-sidebar
```

装完 `dsh-better-sidebar` 重启 DSH，再装本插件。

## 怎么装

### 1. 拿到代码

```powershell
git clone https://github.com/RDYRD/dsh-session-artifacts.git
cd dsh-session-artifacts
```

没有 git 就在仓库页面点 **Code → Download ZIP**，解压到任意位置——`install.mjs` 用的是脚本自己所在的目录，放哪都行。

> 还没发布到 npm，所以暂时不能 `pnpm add dsh-session-artifacts`。

### 2. 挂进 DSH

```powershell
node install.mjs
```

脚本做两件事：

1. 在 `~/.dsh/profiles/desktop/node_modules/` 下建一个 junction 指向本目录（让 DSH 能按包名解析到它）
2. 往 `~/.dsh/profiles/desktop/cordis.patch.yml` 追加一条 `insert` 记录，把插件挂进 loader

> 之前从别处装过一份副本的话，`node install.mjs` 会拒绝执行，并告诉你先 `node install.mjs --remove`。它不会偷偷把 junction 改指到新位置——替换 junction 有动到旧副本的风险，不值得。

**装完必须重启 DSH**（host 端插件在主进程里，不重启不会注册路由）。

重启的边界（实测）：DSH 的 cordis loader 会热加载 `cordis.patch.yml` 本身，所以第一次 `insert` 之后不用重启就能看到路由；但它**不追踪插件源码**——只要改了 `lib/*.js`，就必须完全退出 DSH 再打开，否则跑的还是旧代码（表现是新增的路由返回 401，而不是 404）。

## 自检

改完代码、重启之前可以先跑：

```powershell
npm test                    # 下面三条串起来跑
node test/test-smoke.mjs      # 解码会话、抽产物，打印耗时与数量
node test/probe-client.mjs    # 在假环境里加载 client bundle，验证 tab 注册没坏
node test/probe-host.mjs      # 验证 missing 标记、dismiss 往返、/artifacts 过滤与计数
```

这些脚本都不碰真实数据（只读会话文件；`probe-host.mjs` 会建一个临时 dismissed 文件，跑完自己删掉），可以随便跑。另外 `test/probe-sessions.mjs` 列出每个会话的 `delegationDepth`/标题来源/产物数，`test/probe-sidechat.mjs` 与 `test/probe-forkdiff.mjs` 专门看派生会话和它父会话的差异——这两个是排查「这个会话是哪来的」用的。

## 卸载

```powershell
node install.mjs --remove
```

会把 patch 里的 insert 行删掉并移除 junction。回收站里的文件不会动，需要的话自己清 `~/.dsh/dsh-session-artifacts/trash`。

## 数据从哪来

全部读本地会话文件，不联网、不改会话：

```
~/.dsh/sessions/<工作区slug>/session-<uuid>/session.v4.jsonl.zstd
```

一个会话文件是**多帧 zstd 拼接**的（每次 flush 追加一帧），Node 的 `zstdDecompressSync` 只解第一帧，所以先按 magic `28 B5 2F FD` 切分再逐帧解压。解出来的 JSONL 里：

- `{"type":"deliverables/presented","data":{"turn":9,"files":[{"path":"...","description":"..."}]}}` → 交付物
- `{"type":"tool/call","data":{"turn":1,"name":"write","arguments":"{\"file_path\":\"...\"}"}}` → 过程产物（按工具名查它用哪个参数键写文件）
- `workspace/changes` 只有轮次号没有文件明细，用不了

写入型参数键表在 `lib/artifacts.js` 的 `WRITE_ARG_KEYS`。

## 接口

host 端注册 7 条路由，前缀 `/api/dsh-session-artifacts`：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/sessions` | 磁盘上的会话列表；派生会话（`delegationDepth > 0`）默认隐藏，加 `?includeDerived=1` 一并返回 |
| GET | `/artifacts?sessionId=` | 一个会话的两个分组 + 统计（已 dismiss 的路径不返回） |
| GET/HEAD | `/raw?path=&mode=` | 原文件字节，给缩略图和内联预览用；`mode=text` 截前 256KB 当纯文本返回 |
| GET | `/trash` | 回收站条目 |
| POST | `/trash` | `{paths:[...]}` 移入回收站；文件已不在的路径不报错，返回 `missing:true` |
| POST | `/dismiss` | `{sessionId, paths:[...]}` 让这些路径不再出现在 `/artifacts`（不删任何东西） |
| POST | `/restore` | `{id}` 恢复 |
| POST | `/purge` | `{id}` 彻底删除 |

所有路由都要求：loopback 对端、`sec-fetch-site` 为 `same-origin`/`none`/缺失、写操作带 `content-type: application/json`（挡掉跨站表单）。`/raw` 上限 48MB，超过返回 413。

## 已知边界

- 只认「写入型工具 + 显式路径参数」和 `present`。脚本里间接生成的文件（比如 `python x.py` 里 `plt.savefig(...)` 写出的图）不在过程产物里 —— 会话记录里没有这个信息
- `bash`/`pwsh` 里出现过的路径会当作候选，但会被 `exists + 不像噪声` 过滤（排除 `.dsh/`、`node_modules/`、`.git/`、`__pycache__/`）
- 产物路径按**字符串**提取，不做通配符展开；带 `*`、`?` 的参数直接跳过
