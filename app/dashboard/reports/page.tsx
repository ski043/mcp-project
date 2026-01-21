import { orpc } from "@/lib/orpc";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { ReportsList } from "./_components/reports-list";

export default async function ReportsPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(orpc.report.list.queryOptions());

  return (
    <HydrateClient client={queryClient}>
      <ReportsList />
    </HydrateClient>
  );
}
