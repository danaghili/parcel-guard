import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../src/App'

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
    expect(screen.getByText('Enter your PIN to continue')).toBeInTheDocument()
  })
})
