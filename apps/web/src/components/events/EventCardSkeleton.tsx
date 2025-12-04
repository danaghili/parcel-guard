import { Skeleton } from '@/components/ui/Skeleton'

interface EventCardSkeletonProps {
  className?: string
}

export function EventCardSkeleton({ className = '' }: EventCardSkeletonProps): JSX.Element {
  return (
    <div className={`bg-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Thumbnail skeleton */}
      <Skeleton className="aspect-video w-full" />

      {/* Event info skeleton */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

export function EventListSkeleton({ count = 6 }: { count?: number }): JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  )
}
