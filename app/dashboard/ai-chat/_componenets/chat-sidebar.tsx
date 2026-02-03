"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { orpc } from "@/lib/orpc";

type Chat = Awaited<ReturnType<typeof orpc.aiChat.list.call>>["chats"][number];

type DateGroup = {
  label: string;
  chats: Chat[];
};

function groupChatsByDate(chats: Chat[]): DateGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: DateGroup[] = [
    { label: "Today", chats: [] },
    { label: "Yesterday", chats: [] },
    { label: "Last 7 days", chats: [] },
    { label: "Last 30 days", chats: [] },
    { label: "Older", chats: [] },
  ];

  for (const chat of chats) {
    const chatDate = new Date(chat.createdAt);
    if (chatDate >= today) {
      groups[0].chats.push(chat);
    } else if (chatDate >= yesterday) {
      groups[1].chats.push(chat);
    } else if (chatDate >= lastWeek) {
      groups[2].chats.push(chat);
    } else if (chatDate >= lastMonth) {
      groups[3].chats.push(chat);
    } else {
      groups[4].chats.push(chat);
    }
  }

  return groups.filter((g) => g.chats.length > 0);
}

export function ChatSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data: chatsData,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery(
    orpc.aiChat.list.infiniteOptions({
      input: (cursor: string | undefined) => ({ cursor }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    })
  );

  // Infinite scroll detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetching) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetching, fetchNextPage]);

  const createChatMutation = useMutation(
    orpc.aiChat.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: orpc.aiChat.list.key(),
        });
        router.push(`/dashboard/ai-chat/${data.chat.id}`);
      },
    })
  );

  const updateChatMutation = useMutation(
    orpc.aiChat.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.aiChat.list.key(),
        });
        setEditingChatId(null);
      },
    })
  );

  const deleteChatMutation = useMutation(
    orpc.aiChat.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.aiChat.list.key(),
        });
        if (pathname.includes(chatToDelete || "")) {
          router.push("/dashboard/ai-chat");
        }
        setChatToDelete(null);
        setDeleteDialogOpen(false);
      },
    })
  );

  // Flatten all pages and filter based on search query (client-side)
  const allChats = chatsData?.pages.flatMap((page) => page.chats) ?? [];
  const filteredChats = searchQuery
    ? allChats.filter((chat) =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : allChats;

  const groupedChats = groupChatsByDate(filteredChats);
  const currentChatId = pathname.split("/").pop();

  if (isCollapsed) {
    return (
      <div className="w-12 border-r bg-muted/30 flex flex-col items-center py-2 gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsCollapsed(false)}
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => createChatMutation.mutate({})}
          disabled={createChatMutation.isPending}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-2 flex items-center gap-2 border-b">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => createChatMutation.mutate({})}
            disabled={createChatMutation.isPending}
          >
            <Plus className="size-4" />
            New chat
          </Button>
        </div>

        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {groupedChats.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? "No chats found" : "No chats yet"}
            </div>
          ) : (
            <>
              {groupedChats.map((group) => (
                <div key={group.label} className="py-2">
                  <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </div>
                  {group.chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={cn(
                        "group flex items-center gap-2 px-2 py-1.5 mx-1 rounded-md hover:bg-accent/50 cursor-pointer",
                        currentChatId === chat.id && "bg-accent"
                      )}
                    >
                      {editingChatId === chat.id ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => {
                            if (editTitle.trim() && editTitle !== chat.title) {
                              updateChatMutation.mutate({
                                chatId: chat.id,
                                title: editTitle.trim(),
                              });
                            } else {
                              setEditingChatId(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            } else if (e.key === "Escape") {
                              setEditingChatId(null);
                            }
                          }}
                          className="h-6 text-sm"
                          autoFocus
                        />
                      ) : (
                        <>
                          <Link
                            href={`/dashboard/ai-chat/${chat.id}`}
                            className="flex-1 flex items-center gap-2 min-w-0"
                          >
                            <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm">
                              {chat.title}
                            </span>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="opacity-0 group-hover:opacity-100 size-6"
                              >
                                <MoreHorizontal className="size-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditTitle(chat.title);
                                  setEditingChatId(chat.id);
                                }}
                              >
                                <Pencil className="size-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setChatToDelete(chat.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* Infinite scroll sentinel - always render if more pages exist */}
          {hasNextPage && <div ref={loadMoreRef} className="h-1" />}

          {/* Loading indicator */}
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Fallback load more button */}
          {hasNextPage && !isFetchingNextPage && (
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => fetchNextPage()}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              chat and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                chatToDelete &&
                deleteChatMutation.mutate({ chatId: chatToDelete })
              }
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
