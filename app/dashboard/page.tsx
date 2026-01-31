import { Suspense } from "react";

import { orpc } from "@/lib/orpc";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { DashboardContent } from "./_components/dashboard-content";
import { DashboardLoading } from "./_components/dashboard-loading";

export default async function DashboardPage() {
  const queryClient = getQueryClient();

  // Don't await - stream the response so loading skeleton shows immediately
  queryClient.prefetchQuery(orpc.portfolio.dashboard.queryOptions());

  return (
    <HydrateClient client={queryClient}>
      <Suspense fallback={<DashboardLoading />}>
        <DashboardContent />
      </Suspense>
    </HydrateClient>
  );
}
