[![make.fun](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
![rank](https://make.fun/badge/token-radar-01/fenghen233-debug/token-radar/rank.svg)
![reward](https://make.fun/badge/token-radar-01/fenghen233-debug/token-radar/reward.svg)

# Token Radar

Token Radar 是针对 [make.fun token-radar-01 Bounty](https://make.fun/bounty/token-radar-01) 开发的未发币协议雷达系统。项目读取密封的 DefiLlama 快照数据（包含 758 个协议及 40 个观察名单），通过多因子隐含估值模型进行综合评估，产出包含 250 个未发币协议按隐含估值排名的看板 `board.json`、离线静态仪表盘 `dashboard` 和符合比赛规范的 `dossier.json`，且看板中的每一行协议均带有定制化的空投攻略步骤（farm steps）。

## 核心特性

- **数据源解析**：严格解析并验证密封 DefiLlama 快照（758 个协议），确保 40 个观察名单协议 100% 完整覆盖并优先纳入排榜。
- **隐含估值模型**：
  - 基于同类目已发币协议的市值与 TVL 中位数基准（Category Median Mcap/TVL Ratio）。
  - 结合 7 天 TVL 动量乘数（Momentum Multiplier）、协议存活期成熟度乘数（Maturity Multiplier）以及多链生态乘数（Chain Multiplier）。
  - 使用确定性 FNV-1a 字符串哈希微扰（< 0.1%）进行严格的平局打破，确保排名单调且无并列冲突。
- **空投交互攻略**：为全部排榜协议生成针对性的交互指导（涵盖借贷、DEX、跨链桥、流动性质押、衍生品、金库策略等多种赛道），包含预计耗时与预估 Gas/资金成本。
- **离线仪表盘**：暗色主题现代化前端界面，支持实时关键字搜索、分类过滤、多链筛选、观察名单快速切换以及交互弹窗查看详情。
- **极简依赖与确定性**：仅依赖 Node.js 标准库，无外部 npm 依赖，两次运行生成的结果保证字节一致。

## 运行方式

环境要求：**Node 22 以上**，仅使用 Node.js 标准库，零外部依赖直接运行 TypeScript。

执行命令：

```bash
node main.ts --input 快照路径
```

- 输出到 `MAKEFUN_OUTPUT_DIR` 环境变量所指目录（默认 `/output`），也可通过 `--output` 显式指定。
- 两次运行字节一致：在相同输入快照下，多次运行输出的 `board.json`、`data.js` 及 `dossier.json` 保持完全一致。

示例：

```bash
MAKEFUN_OUTPUT_DIR=./output node main.ts --input /path/to/snapshot.json
```

## 仓库结构

- `main.ts`：入口，负责命令行参数解析、读取并校验快照、调用模型评分、验证看板规范、复制仪表盘与截图，并生成 `dossier.json`。
- `lib/model.ts`：模型，实现快照解析、未发币协议筛选、隐含估值多因子计算、确定性平局打破及空投攻略步骤生成。
- `dashboard/`：静态仪表盘，包含暗色主题前端界面的 HTML、CSS、JavaScript 离线静态资源。
- `screenshots/`：截图，包含仪表盘主看板视图、协议详情弹窗视图及筛选视图。
- `vendor/`：为比赛 kit 的 harness，包含 `vendor/makefun-board.ts`，用于 dossier 构建与评分验证。

## License

MIT see LICENSE
