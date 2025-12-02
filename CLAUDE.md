# Claude Usage Dashboard - Project Context

## Overview

A modern web dashboard for monitoring Claude Code usage, built with Next.js and FastAPI. Provides real-time usage tracking, cost analysis, and visual statistics for Claude AI API consumption.

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router) with TypeScript
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **State Management**: Zustand
- **Data Fetching**: TanStack Query v5
- **Animations**: Framer Motion
- **PWA**: next-pwa (installable on iOS/Android)
- **Theme**: next-themes (system/light/dark)

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Data Source**: claude-monitor package (reads ~/.claude/projects/**/*.jsonl)
- **Real-time**: WebSocket support

### Deployment
- Docker Compose with nginx reverse proxy
- Designed for home server deployment (NUC12 Pro)

## Project Structure

```
claude-usage-dashboard/
├── src/                          # Frontend source
│   ├── app/                      # Next.js App Router pages
│   │   ├── layout.tsx            # Root layout with providers
│   │   ├── page.tsx              # Dashboard home
│   │   ├── sessions/             # Session history
│   │   ├── settings/             # User settings
│   │   └── statistics/           # Detailed statistics
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── charts/               # Recharts visualizations
│   │   ├── dashboard/            # Dashboard-specific components
│   │   ├── layout/               # App layout (sidebar, header)
│   │   └── providers/            # React context providers
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utilities and API client
│   ├── stores/                   # Zustand stores
│   └── types/                    # TypeScript type definitions
├── backend/                      # FastAPI backend
│   └── app/
│       ├── main.py               # FastAPI app entry
│       ├── core/config.py        # Settings/configuration
│       ├── models/schemas.py     # Pydantic models
│       ├── routers/              # API endpoints
│       │   ├── usage.py          # Usage data endpoints
│       │   ├── stats.py          # Statistics endpoints
│       │   └── websocket.py      # Real-time updates
│       └── services/
│           └── data_service.py   # Data layer (uses claude-monitor)
├── docker/                       # Docker configuration
├── public/                       # Static assets & PWA icons
└── STYLE.md                      # Design system reference
```

## Key Features

1. **Real-time Dashboard**: Live usage metrics with WebSocket updates
2. **Multi-period Views**: Filter by year, month, day
3. **Plan Selection**: Pro/Max Tier 1-5 with custom limits
4. **Cost Tracking**: USD and CNY display with exchange rate
5. **Visual Analytics**: Usage trends, token breakdown, model distribution
6. **Session History**: Track individual coding sessions
7. **Theme Support**: System/Light/Dark modes
8. **PWA**: Install as native app on iOS/Android

## Development Commands

```bash
# Frontend
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint

# Backend (from /backend directory)
pip install -e .     # Install dependencies
uvicorn app.main:app --reload --port 8000
```

## Data Source

Usage data is read from `~/.claude/projects/` directory structure:
- Each project has a `.jsonl` file with usage entries
- Entry fields: timestamp, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, cost_usd, model

## API Endpoints

- `GET /api/v1/usage/summary` - Usage summary with period filter
- `GET /api/v1/usage/by-period` - Time-series usage data
- `GET /api/v1/usage/by-model` - Usage breakdown by model
- `GET /api/v1/stats/today` - Today's statistics
- `GET /api/v1/stats/session` - Current session info
- `WS /api/v1/ws` - Real-time updates

## Code Conventions

- Follow STYLE.md for design patterns and colors
- Use TypeScript strict mode
- Components use named exports (except pages)
- Prefer editing existing files over creating new ones
- Theme-aware colors for charts (see usage-trend.tsx)

## Environment Variables

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend (.env)
CLAUDE_DIR=~/.claude
CORS_ORIGINS=http://localhost:3000
```
