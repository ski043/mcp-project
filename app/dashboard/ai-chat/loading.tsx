import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        {/* Icon */}
        <Skeleton className="mx-auto size-16 rounded-full" />

        {/* Title and description */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 mx-auto" />
          <Skeleton className="h-5 w-72 mx-auto" />
          <Skeleton className="h-5 w-48 mx-auto" />
        </div>

        {/* Button */}
        <Skeleton className="h-11 w-40 mx-auto" />

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-4 pt-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-muted/50 space-y-2">
              <Skeleton className="size-5 mx-auto" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
