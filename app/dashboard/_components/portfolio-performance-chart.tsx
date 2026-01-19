"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";

type PerformanceDataPoint = {
  date: string;
  portfolioValue: number;
  purchaseValue: number;
};

type PortfolioPerformanceChartProps = {
  data: PerformanceDataPoint[];
  isLoading?: boolean;
};

const chartConfig = {
  portfolioValue: {
    label: "Portfolio Value",
    color: "hsl(142.1 76.2% 36.3%)", // Green for gains
  },
  purchaseValue: {
    label: "Purchase Value",
    color: "hsl(var(--muted-foreground))", // Gray for baseline
  },
} satisfies ChartConfig;

export function PortfolioPerformanceChart({
  data,
  isLoading = false,
}: PortfolioPerformanceChartProps) {
  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
          <CardDescription>Portfolio value since purchase</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
          <CardDescription>Portfolio value since purchase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No performance data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Performance Over Time</CardTitle>
        <CardDescription>Portfolio value since purchase</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <defs>
              <linearGradient id="fillPortfolioValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-portfolioValue)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-portfolioValue)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillPurchaseValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-purchaseValue)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-purchaseValue)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                  formatter={(value) => formatCurrency(value as number)}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="purchaseValue"
              type="natural"
              fill="url(#fillPurchaseValue)"
              stroke="var(--color-purchaseValue)"
              stackId="a"
            />
            <Area
              dataKey="portfolioValue"
              type="natural"
              fill="url(#fillPortfolioValue)"
              stroke="var(--color-portfolioValue)"
              stackId="b"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
