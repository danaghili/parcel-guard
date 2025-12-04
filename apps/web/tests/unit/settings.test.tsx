import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

import { PinChangeModal } from '../../src/components/settings/PinChangeModal'
import { ThemeToggle } from '../../src/components/settings/ThemeToggle'

// Mock window.matchMedia
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

// Mock the API
vi.mock('../../src/lib/api', () => ({
  settingsApi: {
    updatePin: vi.fn(),
    update: vi.fn(),
  },
}))

import { settingsApi } from '../../src/lib/api'

describe('PinChangeModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(<PinChangeModal isOpen={false} onClose={mockOnClose} />)
    expect(screen.queryByText('Change PIN')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(<PinChangeModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByRole('heading', { name: 'Change PIN' })).toBeInTheDocument()
  })

  it('should show current PIN, new PIN, and confirm PIN fields', () => {
    render(<PinChangeModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText('Current PIN')).toBeInTheDocument()
    expect(screen.getByText('New PIN')).toBeInTheDocument()
    expect(screen.getByText('Confirm New PIN')).toBeInTheDocument()
  })

  it('should show error when PINs do not match', async () => {
    render(<PinChangeModal isOpen={true} onClose={mockOnClose} />)

    const inputs = screen.getAllByPlaceholderText('••••')
    fireEvent.change(inputs[0]!, { target: { value: '1234' } })
    fireEvent.change(inputs[1]!, { target: { value: '5678' } })
    fireEvent.change(inputs[2]!, { target: { value: '9999' } })

    fireEvent.click(screen.getByRole('button', { name: /change pin/i }))

    await waitFor(() => {
      expect(screen.getByText('New PINs do not match')).toBeInTheDocument()
    })
  })

  it('should show error when new PIN is same as current', async () => {
    render(<PinChangeModal isOpen={true} onClose={mockOnClose} />)

    const inputs = screen.getAllByPlaceholderText('••••')
    fireEvent.change(inputs[0]!, { target: { value: '1234' } })
    fireEvent.change(inputs[1]!, { target: { value: '1234' } })
    fireEvent.change(inputs[2]!, { target: { value: '1234' } })

    fireEvent.click(screen.getByRole('button', { name: /change pin/i }))

    await waitFor(() => {
      expect(screen.getByText('New PIN must be different from current PIN')).toBeInTheDocument()
    })
  })

  it('should show error for invalid PIN format', async () => {
    render(<PinChangeModal isOpen={true} onClose={mockOnClose} />)

    const inputs = screen.getAllByPlaceholderText('••••')
    fireEvent.change(inputs[0]!, { target: { value: '12' } }) // Too short
    fireEvent.change(inputs[1]!, { target: { value: '5678' } })
    fireEvent.change(inputs[2]!, { target: { value: '5678' } })

    fireEvent.click(screen.getByRole('button', { name: /change pin/i }))

    await waitFor(() => {
      expect(screen.getByText('Current PIN must be 4-8 digits')).toBeInTheDocument()
    })
  })

  it('should call API and show success on valid submission', async () => {
    vi.mocked(settingsApi.updatePin).mockResolvedValue(undefined)

    render(<PinChangeModal isOpen={true} onClose={mockOnClose} />)

    const inputs = screen.getAllByPlaceholderText('••••')
    fireEvent.change(inputs[0]!, { target: { value: '1234' } })
    fireEvent.change(inputs[1]!, { target: { value: '5678' } })
    fireEvent.change(inputs[2]!, { target: { value: '5678' } })

    fireEvent.click(screen.getByRole('button', { name: /change pin/i }))

    await waitFor(() => {
      expect(settingsApi.updatePin).toHaveBeenCalledWith('1234', '5678')
      expect(screen.getByText('PIN Changed')).toBeInTheDocument()
    })
  })

  it('should call onClose when Cancel is clicked', () => {
    render(<PinChangeModal isOpen={true} onClose={mockOnClose} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should only allow numeric input', () => {
    render(<PinChangeModal isOpen={true} onClose={mockOnClose} />)

    const inputs = screen.getAllByPlaceholderText('••••')
    fireEvent.change(inputs[0]!, { target: { value: 'abc123def' } })

    // The value should only contain digits
    expect(inputs[0]!).toHaveValue('123')
  })
})

describe('ThemeToggle', () => {
  const mockOnSettingsChange = vi.fn()
  const defaultSettings = {
    retentionDays: 30,
    theme: 'system' as const,
    notificationsEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    notificationCooldown: 60,
    onboardingComplete: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render theme options', () => {
    render(
      <BrowserRouter>
        <ThemeToggle settings={defaultSettings} onSettingsChange={mockOnSettingsChange} />
      </BrowserRouter>
    )

    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('should highlight current theme selection', () => {
    const settings = { ...defaultSettings, theme: 'dark' as const }
    render(
      <BrowserRouter>
        <ThemeToggle settings={settings} onSettingsChange={mockOnSettingsChange} />
      </BrowserRouter>
    )

    const darkButton = screen.getByText('Dark').closest('button')
    expect(darkButton).toHaveClass('border-blue-500')
  })

  it('should call API when theme is changed', async () => {
    vi.mocked(settingsApi.update).mockResolvedValue({
      ...defaultSettings,
      theme: 'dark' as const,
    })

    render(
      <BrowserRouter>
        <ThemeToggle settings={defaultSettings} onSettingsChange={mockOnSettingsChange} />
      </BrowserRouter>
    )

    fireEvent.click(screen.getByText('Dark'))

    await waitFor(() => {
      expect(settingsApi.update).toHaveBeenCalledWith({ theme: 'dark' })
    })
  })

  it('should call onSettingsChange with updated settings', async () => {
    const updatedSettings = { ...defaultSettings, theme: 'dark' as const }
    vi.mocked(settingsApi.update).mockResolvedValue(updatedSettings)

    render(
      <BrowserRouter>
        <ThemeToggle settings={defaultSettings} onSettingsChange={mockOnSettingsChange} />
      </BrowserRouter>
    )

    fireEvent.click(screen.getByText('Dark'))

    await waitFor(() => {
      expect(mockOnSettingsChange).toHaveBeenCalledWith(updatedSettings)
    })
  })
})
