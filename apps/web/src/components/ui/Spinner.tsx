interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps): JSX.Element {
  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${className}
        animate-spin rounded-full
        border-2 border-slate-600
        border-t-primary-500
      `}
      role="status"
      aria-label="Loading"
    />
  )
}
