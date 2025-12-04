import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { EventCardSkeleton, EventListSkeleton } from '@/components/events/EventCardSkeleton'
import { CameraCardSkeleton, CameraGridSkeleton } from '@/components/cameras/CameraCardSkeleton'

describe('Skeleton', () => {
  it('should render with default styles', () => {
    const { container } = render(<Skeleton />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveClass('bg-slate-700', 'animate-pulse', 'rounded')
  })

  it('should render circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveClass('rounded-full')
  })

  it('should render text variant', () => {
    const { container } = render(<Skeleton variant="text" />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveClass('h-4')
  })

  it('should apply custom width and height', () => {
    const { container } = render(<Skeleton width={100} height={50} />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveStyle({ width: '100px', height: '50px' })
  })

  it('should disable animation when animate is false', () => {
    const { container } = render(<Skeleton animate={false} />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).not.toHaveClass('animate-pulse')
  })

  it('should have aria-hidden for accessibility', () => {
    const { container } = render(<Skeleton />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('SkeletonText', () => {
  it('should render single line by default', () => {
    const { container } = render(<SkeletonText />)
    const skeletons = container.querySelectorAll('[aria-hidden="true"]')
    expect(skeletons).toHaveLength(1)
  })

  it('should render multiple lines', () => {
    const { container } = render(<SkeletonText lines={3} />)
    const skeletons = container.querySelectorAll('[aria-hidden="true"]')
    expect(skeletons).toHaveLength(3)
  })
})

describe('EventCardSkeleton', () => {
  it('should render skeleton structure', () => {
    const { container } = render(<EventCardSkeleton />)
    expect(container.querySelector('.bg-slate-800')).toBeInTheDocument()
    expect(container.querySelector('.aspect-video')).toBeInTheDocument()
  })
})

describe('EventListSkeleton', () => {
  it('should render default 6 skeleton cards', () => {
    const { container } = render(<EventListSkeleton />)
    const cards = container.querySelectorAll('.aspect-video')
    expect(cards).toHaveLength(6)
  })

  it('should render custom count of skeleton cards', () => {
    const { container } = render(<EventListSkeleton count={3} />)
    const cards = container.querySelectorAll('.aspect-video')
    expect(cards).toHaveLength(3)
  })
})

describe('CameraCardSkeleton', () => {
  it('should render skeleton structure', () => {
    const { container } = render(<CameraCardSkeleton />)
    expect(container.querySelector('.aspect-video')).toBeInTheDocument()
    expect(container.querySelector('.bg-slate-800')).toBeInTheDocument()
  })
})

describe('CameraGridSkeleton', () => {
  it('should render default 4 skeleton cards', () => {
    const { container } = render(<CameraGridSkeleton />)
    const cards = container.querySelectorAll('.aspect-video')
    expect(cards).toHaveLength(4)
  })

  it('should render custom count of skeleton cards', () => {
    const { container } = render(<CameraGridSkeleton count={2} />)
    const cards = container.querySelectorAll('.aspect-video')
    expect(cards).toHaveLength(2)
  })
})
