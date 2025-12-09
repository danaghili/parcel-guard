import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

import { SystemStats } from '../../src/components/system/SystemStats'
import { StorageChart } from '../../src/components/system/StorageChart'
import { CameraHealthTable } from '../../src/components/system/CameraHealthTable'

describe('SystemStats', () => {
  const defaultProps = {
    version: '0.6.0',
    uptime: 3661, // 1 hour, 1 minute, 1 second
    memory: {
      used: 512 * 1024 * 1024, // 512 MB
      total: 1024 * 1024 * 1024, // 1 GB
      percentage: 50,
    },
  }

  it('should render version', () => {
    render(<SystemStats {...defaultProps} />)
    expect(screen.getByText('0.6.0')).toBeInTheDocument()
    expect(screen.getByText('Version')).toBeInTheDocument()
  })

  it('should render uptime in human readable format', () => {
    render(<SystemStats {...defaultProps} />)
    expect(screen.getByText('1h 1m')).toBeInTheDocument()
    expect(screen.getByText('Uptime')).toBeInTheDocument()
  })

  it('should render uptime with days when over 24 hours', () => {
    render(<SystemStats {...defaultProps} uptime={90061} />) // 1 day, 1 hour, 1 minute
    expect(screen.getByText('1d 1h 1m')).toBeInTheDocument()
  })

  it('should render memory percentage', () => {
    render(<SystemStats {...defaultProps} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Hub Memory (RAM)')).toBeInTheDocument()
  })

  it('should render memory usage', () => {
    render(<SystemStats {...defaultProps} />)
    expect(screen.getByText('512 MB / 1 GB')).toBeInTheDocument()
  })
})

describe('StorageChart', () => {
  const defaultStats = {
    total: 100 * 1024 * 1024 * 1024, // 100 GB
    used: 30 * 1024 * 1024 * 1024, // 30 GB
    available: 70 * 1024 * 1024 * 1024, // 70 GB
    percentage: 30,
    warning: false,
    formatted: {
      total: '100 GB',
      used: '30 GB',
      available: '70 GB',
    },
    breakdown: {
      clips: { count: 50, size: 20 * 1024 * 1024 * 1024, formatted: '20 GB' },
      thumbnails: { count: 50, size: 5 * 1024 * 1024 * 1024, formatted: '5 GB' },
      database: { size: 5 * 1024 * 1024 * 1024, formatted: '5 GB' },
    },
  }

  it('should render storage usage', () => {
    render(<StorageChart stats={defaultStats} />)
    expect(screen.getByText('Storage')).toBeInTheDocument()
    expect(screen.getByText('30 GB of 100 GB')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('should render breakdown counts', () => {
    render(<StorageChart stats={defaultStats} />)
    expect(screen.getAllByText('50')).toHaveLength(2) // clips and thumbnails count
    expect(screen.getByText('Clips (20 GB)')).toBeInTheDocument()
  })

  it('should show warning when storage is low', () => {
    const warningStats = { ...defaultStats, warning: true, percentage: 85 }
    render(<StorageChart stats={warningStats} />)
    expect(screen.getByText(/Storage running low/)).toBeInTheDocument()
  })

  it('should not show warning when storage is fine', () => {
    render(<StorageChart stats={defaultStats} />)
    expect(screen.queryByText(/Storage running low/)).not.toBeInTheDocument()
  })
})

describe('CameraHealthTable', () => {
  const mockCameras = [
    {
      id: 'cam1',
      name: 'Front Door',
      streamUrl: 'rtsp://test:8554/cam1',
      status: 'online' as const,
      lastSeen: Date.now() - 30000, // 30 seconds ago
    },
    {
      id: 'cam2',
      name: 'Backyard',
      streamUrl: 'rtsp://test:8554/cam2',
      status: 'offline' as const,
      lastSeen: Date.now() - 3600000, // 1 hour ago
    },
  ]

  it('should render empty state when no cameras', () => {
    render(
      <BrowserRouter>
        <CameraHealthTable cameras={[]} />
      </BrowserRouter>
    )
    expect(screen.getByText('No cameras configured')).toBeInTheDocument()
    expect(screen.getByText('Add a camera')).toBeInTheDocument()
  })

  it('should render camera list', () => {
    render(
      <BrowserRouter>
        <CameraHealthTable cameras={mockCameras} />
      </BrowserRouter>
    )
    expect(screen.getByText('Front Door')).toBeInTheDocument()
    expect(screen.getByText('Backyard')).toBeInTheDocument()
  })

  it('should show online/offline status', () => {
    render(
      <BrowserRouter>
        <CameraHealthTable cameras={mockCameras} />
      </BrowserRouter>
    )
    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('should show last seen time only for offline cameras', () => {
    render(
      <BrowserRouter>
        <CameraHealthTable cameras={mockCameras} />
      </BrowserRouter>
    )
    // Online camera (cam1) should NOT show last seen
    expect(screen.queryByText('Just now')).not.toBeInTheDocument()
    // Offline camera (cam2) should show last seen
    expect(screen.getByText(/Last seen 1h ago/)).toBeInTheDocument()
  })

  it('should show camera count summary', () => {
    render(
      <BrowserRouter>
        <CameraHealthTable cameras={mockCameras} />
      </BrowserRouter>
    )
    expect(screen.getByText('1 of 2 online')).toBeInTheDocument()
  })

  it('should have link to manage cameras', () => {
    render(
      <BrowserRouter>
        <CameraHealthTable cameras={mockCameras} />
      </BrowserRouter>
    )
    expect(screen.getByText('Manage cameras')).toBeInTheDocument()
  })
})
