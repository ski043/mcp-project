"use client";

import { Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

type Holding = {
  ticker: string;
  currentValue: number | null;
  gainLossPercent: number | null;
};

type PortfolioAllocationChartProps = {
  holdings: Holding[];
  totalValue: number | null;
  isLoading?: boolean;
};

export function PortfolioAllocationChart({
  holdings,
  totalValue,
  isLoading = false,
}: PortfolioAllocationChartProps) {
  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Portfolio Allocation</CardTitle>
          <CardDescription>
            Current value distribution across holdings
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center h-[250px]">
            <Skeleton className="h-[250px] w-[250px] rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter valid holdings with prices
  const validHoldings = holdings.filter(
    (h) => h.currentValue !== null && h.currentValue > 0
  );

  if (validHoldings.length === 0 || !totalValue) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Portfolio Allocation</CardTitle>
          <CardDescription>
            Current value distribution across holdings
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            <p>No holdings to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data with fill colors using var(--color-ticker)
  const chartData = validHoldings.map((holding) => ({
    ticker: holding.ticker,
    value: holding.currentValue ?? 0,
    fill: `var(--color-${holding.ticker.toLowerCase()})`,
  }));

  // Build chart config with proper color mapping
  const chartConfig: ChartConfig = {
    value: {
      label: "Value",
    },
    ...validHoldings.reduce((config, holding, index) => {
      const colorVar = `--chart-${(index % 5) + 1}`;
      config[holding.ticker.toLowerCase()] = {
        label: holding.ticker,
        color: `var(${colorVar})`,
      };
      return config;
    }, {} as ChartConfig),
  } satisfies ChartConfig;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Portfolio Allocation</CardTitle>
        <CardDescription>
          Current value distribution across holdings
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto  max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="ticker"
              label={({ payload }) => {
                const percentage = ((payload.value / totalValue) * 100).toFixed(1);
                return `${payload.ticker} ${percentage}%`;
              }}
              labelLine
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
