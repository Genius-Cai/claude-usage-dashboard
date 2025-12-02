# Claude Usage Dashboard

<p align="center">
  <img src="public/icons/logo.png" alt="Claude Usage Dashboard" height="60" />
</p>

<p align="center">
  <strong>A modern, real-time web dashboard to monitor your Claude Code usage, costs, and sessions.</strong>
</p>

<p align="center">
  <a href="https://claude-usage-dashboard.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Demo-Visit-blue?style=for-the-badge&logo=vercel" alt="Live Demo" />
  </a>
  &nbsp;
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/Genius-Cai/claude-usage-dashboard&env=NEXT_PUBLIC_USE_MOCK_DATA&envDescription=Set%20to%20true%20for%20demo%20mode&envLink=https://github.com/Genius-Cai/claude-usage-dashboard#demo-mode">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" />
  </a>
</p>

<p align="center">
  <a href="#features">Features</a> |
  <a href="#live-demo">Live Demo</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#api-reference">API Reference</a> |
  <a href="#deployment">Deployment</a> |
  <a href="README_CN.md">中文文档</a>
</p>

---

## Features

### Real-Time Monitoring
- **Live Usage Tracking** - Token consumption and costs updated in real-time via WebSocket
- **Session Timer** - 5-hour rolling window countdown with visual progress
- **Burn Rate** - Tokens/minute and cost/hour metrics
- **Plan Limits** - Usage percentage against Pro/Max5/Max20 plan limits

### Analytics & Visualization
- **Usage Trends** - Interactive charts for daily/weekly/monthly patterns
- **Model Distribution** - Pie charts showing usage across Claude models (Opus, Sonnet, Haiku)
- **Token Breakdown** - Input/Output/Cache token visualization
- **Historical Data** - Up to 365 days of usage history

### User Experience
- **Multi-Currency** - Display costs in USD or CNY with custom exchange rates
- **Dark/Light Theme** - Automatic system theme detection
- **PWA Support** - Install on iOS/Android for native-like experience
- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **Data Export** - Export usage data to CSV

### Configuration
- **Plan Selection** - Free, Pro, Max 5x, Max 20x tiers
- **18+ Timezones** - Localized time display
- **Notification Settings** - Usage warnings, session expiry alerts
- **Display Preferences** - Compact mode, refresh intervals

---

## Live Demo

**Try the dashboard instantly** - no backend required!

