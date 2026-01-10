"use client";

type ChatHeaderProps = {
  title: string;
};

export function ChatHeader({ title }: ChatHeaderProps) {
  return (
    <div className="flex h-14 shrink-0 items-center border-b px-4">
      <h1 className="truncate text-sm font-medium">{title}</h1>
    </div>
  );
}
