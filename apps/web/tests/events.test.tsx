import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { EventCard } from '../src/components/events/EventCard'
import { EventStats } from '../src/components/events/EventStats'
import { EventFilters } from '../src/components/events/EventFilters'
import type { MotionEvent, Camera, EventStats as EventStatsType, EventFilters as EventFiltersType } from '../src/lib/api'

// Mock the api module
vi.mock('../src/lib/api', () => ({
  eventsApi: {
    getThumbnailUrl: (id: string) => `/api/events/${id}/thumbnail`,
  },
}))

// Helper to wrap components with router
function renderWithRouter(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

// Test fixtures
const mockEvent: MotionEvent = {
  id: 'event-1',
  cameraId: 'cam1',
  timestamp: Math.floor(Date.now() / 1000),
  duration: 45,
  thumbnailPath: '/thumbnails/event-1.jpg',
  videoPath: '/clips/event-1.mp4',
  isImportant: false,
  isFalseAlarm: false,
  createdAt: Math.floor(Date.now() / 1000),
}

const mockCamera: Camera = {
  id: 'cam1',
  name: 'Front Door',
  streamUrl: 'rtsp://localhost/stream1',
  status: 'online',
  lastSeen: Math.floor(Date.now() / 1000),
}

const mockStats: EventStatsType = {
  total: 150,
  today: 12,
  important: 5,
  falseAlarms: 8,
}

describe('EventCard', () => {
  it('should render event with camera name', () => {
    renderWithRouter(<EventCard event={mockEvent} camera={mockCamera} />)

    expect(screen.getByText('Front Door')).toBeInTheDocument()
  })

  it('should render event with camera ID when camera not provided', () => {
    renderWithRouter(<EventCard event={mockEvent} />)

    expect(screen.getByText('cam1')).toBeInTheDocument()
  })

  it('should display duration badge', () => {
    renderWithRouter(<EventCard event={mockEvent} camera={mockCamera} />)

    expect(screen.getByText('45s')).toBeInTheDocument()
  })

  it('should display important badge when event is important', () => {
    const importantEvent = { ...mockEvent, isImportant: true }
    renderWithRouter(<EventCard event={importantEvent} camera={mockCamera} />)

    expect(screen.getByText('Important')).toBeInTheDocument()
  })

  it('should display false alarm badge when marked', () => {
    const falseAlarmEvent = { ...mockEvent, isFalseAlarm: true }
    renderWithRouter(<EventCard event={falseAlarmEvent} camera={mockCamera} />)

    expect(screen.getByText('False Alarm')).toBeInTheDocument()
  })

  it('should link to event detail page', () => {
    renderWithRouter(<EventCard event={mockEvent} camera={mockCamera} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/events/event-1')
  })

  it('should format duration correctly for longer events', () => {
    const longEvent = { ...mockEvent, duration: 125 } // 2 min 5 sec
    renderWithRouter(<EventCard event={longEvent} camera={mockCamera} />)

    expect(screen.getByText('2m 5s')).toBeInTheDocument()
  })

  it('should format today\'s timestamp correctly', () => {
    renderWithRouter(<EventCard event={mockEvent} camera={mockCamera} />)

    // Should display "Today at HH:MM"
    expect(screen.getByText(/Today at/)).toBeInTheDocument()
  })
})

describe('EventStats', () => {
  it('should render all stat values', () => {
    render(<EventStats stats={mockStats} />)

    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('should render stat labels', () => {
    render(<EventStats stats={mockStats} />)

    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Important')).toBeInTheDocument()
    expect(screen.getByText('False Alarms')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<EventStats stats={null} loading={true} />)

    // Should show skeleton elements (4 placeholders)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(4)
  })
})

describe('EventFilters', () => {
  const mockCameras: Camera[] = [
    { id: 'cam1', name: 'Front Door', streamUrl: '', status: 'online', lastSeen: null },
    { id: 'cam2', name: 'Back Yard', streamUrl: '', status: 'online', lastSeen: null },
  ]

  const defaultFilters: EventFiltersType = {}

  it('should render camera dropdown with options', () => {
    const handleChange = vi.fn()
    render(
      <EventFilters
        filters={defaultFilters}
        cameras={mockCameras}
        onFiltersChange={handleChange}
      />,
    )

    expect(screen.getByText('All Cameras')).toBeInTheDocument()
    expect(screen.getByText('Front Door')).toBeInTheDocument()
    expect(screen.getByText('Back Yard')).toBeInTheDocument()
  })

  it('should render date preset buttons', () => {
    const handleChange = vi.fn()
    render(
      <EventFilters
        filters={defaultFilters}
        cameras={mockCameras}
        onFiltersChange={handleChange}
      />,
    )

    expect(screen.getByText('All Time')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('7 Days')).toBeInTheDocument()
    expect(screen.getByText('30 Days')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('should call onFiltersChange when camera is selected', () => {
    const handleChange = vi.fn()
    render(
      <EventFilters
        filters={defaultFilters}
        cameras={mockCameras}
        onFiltersChange={handleChange}
      />,
    )

    const cameraSelect = screen.getByDisplayValue('All Cameras')
    fireEvent.change(cameraSelect, { target: { value: 'cam1' } })

    expect(handleChange).toHaveBeenCalledWith({ cameraId: 'cam1' })
  })

  it('should call onFiltersChange when Today preset is clicked', () => {
    const handleChange = vi.fn()
    render(
      <EventFilters
        filters={defaultFilters}
        cameras={mockCameras}
        onFiltersChange={handleChange}
      />,
    )

    fireEvent.click(screen.getByText('Today'))

    expect(handleChange).toHaveBeenCalled()
    // The call should include a startDate
    const call = handleChange.mock.calls[0]?.[0]
    expect(call).toHaveProperty('startDate')
    expect(typeof call?.startDate).toBe('number')
  })

  it('should show clear filters button when filters are active', () => {
    const handleChange = vi.fn()
    const activeFilters: EventFiltersType = { cameraId: 'cam1' }

    render(
      <EventFilters
        filters={activeFilters}
        cameras={mockCameras}
        onFiltersChange={handleChange}
      />,
    )

    expect(screen.getByText('Clear Filters')).toBeInTheDocument()
  })

  it('should hide clear filters button when no filters active', () => {
    const handleChange = vi.fn()

    render(
      <EventFilters
        filters={defaultFilters}
        cameras={mockCameras}
        onFiltersChange={handleChange}
      />,
    )

    expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument()
  })

  it('should clear all filters when clear button is clicked', () => {
    const handleChange = vi.fn()
    const activeFilters: EventFiltersType = { cameraId: 'cam1', isImportant: true }

    render(
      <EventFilters
        filters={activeFilters}
        cameras={mockCameras}
        onFiltersChange={handleChange}
      />,
    )

    fireEvent.click(screen.getByText('Clear Filters'))

    expect(handleChange).toHaveBeenCalledWith({})
  })

  it('should show custom date inputs when Custom is clicked', () => {
    const handleChange = vi.fn()

    render(
      <EventFilters
        filters={defaultFilters}
        cameras={mockCameras}
        onFiltersChange={handleChange}
      />,
    )

    fireEvent.click(screen.getByText('Custom'))

    expect(screen.getByText('From:')).toBeInTheDocument()
    expect(screen.getByText('To:')).toBeInTheDocument()
  })

  it('should filter by importance', () => {
    const handleChange = vi.fn()

    render(
      <EventFilters
        filters={defaultFilters}
        cameras={mockCameras}
        onFiltersChange={handleChange}
      />,
    )

    const importanceSelect = screen.getByDisplayValue('All Events')
    fireEvent.change(importanceSelect, { target: { value: 'true' } })

    expect(handleChange).toHaveBeenCalledWith({ isImportant: true })
  })
})
