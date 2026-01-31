"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BriefcaseIcon, PlusIcon, FileTextIcon } from "lucide-react";

import { orpc } from "@/lib/orpc";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PortfolioStats } from "./portfolio-stats";
import { PortfolioAllocationChart } from "./portfolio-allocation-chart";
import { PortfolioPerformanceChart } from "./portfolio-performance-chart";

export function DashboardContent() {
  const { data } = useSuspenseQuery(orpc.portfolio.dashboard.queryOptions());

  const portfolio = data?.portfolio;
  const holdings = data?.holdings ?? [];
  const performanceData = data?.performanceData ?? [];
  const metrics = data?.metrics ?? {
    totalValue: null,
    totalPurchaseValue: 0,
    totalGainLoss: null,
    totalGainLossPercent: null,
    holdingsCount: 0,
    bestPerformer: null,
    worstPerformer: null,
  };

  // Empty state - no portfolio exists
  if (!portfolio) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BriefcaseIcon />
            </EmptyMedia>
            <EmptyTitle>Create Your Portfolio</EmptyTitle>
            <EmptyDescription>
              Build your portfolio to see real-time analytics and insights
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="lg">
              <Link href="/dashboard/portfolio">
                <PlusIcon className="size-4" />
                Create Portfolio
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  // Portfolio exists - show dashboard
  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{portfolio.name}</h1>
          <p className="text-muted-foreground">Portfolio Overview</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/reports">
            <FileTextIcon className="size-4" />
            View Reports
          </Link>
        </Button>
      </div>

      {/* Stat Cards Grid */}
      <PortfolioStats metrics={metrics} isLoading={false} />

      {/* Charts Grid - Performance (60%) + Allocation (40%) */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <PortfolioPerformanceChart data={performanceData} isLoading={false} />
        <PortfolioAllocationChart
          holdings={holdings}
          totalValue={metrics.totalValue}
          isLoading={false}
        />
      </div>
    </div>
  );
}
