# Claude 使用量仪表盘

<p align="center">
  <img src="public/icons/logo.svg" alt="Claude Usage Dashboard" width="100" />
</p>

<p align="center">
  <strong>一个现代化的实时 Web 仪表盘，用于监控 Claude Code 的使用量、费用和会话。</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> |
  <a href="#快速开始">快速开始</a> |
  <a href="#api-参考">API 参考</a> |
  <a href="#部署指南">部署指南</a> |
  <a href="README.md">English</a>
</p>

---

## 功能特性

### 实时监控
- **实时使用量追踪** - 通过 WebSocket 实时更新 Token 消耗和费用
- **会话计时器** - 5 小时滚动窗口倒计时，带可视化进度条
- **消耗速率** - Token/分钟 和 费用/小时 指标
- **套餐限额** - 显示 Pro/Max5/Max20 套餐的使用百分比

### 数据分析与可视化
- **使用趋势** - 每日/每周/每月模式的交互式图表
- **模型分布** - 展示各 Claude 模型(Opus, Sonnet, Haiku)使用占比的饼图
- **Token 分解** - 输入/输出/缓存 Token 可视化
- **历史数据** - 最多 365 天的使用历史

### 用户体验
- **多货币支持** - 支持美元或人民币显示，可自定义汇率
- **深色/浅色主题** - 自动检测系统主题
- **PWA 支持** - 可安装到 iOS/Android，获得原生应用体验
- **响应式设计** - 适配桌面、平板和手机
- **数据导出** - 导出使用数据为 CSV

### 配置选项
- **套餐选择** - Free、Pro、Max 5x、Max 20x 四种套餐
- **18+ 时区** - 本地化时间显示
- **通知设置** - 使用量警告、会话过期提醒
- **显示偏好** - 紧凑模式、刷新间隔

---

## 截图预览

| 仪表盘 | 会话管理 | 统计分析 |
|--------|----------|----------|
| 实时指标与图表 | 5小时窗口可视化 | 历史数据分析 |

---

## 快速开始

### 环境要求

- **Node.js** 20+ (前端)
- **Python** 3.10+ (后端)
- **claude-monitor** 包 (v3.1.0+)
- Docker & Docker Compose (可选，用于容器化部署)

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/Genius-Cai/claude-usage-dashboard.git
cd claude-usage-dashboard

# 安装所有依赖
make install

# 启动开发服务器
make dev
```

**访问地址:**
- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

### 环境配置

```bash
# 复制环境变量示例文件
cp .env.example .env.local

# 必要变量
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

后端配置:
```bash
cd backend
cp .env.example .env

# 配置数据路径 (默认: ~/.claude/projects)
CLAUDE_DATA_PATH=~/.claude/projects
```

---

## 技术栈

### 前端
| 技术 | 用途 |
|------|------|
| Next.js 16 | React 框架 (App Router) |
| TypeScript | 类型安全 |
| Tailwind CSS v4 | 原子化 CSS |
| shadcn/ui | 无障碍 UI 组件 |
| TanStack Query v5 | 数据获取与缓存 |
| Zustand | 状态管理 |
| Recharts | 数据可视化 |
| Framer Motion | 动画效果 |
| next-pwa | PWA 支持 |

### 后端
| 技术 | 用途 |
|------|------|
| FastAPI | 高性能 API 框架 |
| Python 3.10+ | 后端运行时 |
| Pydantic | 数据验证 |
| claude-monitor | 使用数据解析 |
| WebSocket | 实时更新 |

### 基础设施
| 技术 | 用途 |
|------|------|
| Docker | 容器化 |
| Nginx | 反向代理 |
| Tailscale/Cloudflare | 安全隧道 |

---

## 项目结构

```
claude-usage-dashboard/
├── src/                          # Next.js 前端
│   ├── app/                      # App Router 页面
│   │   ├── page.tsx              # 仪表盘 (概览、分析、模型)
│   │   ├── sessions/             # 会话管理
│   │   ├── statistics/           # 历史统计
│   │   └── settings/             # 用户设置
│   ├── components/
│   │   ├── ui/                   # shadcn/ui 组件
│   │   ├── charts/               # Recharts 图表
│   │   ├── dashboard/            # 统计卡片、计时器、选择器
│   │   └── layout/               # 应用外壳、侧边栏、头部
│   ├── hooks/                    # TanStack Query hooks
│   ├── stores/                   # Zustand 状态
│   ├── lib/                      # API 客户端、工具函数
│   └── types/                    # TypeScript 类型定义
├── backend/                      # FastAPI 后端
│   └── app/
│       ├── main.py               # 应用入口
│       ├── core/config.py        # 配置管理
│       ├── routers/              # API 端点
│       │   ├── usage.py          # 使用量路由
│       │   ├── stats.py          # 统计路由
│       │   └── websocket.py      # 实时更新
│       ├── services/             # 业务逻辑
│       └── models/               # Pydantic 模型
├── docker/                       # Docker 配置
├── scripts/                      # 工具脚本
├── public/                       # 静态资源 & PWA 图标
├── Makefile                      # 构建自动化
└── CLAUDE.md                     # AI 助手上下文
```

