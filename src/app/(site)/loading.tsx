import { Skeleton } from "@/components/ui/misc";

export default function SiteLoading() {
  return (
    <div className="container-page flex flex-col gap-6 py-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-64" />
        ))}
      </div>
    </div>
  );
}
