"use client";

import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboardIcon,
  MessageSquare,
  FileText,
  Box,
} from "lucide-react";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { orpc } from "@/lib/orpc";

const navMainItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Chat",
    url: "/dashboard/ai-chat",
    icon: MessageSquare,
  },
  {
    title: "Reports",
    url: "/dashboard/reports",
    icon: FileText,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user } = useSuspenseQuery(orpc.user.current.queryOptions());

  return (
    <Sidebar collapsible="offExamples" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard" className="flex items-center gap-3 ">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                  <Box
                    className="size-4 text-primary-foreground"
                    strokeWidth={2.5}
                  />
                </div>
                <span className="text-base font-semibold">
                  <span className="text-primary">MCP</span>Marshal
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} navItems={navMainItems} />
      </SidebarFooter>
    </Sidebar>
  );
}
