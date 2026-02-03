import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SiteHeader } from "@/components/sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { orpc } from "@/lib/orpc";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(orpc.user.current.queryOptions());

  return (
    <SidebarProvider
      className="h-svh"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <HydrateClient client={queryClient}>
        <AppSidebar variant="inset" />
      </HydrateClient>
      <SidebarInset className="min-h-0">
        <SiteHeader />
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <div className="@container/main flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
            <div className="flex flex-1 min-h-0 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 overflow-hidden">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
