import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider, useToast } from '@/contexts/ToastContext'
import { ToastContainer } from '@/components/ui/ToastContainer'

function TestComponent(): JSX.Element {
  const toast = useToast()
  return (
    <div>
      <button onClick={() => toast.success('Success message')}>Show Success</button>
      <button onClick={() => toast.error('Error message')}>Show Error</button>
      <button onClick={() => toast.info('Info message')}>Show Info</button>
      <button onClick={() => toast.warning('Warning message')}>Show Warning</button>
    </div>
  )
}

function renderWithToast(): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <TestComponent />
      <ToastContainer />
    </ToastProvider>
  )
}

describe('Toast System', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should show success toast when triggered', () => {
    renderWithToast()

    fireEvent.click(screen.getByText('Show Success'))

    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveClass('bg-green-600')
  })

  it('should show error toast when triggered', () => {
    renderWithToast()

    fireEvent.click(screen.getByText('Show Error'))

    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveClass('bg-red-600')
  })

  it('should show info toast when triggered', () => {
    renderWithToast()

    fireEvent.click(screen.getByText('Show Info'))

    expect(screen.getByText('Info message')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveClass('bg-blue-600')
  })

  it('should show warning toast when triggered', () => {
    renderWithToast()

    fireEvent.click(screen.getByText('Show Warning'))

    expect(screen.getByText('Warning message')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveClass('bg-yellow-500')
  })

  it('should auto-dismiss toast after duration', () => {
    renderWithToast()

    fireEvent.click(screen.getByText('Show Success'))
    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Fast-forward past the default 5s duration
    act(() => {
      vi.advanceTimersByTime(5500)
    })

    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('should dismiss toast when clicking dismiss button', () => {
    renderWithToast()

    fireEvent.click(screen.getByText('Show Success'))
    expect(screen.getByText('Success message')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Dismiss notification'))

    // Wait for exit animation
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('should display multiple toasts', () => {
    renderWithToast()

    fireEvent.click(screen.getByText('Show Success'))
    fireEvent.click(screen.getByText('Show Error'))

    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('should throw error when useToast is used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useToast must be used within a ToastProvider')

    consoleError.mockRestore()
  })
})
