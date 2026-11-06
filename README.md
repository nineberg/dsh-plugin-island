# 插件灵动岛 (`plugin-island`)

![License](https://img.shields.io/github/license/nineberg/dsh-plugin-island) ![Platform](https://img.shields.io/badge/DeepSeek%20Harness-plugin-0969da) ![GitHub stars](https://img.shields.io/github/stars/nineberg/dsh-plugin-island?style=social)

DeepSeek Harness Web GUI 的 **Dynamic-Island 风格插件启动器**：把侧栏插件图标拖进"灵动岛"收纳成启动芯片，一键重开面板；整座岛可在屏幕上自由拖动。

## 功能

- **收纳**：把任意侧栏插件图标拖到灵动岛上 → 变成启动芯片（最多常驻 5 个，多余的收进 `⋯` 弹层）
- **重开**：点击芯片直接打开对应中央面板
- **拖出**：把芯片从岛上拖出到桌面任意位置 → 广播 `plugin-island:eject` 事件，由插件自己的悬浮挂件（如 astock、vault-memory）在落点弹出独立悬浮球
- **增删**：`+` 弹层列出全部可用面板；`×` 从岛上移除
- **持久化**：芯片列表与岛位置存 localStorage，重启保留

## 配套生态

本岛定义了 `islandStandalone` 插件协议，以下插件开箱即用：

- [`dsh-plugin-stock-quotes`](https://github.com/nineberg/dsh-plugin-stock-quotes)（投资标的悬浮窗）
- [`dsh-plugin-obsidian-memory`](https://github.com/nineberg/dsh-plugin-obsidian-memory)（Obsidian 知识库悬浮球）

## 安装到 DeepSeek Harness

```powershell
# 在 harness 会话里让 agent 执行，或手动：
git clone https://github.com/nineberg/dsh-plugin-island.git
# 然后将仓库目录作为 bundle 安装进 dsh profile（dsh plugin add <路径>）
```

安装后刷新 Web GUI，把侧栏图标拖进屏幕上的灵动岛即可。

## 结构

| 文件 | 作用 |
|---|---|
| `client.js` | Client 半：灵动岛 UI（React），读取 `sidebar.panellist` 插槽、处理拖放与弹出事件广播 |
| `index.js` | Host 半：默认芯片配置等宿主侧声明 |
| `cordis.patch.yml` | 安装时插入的插件行 |

## License

[MIT](LICENSE) © nineberg