**[View Live Demo](https://claude-usage-dashboard.vercel.app)**

The demo runs entirely in your browser using mock data, showcasing all features:
- Real-time usage tracking simulation
- Interactive charts and visualizations
- Session timer with countdown
- Dark/Light theme toggle
- Plan usage statistics

---

## Demo Mode

You can run the dashboard in demo mode without a backend:

```bash
# Using environment variable
NEXT_PUBLIC_USE_MOCK_DATA=true npm run dev
```

Or set in `.env.local`:
```env
NEXT_PUBLIC_USE_MOCK_DATA=true
```

### One-Click Deploy

Deploy your own demo instance to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Genius-Cai/claude-usage-dashboard&env=NEXT_PUBLIC_USE_MOCK_DATA&envDescription=Set%20to%20true%20for%20demo%20mode&envLink=https://github.com/Genius-Cai/claude-usage-dashboard#demo-mode)

**Environment Variables for Demo:**
| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_USE_MOCK_DATA` | `true` | Enable demo mode with mock data |

---

## Screenshots

| Dashboard | Sessions | Statistics |
|-----------|----------|------------|
| Real-time metrics with charts | 5-hour window visualization | Historical data analysis |

---

## Quick Start

### Prerequisites

- **Node.js** 20+ (for frontend)
- **Python** 3.10+ (for backend)
- **claude-monitor** package (v3.1.0+)
- Docker & Docker Compose (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/Genius-Cai/claude-usage-dashboard.git
cd claude-usage-dashboard

# Install all dependencies
make install

# Start development servers
make dev
```

**Access the dashboard:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Environment Setup

```bash
# Copy example environment file
cp .env.example .env.local

# Required variables
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

For the backend:
```bash
cd backend
cp .env.example .env

# Configure data path (default: ~/.claude/projects)
CLAUDE_DATA_PATH=~/.claude/projects
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| TypeScript | Type safety |
| Tailwind CSS v4 | Utility-first styling |
| shadcn/ui | Accessible UI components |
| TanStack Query v5 | Data fetching & caching |
| Zustand | State management |
| Recharts | Data visualization |
| Framer Motion | Animations |
| next-pwa | PWA support |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | High-performance API framework |
| Python 3.10+ | Backend runtime |
| Pydantic | Data validation |
| claude-monitor | Usage data parsing |
| WebSocket | Real-time updates |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Nginx | Reverse proxy |
| Tailscale/Cloudflare | Secure tunneling |

---

## Project Structure

```
claude-usage-dashboard/
├── src/                          # Next.js frontend
│   ├── app/                      # App Router pages
│   │   ├── page.tsx              # Dashboard (Overview, Analytics, Models)
│   │   ├── sessions/             # Session management
│   │   ├── statistics/           # Historical analytics
│   │   └── settings/             # User preferences
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── charts/               # Recharts visualizations
│   │   ├── dashboard/            # Stats cards, timers, selectors
│   │   └── layout/               # App shell, sidebar, header
│   ├── hooks/                    # TanStack Query hooks
│   ├── stores/                   # Zustand state
│   ├── lib/                      # API client, utilities
│   └── types/                    # TypeScript definitions
├── backend/                      # FastAPI backend
│   └── app/
│       ├── main.py               # Application entry
│       ├── core/config.py        # Settings management
│       ├── routers/              # API endpoints
│       │   ├── usage.py          # Usage data routes
│       │   ├── stats.py          # Statistics routes
│       │   └── websocket.py      # Real-time updates
│       ├── services/             # Business logic
│       └── models/               # Pydantic schemas
├── docker/                       # Docker configuration
├── scripts/                      # Utility scripts
├── public/                       # Static assets & PWA icons
├── Makefile                      # Build automation
└── CLAUDE.md                     # AI assistant context
```

---

## API Reference

### Usage Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/usage/realtime` | GET | Real-time usage with session info |
| `/api/usage/daily?date=YYYY-MM-DD` | GET | Daily statistics |
| `/api/usage/history?days=30` | GET | Historical data (max 365 days) |
| `/api/usage/plan-usage?plan=max20` | GET | Plan usage vs limits |

### Statistics Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats/models?days=30` | GET | Usage by model |
| `/api/stats/projects` | GET | Usage by project |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `WS /ws/realtime` | Real-time data stream (10s interval) |

**Message Types:**
- `welcome` - Connection acknowledgment
- `realtime_update` - Usage data broadcast
- `pong` - Heartbeat response
- `error` - Error notification

### Health Check

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health status |

---

## Deployment

### Docker Production

```bash
# Build images
make build

# Deploy
make deploy

# View logs
make logs

# Stop
make stop
```

### Docker Development

```bash
# Start with hot reload
make docker-dev
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| nginx | 80/443 | Reverse proxy |
| web | 3000 | Next.js frontend |
| api | 8000 | FastAPI backend |

### Remote Access

**Option 1: Tailscale (Recommended for personal use)**
```bash
make tunnel
# Access: http://<tailscale-ip>
```

**Option 2: Cloudflare Tunnel (For public access)**
```bash
./scripts/setup-tunnel.sh cloudflare
# Access: https://your-domain.com
```

---

## Data Sync (Mac to Server)

If running Claude Code on Mac and dashboard on a server:

```bash
# Configure in .env
REMOTE_USER=user
REMOTE_HOST=server.local
REMOTE_PATH=~/claude-data

# Manual sync
make sync

# Automated (crontab)
*/5 * * * * /path/to/scripts/sync-data.sh
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser/PWA)                     │
│         Next.js + Zustand + TanStack Query + WebSocket      │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP / WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                      │
│                      (Port 80/443)                          │
├─────────────────────────────────────────────────────────────┤
│  /         → Next.js Frontend (3000)                        │
│  /api      → FastAPI Backend (8000)                         │
│  /ws       → WebSocket (8000)                               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                         │
│           Routers → DataService → claude-monitor            │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  ~/.claude/projects/                        │
│                    (Usage JSONL files)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

### Frontend (.env.local)
| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000/ws` | WebSocket URL |

### Backend (.env)
| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_DATA_PATH` | `~/.claude/projects` | Claude data directory |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins |
| `SESSION_WINDOW_HOURS` | `5` | Rolling session window |
| `WEBSOCKET_BROADCAST_INTERVAL` | `10` | Broadcast interval (seconds) |
| `LOG_LEVEL` | `INFO` | Logging level |
| `DEBUG` | `False` | Debug mode |

---

## Makefile Commands

```bash
# Development
make dev          # Start all dev servers
make dev-api      # Start API only
make dev-web      # Start web only
make install      # Install dependencies

# Docker
make docker-dev   # Development with Docker
make build        # Build production images
make deploy       # Deploy containers
make stop         # Stop containers
make logs         # View logs

# Utilities
make sync         # Sync data to remote
make tunnel       # Setup tunnel
make lint         # Run linter
make clean        # Clean artifacts
```

---

## Troubleshooting

### API Connection Failed
```bash
# Check backend is running
curl http://localhost:8000/health

# Check logs
make logs-api
```

### Data Not Loading
```bash
# Verify Claude data path exists
ls ~/.claude/projects/

# Check data service
python -c "from claude_monitor.data.reader import load_usage_entries; print(len(load_usage_entries()))"
```

### WebSocket Disconnecting
- Check `WEBSOCKET_BROADCAST_INTERVAL` setting
- Verify CORS origins include your frontend URL
- Check browser console for connection errors

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Claude](https://www.anthropic.com/claude) by Anthropic
- [claude-monitor](https://github.com/Genius-Cai/claude-monitor) - Usage data parsing
- [Next.js](https://nextjs.org/) by Vercel
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful components
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework

