import { orpc } from "@/lib/orpc";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { ReportDetail } from "./_components/report-detail";

type ReportDetailPageProps = {
  params: Promise<{ reportId: string }>;
};

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { reportId } = await params;
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(
    orpc.report.get.queryOptions({ input: { reportId } })
  );

  return (
    <HydrateClient client={queryClient}>
      <ReportDetail reportId={reportId} />
    </HydrateClient>
  );
}