---

## API 参考

### 使用量端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/usage/realtime` | GET | 实时使用量及会话信息 |
| `/api/usage/daily?date=YYYY-MM-DD` | GET | 每日统计 |
| `/api/usage/history?days=30` | GET | 历史数据 (最多 365 天) |
| `/api/usage/plan-usage?plan=max20` | GET | 套餐使用量与限额 |

### 统计端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/stats/models?days=30` | GET | 按模型统计 |
| `/api/stats/projects` | GET | 按项目统计 |

### WebSocket

| 端点 | 描述 |
|------|------|
| `WS /ws/realtime` | 实时数据流 (10秒间隔) |

**消息类型:**
- `welcome` - 连接确认
- `realtime_update` - 使用数据广播
- `pong` - 心跳响应
- `error` - 错误通知

### 健康检查

| 端点 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 服务健康状态 |

---

## 部署指南

### Docker 生产部署

```bash
# 构建镜像
make build

# 部署
make deploy

# 查看日志
make logs

# 停止
make stop
```

### Docker 开发环境

```bash
# 启动热重载开发环境
make docker-dev
```

### 服务列表

| 服务 | 端口 | 描述 |
|------|------|------|
| nginx | 80/443 | 反向代理 |
| web | 3000 | Next.js 前端 |
| api | 8000 | FastAPI 后端 |

### 远程访问

**方案一: Tailscale (推荐个人使用)**
```bash
make tunnel
# 访问: http://<tailscale-ip>
```

**方案二: Cloudflare Tunnel (公网访问)**
```bash
./scripts/setup-tunnel.sh cloudflare
# 访问: https://your-domain.com
```

---

## 数据同步 (Mac 到服务器)

如果在 Mac 上运行 Claude Code，仪表盘部署在服务器上:

```bash
# 在 .env 中配置
REMOTE_USER=user
REMOTE_HOST=server.local
REMOTE_PATH=~/claude-data

# 手动同步
make sync

# 自动同步 (crontab)
*/5 * * * * /path/to/scripts/sync-data.sh
```

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    客户端 (浏览器/PWA)                       │
│         Next.js + Zustand + TanStack Query + WebSocket      │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP / WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx 反向代理                            │
│                      (端口 80/443)                          │
├─────────────────────────────────────────────────────────────┤
│  /         → Next.js 前端 (3000)                            │
│  /api      → FastAPI 后端 (8000)                            │
│  /ws       → WebSocket (8000)                               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI 后端                            │
│           Routers → DataService → claude-monitor            │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  ~/.claude/projects/                        │
│                    (使用量 JSONL 文件)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 环境变量

### 前端 (.env.local)
| 变量 | 默认值 | 描述 |
|------|--------|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | 后端 API 地址 |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000/ws` | WebSocket 地址 |

### 后端 (.env)
| 变量 | 默认值 | 描述 |
|------|--------|------|
| `CLAUDE_DATA_PATH` | `~/.claude/projects` | Claude 数据目录 |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | 允许的 CORS 源 |
| `SESSION_WINDOW_HOURS` | `5` | 滚动会话窗口 |
| `WEBSOCKET_BROADCAST_INTERVAL` | `10` | 广播间隔 (秒) |
| `LOG_LEVEL` | `INFO` | 日志级别 |
| `DEBUG` | `False` | 调试模式 |

---

## Makefile 命令

```bash
# 开发
make dev          # 启动所有开发服务器
make dev-api      # 仅启动 API
make dev-web      # 仅启动前端
make install      # 安装依赖

# Docker
make docker-dev   # Docker 开发环境
make build        # 构建生产镜像
make deploy       # 部署容器
make stop         # 停止容器
make logs         # 查看日志

# 工具
make sync         # 同步数据到远程
make tunnel       # 设置隧道
make lint         # 运行代码检查
make clean        # 清理构建产物
```

---

## 故障排除

### API 连接失败
```bash
# 检查后端是否运行
curl http://localhost:8000/health

# 查看日志
make logs-api
```

### 数据未加载
```bash
# 验证 Claude 数据路径存在
ls ~/.claude/projects/

# 检查数据服务
python -c "from claude_monitor.data.reader import load_usage_entries; print(len(load_usage_entries()))"
```

### WebSocket 断开连接
- 检查 `WEBSOCKET_BROADCAST_INTERVAL` 设置
- 验证 CORS 源包含前端 URL
- 检查浏览器控制台错误信息

---

## 参与贡献

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)

---

## 致谢

- [Claude](https://www.anthropic.com/claude) by Anthropic
- [claude-monitor](https://github.com/Genius-Cai/claude-monitor) - 使用数据解析
- [Next.js](https://nextjs.org/) by Vercel
- [shadcn/ui](https://ui.shadcn.com/) - 精美组件库
- [FastAPI](https://fastapi.tiangolo.com/) - 后端框架

