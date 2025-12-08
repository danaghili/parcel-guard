import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../src/App'

// Mock window.matchMedia for ThemeContext
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('App', () => {
  it('should render the login screen when not authenticated', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )

    // Wait for lazy-loaded Login component to render
    await waitFor(() => {
      expect(screen.getByText('ParcelGuard')).toBeInTheDocument()
    })
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument()
  })
})
