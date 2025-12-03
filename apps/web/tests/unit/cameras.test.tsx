import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

import { AddCameraModal } from '../../src/components/cameras/AddCameraModal'
import { DeleteConfirmModal } from '../../src/components/ui/DeleteConfirmModal'

// Mock the API
vi.mock('../../src/lib/api', () => ({
  camerasApi: {
    testStream: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  },
}))

import { camerasApi } from '../../src/lib/api'

describe('DeleteConfirmModal', () => {
  const mockOnConfirm = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(
      <DeleteConfirmModal
        isOpen={false}
        title="Delete Camera"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.queryByText('Delete Camera')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(
      <DeleteConfirmModal
        isOpen={true}
        title="Delete Camera"
        message="Are you sure you want to delete this camera?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Delete Camera')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete this camera?')).toBeInTheDocument()
  })

  it('should call onCancel when Cancel button is clicked', () => {
    render(
      <DeleteConfirmModal
        isOpen={true}
        title="Delete Camera"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('should call onConfirm when Delete button is clicked', () => {
    render(
      <DeleteConfirmModal
        isOpen={true}
        title="Delete Camera"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    fireEvent.click(screen.getByText('Delete'))
    expect(mockOnConfirm).toHaveBeenCalledTimes(1)
  })

  it('should use custom confirm label', () => {
    render(
      <DeleteConfirmModal
        isOpen={true}
        title="Remove Item"
        message="Are you sure?"
        confirmLabel="Remove"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Remove')).toBeInTheDocument()
  })

  it('should disable buttons when isDeleting is true', () => {
    render(
      <DeleteConfirmModal
        isOpen={true}
        title="Delete Camera"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isDeleting={true}
      />
    )

    expect(screen.getByText('Cancel')).toBeDisabled()
    expect(screen.getByText('Delete')).toBeDisabled()
  })
})

describe('AddCameraModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(
      <BrowserRouter>
        <AddCameraModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </BrowserRouter>
    )

    expect(screen.queryByText('Add Camera')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(
      <BrowserRouter>
        <AddCameraModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </BrowserRouter>
    )

    expect(screen.getByText('Add Camera')).toBeInTheDocument()
    expect(screen.getByText('Stream URL')).toBeInTheDocument()
  })

  it('should show stream URL input on first step', () => {
    render(
      <BrowserRouter>
        <AddCameraModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </BrowserRouter>
    )

    expect(screen.getByPlaceholderText(/rtsp:\/\/camera/)).toBeInTheDocument()
    expect(screen.getByText('Test Connection')).toBeInTheDocument()
  })

  it('should disable test button when URL is empty', () => {
    render(
      <BrowserRouter>
        <AddCameraModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </BrowserRouter>
    )

    expect(screen.getByText('Test Connection')).toBeDisabled()
  })

  it('should enable test button when URL is entered', () => {
    render(
      <BrowserRouter>
        <AddCameraModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </BrowserRouter>
    )

    const input = screen.getByPlaceholderText(/rtsp:\/\/camera/)
    fireEvent.change(input, { target: { value: 'rtsp://test:8554/stream' } })

    expect(screen.getByText('Test Connection')).not.toBeDisabled()
  })

  it('should show error when stream test fails', async () => {
    vi.mocked(camerasApi.testStream).mockResolvedValue({
      accessible: false,
      error: 'Connection refused',
    })

    render(
      <BrowserRouter>
        <AddCameraModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </BrowserRouter>
    )

    const input = screen.getByPlaceholderText(/rtsp:\/\/camera/)
    fireEvent.change(input, { target: { value: 'rtsp://test:8554/stream' } })
    fireEvent.click(screen.getByText('Test Connection'))

    await waitFor(() => {
      expect(screen.getByText('Connection refused')).toBeInTheDocument()
    })
  })

  it('should advance to details step when stream test succeeds', async () => {
    vi.mocked(camerasApi.testStream).mockResolvedValue({
      accessible: true,
      latency: 50,
    })

    render(
      <BrowserRouter>
        <AddCameraModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </BrowserRouter>
    )

    const input = screen.getByPlaceholderText(/rtsp:\/\/camera/)
    fireEvent.change(input, { target: { value: 'rtsp://test:8554/stream' } })
    fireEvent.click(screen.getByText('Test Connection'))

    await waitFor(() => {
      expect(screen.getByText('Camera ID')).toBeInTheDocument()
      expect(screen.getByText('Camera Name')).toBeInTheDocument()
    })
  })

  it('should create camera and call onSuccess when form is submitted', async () => {
    vi.mocked(camerasApi.testStream).mockResolvedValue({
      accessible: true,
      latency: 50,
    })
    vi.mocked(camerasApi.create).mockResolvedValue({
      id: 'test-cam',
      name: 'Test Camera',
      streamUrl: 'rtsp://test:8554/stream',
      status: 'offline',
      lastSeen: null,
    })

    render(
      <BrowserRouter>
        <AddCameraModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </BrowserRouter>
    )

    // Step 1: Enter URL and test
    const urlInput = screen.getByPlaceholderText(/rtsp:\/\/camera/)
    fireEvent.change(urlInput, { target: { value: 'rtsp://test:8554/stream' } })
    fireEvent.click(screen.getByText('Test Connection'))

    // Wait for step 2
    await waitFor(() => {
      expect(screen.getByText('Camera ID')).toBeInTheDocument()
    })

    // Step 2: Enter details
    const idInput = screen.getByPlaceholderText('front-door')
    const nameInput = screen.getByPlaceholderText('Front Door Camera')
    fireEvent.change(idInput, { target: { value: 'test-cam' } })
    fireEvent.change(nameInput, { target: { value: 'Test Camera' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Camera' }))

    await waitFor(() => {
      expect(camerasApi.create).toHaveBeenCalledWith({
        id: 'test-cam',
        name: 'Test Camera',
        streamUrl: 'rtsp://test:8554/stream',
      })
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should call onClose when Cancel button is clicked', () => {
    render(
      <BrowserRouter>
        <AddCameraModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </BrowserRouter>
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalled()
  })
})
