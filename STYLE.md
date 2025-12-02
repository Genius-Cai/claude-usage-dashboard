# Claude Usage Dashboard - Style Guide

## Design Philosophy

A modern, clean dashboard with excellent dark/light mode support, emphasizing data visibility and user experience.

---

## Color System

### Brand Colors

```css
/* Primary - Claude Purple */
--primary-light: #8B5CF6;
--primary-dark: #A78BFA;
--primary-hover: #7C3AED;
```

### Theme Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--background` | `#FFFFFF` | `#0A0A0A` | Page background |
| `--foreground` | `#0A0A0A` | `#FAFAFA` | Primary text |
| `--card` | `#FFFFFF` | `#171717` | Card background |
| `--card-border` | `#E5E7EB` | `#27272A` | Card borders |
| `--muted` | `#F4F4F5` | `#27272A` | Muted backgrounds |
| `--muted-foreground` | `#71717A` | `#A1A1AA` | Secondary text |

### Chart Colors

#### Light Mode
```css
--chart-primary: #8B5CF6;      /* Purple */
--chart-primary-fill: rgba(139, 92, 246, 0.5);
--chart-secondary: #3B82F6;    /* Blue */
--chart-tertiary: #10B981;     /* Green */
--chart-grid: #E5E7EB;
--chart-text: #6B7280;
```

#### Dark Mode (Higher Contrast)
```css
--chart-primary: #A78BFA;      /* Brighter Purple */
--chart-primary-fill: rgba(167, 139, 250, 0.7);
--chart-secondary: #60A5FA;    /* Brighter Blue */
--chart-tertiary: #34D399;     /* Brighter Green */
--chart-grid: #374151;
--chart-text: #9CA3AF;
```

### Status Colors

```css
/* Success - Usage OK */
--success: #22C55E;
--success-bg: rgba(34, 197, 94, 0.1);

/* Warning - Approaching Limit */
--warning: #F59E0B;
--warning-bg: rgba(245, 158, 11, 0.1);

/* Danger - Over Limit */
--danger: #EF4444;
--danger-bg: rgba(239, 68, 68, 0.1);

/* Info */
--info: #3B82F6;
--info-bg: rgba(59, 130, 246, 0.1);
```

---

## Typography

### Font Stack

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Scale

| Name | Size | Weight | Usage |
|------|------|--------|-------|
| `display` | 36px | 700 | Hero numbers |
| `h1` | 24px | 600 | Page titles |
| `h2` | 20px | 600 | Section titles |
| `h3` | 16px | 500 | Card titles |
| `body` | 14px | 400 | Body text |
| `small` | 12px | 400 | Labels, hints |
| `mono` | 14px | 500 | Numbers, code |

### Number Formatting

```typescript
// Currency
$12.45 USD
¥90.26 CNY

// Large Numbers
45,230 tokens
1.2M tokens
88K limit

// Percentages
38.5%
```

---

## Spacing

Based on 4px grid:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### Card Padding

- Desktop: `24px`
- Mobile: `16px`

### Grid Gap

- Cards: `16px` (mobile) / `24px` (desktop)
- Stats Grid: `12px`

---

## Components

### Cards

```css
/* Base Card */
border-radius: 12px;
border: 1px solid var(--card-border);
background: var(--card);
padding: 24px;
```

### Buttons

```css
/* Primary */
background: var(--primary);
color: white;
border-radius: 8px;
padding: 8px 16px;
font-weight: 500;

/* Ghost */
background: transparent;
color: var(--foreground);
```

### Progress Bars

```css
height: 8px;
border-radius: 4px;
background: var(--muted);

/* Indicator Colors */
< 50%: var(--success)
50-80%: var(--warning)
> 80%: var(--danger)
```

### Charts

#### Area Chart Guidelines
- Stroke width: `2.5px`
- Fill opacity (Light): `0.5 → 0.05` gradient
- Fill opacity (Dark): `0.7 → 0.1` gradient
- Grid: Dashed, horizontal only
- Axis labels: 12px, muted color

#### Tooltip
```css
background: var(--background);
border: 1px solid var(--border);
border-radius: 8px;
padding: 12px;
box-shadow: 0 4px 12px rgba(0,0,0,0.1);
```

---

## Animations

### Transitions

```css
/* Default */
transition: all 150ms ease;

/* Hover states */
transition: all 200ms ease;

/* Page transitions */
transition: all 300ms ease;
```

### Motion (Framer Motion)

```typescript
// Fade in
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
transition={{ duration: 0.2 }}

// Scale in (cards)
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}

// Slide up (lists)
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
```

---

## Responsive Breakpoints

```css
/* Mobile first */
sm: 640px   /* Large phones */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
```

### Layout Changes

| Breakpoint | Sidebar | Navigation | Grid Columns |
|------------|---------|------------|--------------|
| < 768px | Hidden | Bottom nav | 1 |
| 768px+ | Collapsed | Sidebar | 2 |
| 1024px+ | Expanded | Sidebar | 3-4 |

---

## Icons

Using **Lucide React** icons.

### Common Icons

| Icon | Usage |
|------|-------|
| `LayoutDashboard` | Dashboard |
| `BarChart3` | Statistics |
| `Clock` | Sessions |
| `Settings` | Settings |
| `DollarSign` | Cost |
| `Zap` | Tokens |
| `RefreshCw` | Refresh |
| `Sun` / `Moon` | Theme toggle |

### Size Guidelines

- Navigation: `20px`
- Cards: `16px`
- Buttons: `16px`
- Inline: `14px`

---

## Accessibility

### Contrast Ratios

- Text on background: ≥ 4.5:1
- Large text: ≥ 3:1
- UI components: ≥ 3:1

### Focus States

```css
outline: 2px solid var(--primary);
outline-offset: 2px;
```

### Motion

- Respect `prefers-reduced-motion`
- Provide static fallbacks

---

## File Naming

```
components/
├── ui/              # Primitive components (kebab-case)
│   └── button.tsx
├── dashboard/       # Feature components (kebab-case)
│   └── cost-card.tsx
├── charts/          # Chart components
│   └── usage-trend.tsx
└── layout/          # Layout components
    └── sidebar.tsx
```

---

## Code Style

### TypeScript

```typescript
// Props interface
interface ComponentProps {
  value: number;
  onChange?: (value: number) => void;
  className?: string;
}

// Default exports for pages
export default function Page() {}

// Named exports for components
export function Component() {}
```

### CSS/Tailwind

```tsx
// Use cn() for conditional classes
className={cn(
  "base-classes",
  condition && "conditional-classes",
  className
)}

// Group related classes
className="
  flex items-center gap-2
  px-4 py-2
  bg-card rounded-lg border
  hover:bg-muted transition-colors
"
```
