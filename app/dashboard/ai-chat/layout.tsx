import { orpc } from "@/lib/orpc";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { ChatSidebar } from "./_componenets/chat-sidebar";

export default async function AIChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchInfiniteQuery(
      orpc.aiChat.list.infiniteOptions({
        input: (cursor: string | undefined) => ({ cursor }),
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      })
    ),
    queryClient.prefetchQuery(orpc.aiChat.models.queryOptions()),
  ]);

  return (
    <HydrateClient client={queryClient}>
      <div className="flex h-[calc(100vh-4rem)]  rounded-lg overflow-hidden border bg-background shadow-sm">
        <ChatSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </HydrateClient>
  );
}
