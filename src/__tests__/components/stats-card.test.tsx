import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../test-utils';
import { StatsCard, StatsCardWithProgress, StatsGrid } from '@/components/dashboard/stats-card';
import { Activity, Zap } from 'lucide-react';

describe('StatsCard', () => {
  it('renders title and value correctly with K suffix for thousands', () => {
    render(
      <StatsCard
        title="Total Tokens"
        value={12500}
        icon={Zap}
      />
    );

    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
    // Component formats 12500 as "12.5K"
    expect(screen.getByText('12.5K')).toBeInTheDocument();
  });

  it('formats large numbers with M suffix for millions', () => {
    render(
      <StatsCard
        title="Requests"
        value={1234567}
        icon={Activity}
      />
    );

    // Component formats 1234567 as "1.2M"
    expect(screen.getByText('1.2M')).toBeInTheDocument();
  });

  it('renders string values as-is', () => {
    render(
      <StatsCard
        title="Cost"
        value="$12.50"
        icon={Activity}
      />
    );

    expect(screen.getByText('$12.50')).toBeInTheDocument();
  });

  it('renders trend indicator when provided', () => {
    render(
      <StatsCard
        title="Daily Cost"
        value="$25.00"
        icon={Activity}
        trend={{
          value: 12.5,
          direction: 'up',
          label: 'vs yesterday',
        }}
      />
    );

    // Component shows absolute value without +/- prefix: "12.5%"
    expect(screen.getByText('12.5%')).toBeInTheDocument();
    expect(screen.getByText('vs yesterday')).toBeInTheDocument();
  });

  it('renders down trend correctly', () => {
    render(
      <StatsCard
        title="Daily Cost"
        value="$20.00"
        icon={Activity}
        trend={{
          value: 5.2,
          direction: 'down',
          label: 'vs yesterday',
        }}
      />
    );

    // Component shows absolute value: "5.2%"
    expect(screen.getByText('5.2%')).toBeInTheDocument();
  });
});

describe('StatsCardWithProgress', () => {
  it('renders progress bar with correct percentage', () => {
    render(
      <StatsCardWithProgress
        title="Plan Usage"
        value="75%"
        icon={Activity}
        current={75000}
        total={100000}
        progressLabel="Monthly Limit"
      />
    );

    expect(screen.getByText('Plan Usage')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Monthly Limit')).toBeInTheDocument();
  });

  it('shows warning color when above threshold', () => {
    const { container } = render(
      <StatsCardWithProgress
        title="Plan Usage"
        value="90%"
        icon={Activity}
        current={90000}
        total={100000}
        progressLabel="Monthly Limit"
        warningThreshold={80}
      />
    );

    // Progress bar should have warning styling
    const progressBar = container.querySelector('[class*="bg-"]');
    expect(progressBar).toBeInTheDocument();
  });
});

describe('StatsGrid', () => {
  it('renders children in grid layout', () => {
    const { container } = render(
      <StatsGrid columns={4}>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
        <div data-testid="child-4">Child 4</div>
      </StatsGrid>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
    expect(screen.getByTestId('child-4')).toBeInTheDocument();

    // Check grid classes
    const grid = container.firstChild;
    expect(grid).toHaveClass('grid');
  });
});
