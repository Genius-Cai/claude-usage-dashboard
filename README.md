# Claude Usage Dashboard

A modern, real-time web dashboard to monitor your Claude Code usage, costs, and sessions. Track your AI spending across different subscription plans with beautiful visualizations.

## Features

- **Real-time Usage Monitoring** - Track token usage and costs in USD/CNY
- **Multi-Plan Support** - Pro, Max5, Max20, and Custom plan configurations
- **Usage Analytics** - Historical trends, daily/weekly/monthly breakdowns
- **Session Timer** - 5-hour rolling window usage tracker
- **Cost Projections** - Estimate monthly costs based on current usage patterns
- **PWA Support** - Install on iOS/Android for native-like experience
- **Dark/Light Theme** - Automatic system theme detection
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - WebSocket support for live data refresh
- **Data Export** - Export usage data to CSV/JSON

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose (for containerized deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-usage-dashboard.git
cd claude-usage-dashboard

# Install dependencies
make install

# Start development servers (API + Web)
make dev

# Or start individually:
make dev-api   # Backend on http://localhost:8000
make dev-web   # Frontend on http://localhost:3000
```

### Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings
nano .env
```

## Docker Deployment

### Production Deployment

```bash
# Build production images
make build

# Deploy (starts all containers)
make deploy

# View logs
make logs

# Check status
make status

# Stop containers
make stop
```

### Development with Docker

```bash
# Start development environment with hot reload
make docker-dev

# Or run in background
make docker-dev-d
```

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| nginx | 80, 443 | Reverse proxy |
| web | 3000 | Next.js frontend |
| api | 8000 | FastAPI backend |

## Data Sync Setup (Mac to NUC)

If you're running Claude Code on your Mac and hosting the dashboard on a NUC (or other server), use the sync script to keep data updated.

### One-time Sync

```bash
# Configure remote settings in .env
REMOTE_USER=user
REMOTE_HOST=nuc.local
REMOTE_PATH=~/claude-data

# Run sync
make sync
# or
./scripts/sync-data.sh
```

### Automated Sync (Cron)

```bash
# Edit crontab
crontab -e

# Add sync every 5 minutes
*/5 * * * * /path/to/claude-usage-dashboard/scripts/sync-data.sh >> /var/log/claude-sync.log 2>&1
```

### Watch Mode

```bash
# Continuously sync every 5 minutes
./scripts/sync-data.sh watch
```

## Remote Access Setup

### Option 1: Tailscale (Recommended)

Best for personal/team use. Creates a private mesh VPN.

```bash
# Run setup script
make tunnel
# or
./scripts/setup-tunnel.sh tailscale

# Access from any Tailscale device
http://<tailscale-ip>
```

### Option 2: Cloudflare Tunnel

Best for public access with a custom domain.

```bash
./scripts/setup-tunnel.sh cloudflare

# Access via your domain
https://claude.yourdomain.com
```

## Architecture

```
                                    +------------------+
                                    |   iPhone/Browser |
                                    +--------+---------+
                                             |
                                    +--------v---------+
                                    |    Tailscale/    |
                                    |    Cloudflare    |
                                    +--------+---------+
                                             |
+-------------------+               +--------v---------+
|   Mac (Claude)    |   rsync/SSH   |   NUC Server     |
|                   | ------------> |                  |
| ~/.claude/projects|               | +-------------+  |
+-------------------+               | |   Docker    |  |
                                    | | +---------+ |  |
                                    | | |  nginx  | |  |
                                    | | +----+----+ |  |
                                    | |      |      |  |
                                    | | +----v----+ |  |
                                    | | |   web   | |  |
                                    | | | Next.js | |  |
                                    | | +----+----+ |  |
                                    | |      |      |  |
                                    | | +----v----+ |  |
                                    | | |   api   | |  |
                                    | | | FastAPI | |  |
                                    | | +---------+ |  |
                                    | +-------------+  |
                                    +------------------+
```

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Charts**: Recharts
- **State**: Zustand + TanStack Query

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Data**: File-based (Claude project files)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Tunneling**: Tailscale / Cloudflare Tunnel

## Project Structure

```
claude-usage-dashboard/
├── src/                    # Next.js source code
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/               # Utilities and hooks
│   └── styles/            # Global styles
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── main.py       # FastAPI application
│   │   ├── routers/      # API routes
│   │   └── services/     # Business logic
│   └── Dockerfile
├── docker/                # Docker configuration
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── nginx.conf
├── scripts/               # Utility scripts
│   ├── sync-data.sh      # Data sync script
│   └── setup-tunnel.sh   # Tunnel setup
├── public/                # Static assets
├── Dockerfile             # Production Dockerfile
├── Dockerfile.dev         # Development Dockerfile
├── Makefile              # Build automation
└── README.md
```

## Makefile Commands

```bash
# Development
make dev          # Start all dev servers
make dev-api      # Start API only
make dev-web      # Start web only
make install      # Install dependencies

# Docker
make docker-dev   # Start Docker dev environment
make build        # Build production images
make deploy       # Deploy to production
make stop         # Stop containers
make restart      # Restart containers
make logs         # View logs
make status       # Check container status

# Utilities
make sync         # Sync data to remote
make tunnel       # Setup tunnel

# Code Quality
make lint         # Run linter
make format       # Format code
make test         # Run tests
make check        # Run all checks

# Cleanup
make clean        # Clean all artifacts
make clean-docker # Clean Docker resources
make clean-deps   # Reinstall dependencies

# Help
make help         # Show all commands
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | API endpoint |
| `CLAUDE_DATA_PATH` | `~/.claude/projects` | Claude data directory |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed origins |
| `LOG_LEVEL` | `info` | Logging level |
| `NGINX_HTTP_PORT` | `80` | HTTP port |
| `NGINX_HTTPS_PORT` | `443` | HTTPS port |

See `.env.example` for full list.

## Troubleshooting

### Container Health Check Fails

```bash
# Check container logs
make logs-api
make logs-web
make logs-nginx

# Restart specific service
docker compose -f docker/docker-compose.yml restart api
```

### Data Sync Issues

```bash
# Check connectivity
./scripts/sync-data.sh status

# View sync log
tail -f ~/.claude-sync.log
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :8000

# Kill process
kill -9 <PID>
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Claude](https://www.anthropic.com/claude) by Anthropic
- [Next.js](https://nextjs.org/) by Vercel
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
