import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Package,
} from "lucide-react";
import { PortfolioStatCard } from "./portfolio-stat-card";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/format";

type PortfolioStatsProps = {
  metrics: {
    totalValue: number | null;
    totalPurchaseValue: number;
    totalGainLoss: number | null;
    totalGainLossPercent: number | null;
    holdingsCount: number;
  };
  isLoading?: boolean;
};

export function PortfolioStats({ metrics, isLoading = false }: PortfolioStatsProps) {
  const trend =
    metrics.totalGainLoss === null
      ? "neutral"
      : metrics.totalGainLoss >= 0
      ? "up"
      : "down";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <PortfolioStatCard
        title="Total Value"
        value={formatCurrency(metrics.totalValue)}
        icon={DollarSign}
        trend={trend}
        isLoading={isLoading}
      />

      <PortfolioStatCard
        title="Total Return"
        value={formatCurrency(metrics.totalGainLoss)}
        subtitle={`${formatCurrency(metrics.totalPurchaseValue)} invested`}
        icon={trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : DollarSign}
        trend={trend}
        isLoading={isLoading}
      />

      <PortfolioStatCard
        title="Return %"
        value={formatPercent(metrics.totalGainLossPercent)}
        subtitle="Since purchase"
        icon={Percent}
        trend={trend}
        isLoading={isLoading}
      />

      <PortfolioStatCard
        title="Holdings"
        value={formatNumber(metrics.holdingsCount)}
        subtitle={`${metrics.holdingsCount} ${
          metrics.holdingsCount === 1 ? "stock" : "stocks"
        }`}
        icon={Package}
        trend="neutral"
        isLoading={isLoading}
      />
    </div>
  );
}
