import { Skeleton } from '@/components/ui/Skeleton'

interface CameraCardSkeletonProps {
  className?: string
}

export function CameraCardSkeleton({ className = '' }: CameraCardSkeletonProps): JSX.Element {
  return (
    <div className={`relative aspect-video bg-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Video area skeleton */}
      <Skeleton className="absolute inset-0" />

      {/* Overlay skeleton - mimics CameraOverlay structure */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top gradient with name */}
        <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/60 to-transparent">
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Bottom gradient with status */}
        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" width={8} height={8} />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CameraGridSkeleton({ count = 4 }: { count?: number }): JSX.Element {
  // Determine grid columns based on count
  const gridClass =
    count <= 1
      ? 'grid-cols-1'
      : count <= 4
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <CameraCardSkeleton key={i} />
      ))}
    </div>
  )
}
