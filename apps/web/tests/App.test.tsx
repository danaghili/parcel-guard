import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../src/App'

describe('App', () => {
  it('should render the dashboard', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )

    expect(screen.getByText('ParcelGuard')).toBeInTheDocument()
    expect(screen.getByText('Multi-camera security system')).toBeInTheDocument()
  })
})
