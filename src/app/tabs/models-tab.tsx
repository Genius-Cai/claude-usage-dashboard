'use client';

/**
 * Models Tab Component
 * Shows model usage breakdown with detailed statistics
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ModelDistributionChart } from '@/components/charts/model-distribution';
import { useUsageByModel } from '@/hooks/use-usage-data';
import { useSettingsStore } from '@/stores/settings-store';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function ModelsTab() {
  const { formatCurrency } = useSettingsStore();

  // Fetch model data - only when this tab is mounted
  const { data: usageByModel = [] } = useUsageByModel();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {usageByModel.map((model) => (
          <motion.div
            key={model.model}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="rounded-lg border p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu
                  className="h-5 w-5"
                  style={{ color: model.color }}
                />
                <span className="font-medium">
                  {model.modelDisplayName}
                </span>
              </div>
              <Badge variant="secondary">
                {(model.percentage ?? 0).toFixed(0)}%
              </Badge>
            </div>

            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${model.percentage ?? 0}%`,
                  backgroundColor: model.color,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tokens</span>
                <p className="font-medium">
                  {((model.tokens?.totalTokens ?? 0) / 1000).toFixed(1)}K
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Cost</span>
                <p className="font-medium">
                  {formatCurrency(model.cost?.totalCost ?? 0)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Input</span>
                <p className="font-medium">
                  {((model.tokens?.inputTokens ?? 0) / 1000).toFixed(1)}K
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Output</span>
                <p className="font-medium">
                  {((model.tokens?.outputTokens ?? 0) / 1000).toFixed(1)}K
                </p>
              </div>
            </div>

            <div className="pt-2 border-t text-sm text-muted-foreground">
              {model.requestCount} requests
            </div>
          </motion.div>
        ))}
      </div>

      <ModelDistributionChart
        data={usageByModel}
        title="Cost Distribution by Model"
        metric="cost"
      />
    </div>
  );
}
