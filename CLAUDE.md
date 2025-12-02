# Claude Usage Dashboard - Project Context

## Overview

A modern web dashboard for monitoring Claude Code usage, built with Next.js 16 (App Router) and FastAPI. Provides real-time usage tracking, cost analysis, and visual statistics for Claude AI API consumption.

**GitHub**: https://github.com/Genius-Cai/claude-usage-dashboard

## Current Status (Dec 2024)

### Working Features
- **Dashboard Home**: Real-time stats, usage trends, model distribution, token breakdown
- **Plan Usage Card**: Accurate data from `analyze_usage()` matching CLI output
- **Session Timer**: Countdown with progress bar using plan-usage API
- **Statistics Page**: Historical data with date range selection and CSV export
- **Settings Page**: Plan, currency, timezone, theme, notifications configuration
- **WebSocket**: Real-time updates with 10-second broadcast interval
- **PWA**: Installable on iOS/Android

### Known Issues
- Sessions page could benefit from performance optimization
- Project statistics endpoint returns empty (needs project path extraction)

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router) with TypeScript
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **State Management**: Zustand (persisted to localStorage)
- **Data Fetching**: TanStack Query v5 (30-60 second cache)
- **Animations**: Framer Motion
- **PWA**: next-pwa
- **Theme**: next-themes (system/light/dark)

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Data Source**: claude-monitor v3.1.0+ package
- **Session Calculation**: Uses `analyze_usage()` for proper session blocks
- **Real-time**: WebSocket with ConnectionManager
- **Caching**: In-memory cache with 10-second TTL

### Deployment
- Docker Compose with Nginx reverse proxy
- Tailscale/Cloudflare tunnel support
- Data sync scripts for Mac → Server

## Project Structure

```
claude-usage-dashboard/
├── src/                          # Frontend source
│   ├── app/                      # Next.js App Router pages
│   │   ├── layout.tsx            # Root layout with providers
│   │   ├── page.tsx              # Dashboard (Overview/Analytics/Models tabs)
│   │   ├── sessions/page.tsx     # Session management
│   │   ├── settings/page.tsx     # User preferences
│   │   └── statistics/page.tsx   # Historical analytics
│   ├── components/
│   │   ├── ui/                   # shadcn/ui (Button, Card, Tabs, etc.)
│   │   ├── charts/               # UsageTrendChart, ModelDistribution, TokenBreakdown
│   │   ├── dashboard/            # StatsCard, SessionTimer, PlanUsageCard, PlanSelector
│   │   ├── layout/               # AppLayout, Sidebar, Header, MobileNav
│   │   └── providers/            # ThemeProvider, QueryProvider
│   ├── hooks/
│   │   ├── use-usage-data.ts     # TanStack Query hooks for all data
│   │   └── use-websocket.ts      # WebSocket connection management
│   ├── stores/
│   │   └── settings-store.ts     # Zustand store (plan, currency, theme, etc.)
│   ├── lib/
│   │   ├── api.ts                # API client with retry logic
│   │   └── utils.ts              # cn() helper
│   └── types/
│       └── index.ts              # All TypeScript types (40+)
├── backend/
│   └── app/
│       ├── main.py               # FastAPI app with lifespan
│       ├── core/config.py        # Pydantic Settings
│       ├── routers/
│       │   ├── usage.py          # /api/usage/* endpoints
│       │   ├── stats.py          # /api/stats/* endpoints
│       │   └── websocket.py      # /ws/realtime WebSocket
│       ├── services/
│       │   └── data_service.py   # Bridge to claude-monitor
│       └── models/
│           └── schemas.py        # Pydantic response models
├── docker/                       # Docker Compose files
├── scripts/                      # sync-data.sh, setup-tunnel.sh
├── public/                       # PWA icons, manifest
├── Makefile                      # Build automation
├── STYLE.md                      # Design system reference
└── README.md                     # Project documentation
```

## API Endpoints

### Usage Routes (`/api/usage/`)
| Endpoint | Description |
|----------|-------------|
| `GET /realtime` | Real-time usage with session info |
| `GET /daily?date=YYYY-MM-DD` | Daily statistics |
| `GET /history?days=30` | Historical data (max 365 days) |
| `GET /plan-usage?plan=max20` | Plan usage vs limits (matches CLI) |

