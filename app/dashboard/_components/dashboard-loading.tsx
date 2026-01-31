import { PortfolioStats } from "./portfolio-stats";
import { PortfolioAllocationChart } from "./portfolio-allocation-chart";
import { PortfolioPerformanceChart } from "./portfolio-performance-chart";

const defaultMetrics = {
  totalValue: null,
  totalPurchaseValue: 0,
  totalGainLoss: null,
  totalGainLossPercent: null,
  holdingsCount: 0,
  bestPerformer: null,
  worstPerformer: null,
};

export function DashboardLoading() {
  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      <PortfolioStats metrics={defaultMetrics} isLoading={true} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <PortfolioPerformanceChart data={[]} isLoading={true} />
        <PortfolioAllocationChart
          holdings={[]}
          totalValue={null}
          isLoading={true}
        />
      </div>
    </div>
  );
}
