import { PropertyCardSkeleton } from "@/components/properties/property-card";
import { Skeleton } from "@/components/ui/misc";

export default function PropertiesLoading() {
  return (
    <div className="container-page flex flex-col gap-6 py-8" aria-busy="true" aria-label="Loading properties">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Skeleton className="hidden h-[600px] lg:block" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-full" />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <PropertyCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