### Stats Routes (`/api/stats/`)
| Endpoint | Description |
|----------|-------------|
| `GET /models?days=30` | Usage breakdown by model |
| `GET /projects` | Usage by project (placeholder) |

### WebSocket (`/ws/realtime`)
- Broadcasts every 10 seconds
- Message types: `welcome`, `realtime_update`, `pong`, `error`
- Client commands: `ping`, `refresh`

### Health (`/health`)
- Returns: status, version, data_path_valid, details

## Key Implementation Details

### Session Calculation (IMPORTANT)
The backend uses `analyze_usage()` from claude-monitor for accurate session blocks:

```python
from claude_monitor.data.analysis import analyze_usage

data = analyze_usage(hours_back=10, data_path="~/.claude/projects")
for block in data["blocks"]:
    if block["isActive"]:
        # Use this block's data (costUSD, totalTokens, endTime)
```

This ensures dashboard data matches claude-monitor CLI output exactly.

### TanStack Query Keys
```typescript
queryKeys = {
  dashboard: () => ['dashboard'],
  stats: (period) => ['stats', period],
  currentSession: () => ['currentSession'],
  planUsage: () => ['planUsage'],
  planUsageRealtime: (plan) => ['planUsageRealtime', plan],
  usageByPeriod: (options) => ['usageByPeriod', options],
  usageByModel: (options) => ['usageByModel', options],
}
```

### Zustand Store State
```typescript
{
  plan: 'free' | 'pro' | 'max_5x' | 'max_20x',
  currency: 'USD' | 'CNY',
  timezone: string,
  theme: 'light' | 'dark' | 'system',
  notifications: { usageLimitWarning, sessionExpiry, dailySummary, warningThreshold },
  display: { compactMode, showCosts, showCharts, refreshInterval }
}
```

### Plan Configurations
```typescript
PLAN_CONFIGS = {
  free: { tokenLimit: 500_000, costLimit: 0, features: [...] },
  pro: { tokenLimit: 5_000_000, costLimit: 50, features: [...] },
  max_5x: { tokenLimit: 25_000_000, costLimit: 200, features: [...] },
  max_20x: { tokenLimit: 100_000_000, costLimit: 600, features: [...] }
}
```

## Development Commands

```bash
# Frontend
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint

# Backend (from /backend)
pip install -e .     # Install with claude-monitor
uvicorn app.main:app --reload --port 8000

# Both
make dev             # Start both servers
make install         # Install all deps
make docker-dev      # Docker development
```

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

### Backend (.env)
```env
CLAUDE_DATA_PATH=~/.claude/projects
CORS_ORIGINS=["http://localhost:3000"]
SESSION_WINDOW_HOURS=5
WEBSOCKET_BROADCAST_INTERVAL=10
LOG_LEVEL=INFO
DEBUG=False
```

## Code Conventions

- **TypeScript Strict Mode**: All code type-safe
- **Named Exports**: Components use named exports (except page.tsx)
- **Client Components**: Use `'use client'` directive for interactive components
- **Theme Awareness**: Charts and components adapt to light/dark mode
- **Edit Over Create**: Prefer editing existing files over creating new ones
- **Design System**: Follow STYLE.md for colors and spacing

## Recent Changes (Dec 2024)

1. Session timer now uses `usePlanUsageRealtime()` for accurate data
2. Plan-usage endpoint properly calls `analyze_usage()`
3. WebSocket authentication optional via `WEBSOCKET_API_KEY`
4. Added comprehensive README and README_CN documentation
5. Updated type definitions for PlanUsageResponse

## Common Tasks

### Add New API Endpoint
1. Add route in `backend/app/routers/`
2. Add schema in `backend/app/models/schemas.py`
3. Add service method in `backend/app/services/data_service.py`
4. Add frontend type in `src/types/index.ts`
5. Add API function in `src/lib/api.ts`
6. Add TanStack Query hook in `src/hooks/use-usage-data.ts`

### Add New Settings Option
1. Add to store state in `src/stores/settings-store.ts`
2. Add action method
3. Add selector hook
4. Add UI in `src/app/settings/page.tsx`

### Debug Data Issues
1. Check `/health` endpoint for data path validity
2. Check claude-monitor CLI: `claude-monitor status`
3. Check backend logs: `make logs-api`
4. Verify JSONL files exist in `~/.claude/projects/`
