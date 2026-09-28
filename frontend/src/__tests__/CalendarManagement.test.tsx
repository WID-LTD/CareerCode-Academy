import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const mockStore = vi.hoisted(() => ({
  events: [] as any[],
  stats: null as any,
  selectedEvent: null as any,
  isLoading: false,
  error: null,
  view: 'month',
  fetchEvents: vi.fn().mockResolvedValue(undefined),
  fetchStats: vi.fn().mockResolvedValue(undefined),
  createEvent: vi.fn().mockResolvedValue({ id: 'new' }),
  updateEvent: vi.fn().mockResolvedValue({ id: 'e1' }),
  deleteEvent: vi.fn().mockResolvedValue(undefined),
  setSelectedEvent: vi.fn(),
  rsvp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/store/calendarStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store/calendarStore')>();
  return {
    ...actual,
    useCalendarStore: () => mockStore,
  };
});

import CalendarManagement from '@/pages/admin/CalendarManagement';
import type { CalendarEvent } from '@/store/calendarStore';

function evt(partial: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    title: 'JavaScript Basics',
    description: 'A class',
    event_type: 'class',
    start_datetime: '2026-01-10T10:00:00.000Z',
    end_datetime: '2026-01-10T11:00:00.000Z',
    timezone: 'UTC',
    location: 'Room 1',
    meeting_url: null,
    meeting_platform: null,
    color: null,
    course_id: null,
    module_id: null,
    program_id: null,
    cohort_id: null,
    school_id: null,
    instructor_id: null,
    community_id: null,
    channel_id: null,
    created_by: 'admin-1',
    visibility: 'public',
    visibility_target_id: null,
    status: 'scheduled',
    is_recurring: false,
    recurrence_rule: null,
    max_attendees: null,
    reminder_minutes: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

beforeEach(() => {
  mockStore.events = [];
  mockStore.stats = null;
  mockStore.selectedEvent = null;
  mockStore.fetchEvents.mockClear();
  mockStore.fetchStats.mockClear();
  mockStore.createEvent.mockClear();
  mockStore.updateEvent.mockClear();
  mockStore.deleteEvent.mockClear();
  mockStore.setSelectedEvent.mockClear();
  mockStore.rsvp.mockClear();
});

describe('CalendarManagement — page load', () => {
  it('fetches events and stats on mount', () => {
    render(<CalendarManagement />);
    expect(mockStore.fetchEvents).toHaveBeenCalled();
    expect(mockStore.fetchStats).toHaveBeenCalled();
  });

  it('renders the header and Create Event button', () => {
    render(<CalendarManagement />);
    expect(screen.getByRole('heading', { name: /Calendar and Events/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Event/ })).toBeInTheDocument();
  });

  it('renders all six stat cards with values', () => {
    mockStore.stats = { total: 10, scheduled: 4, live: 2, completed: 2, cancelled: 1, draft: 1, by_type: {} };
    render(<CalendarManagement />);
    const totalCard = screen.getByText('Total', { selector: 'p' }).closest('div');
    expect(totalCard).toHaveTextContent('10');
    expect(screen.getByText('Scheduled', { selector: 'p' }).closest('div')).toHaveTextContent('4');
    expect(screen.getByText('Live', { selector: 'p' }).closest('div')).toHaveTextContent('2');
    expect(screen.getByText('Completed', { selector: 'p' }).closest('div')).toHaveTextContent('2');
    expect(screen.getByText('Cancelled', { selector: 'p' }).closest('div')).toHaveTextContent('1');
    expect(screen.getByText('Draft', { selector: 'p' }).closest('div')).toHaveTextContent('1');
  });
});

describe('CalendarManagement — events table', () => {
  it('renders event rows with title, type badge, status and actions', () => {
    mockStore.events = [evt(), evt({ id: 'e2', title: 'Python Basics', event_type: 'exam', status: 'live' })];
    render(<CalendarManagement />);
    expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
    expect(screen.getByText('Python Basics')).toBeInTheDocument();
    expect(screen.getAllByText('Class').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Exam').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('View').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('Edit').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('Delete').length).toBeGreaterThan(0);
  });

  it('shows an empty state when there are no events', () => {
    mockStore.events = [];
    render(<CalendarManagement />);
    expect(screen.getByText('No events found')).toBeInTheDocument();
  });

  it('shows the rsvp count when present', () => {
    mockStore.events = [evt({ rsvp_count: 7 })];
    render(<CalendarManagement />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});

describe('CalendarManagement — search & filters (client-side)', () => {
  it('filters rows by title search', () => {
    mockStore.events = [
      evt({ title: 'JavaScript Basics' }),
      evt({ id: 'e2', title: 'Python Basics' }),
    ];
    render(<CalendarManagement />);
    fireEvent.change(screen.getByPlaceholderText('Search events...'), { target: { value: 'python' } });
    expect(screen.queryByText('JavaScript Basics')).not.toBeInTheDocument();
    expect(screen.getByText('Python Basics')).toBeInTheDocument();
  });

  it('filters rows by event type', () => {
    mockStore.events = [
      evt({ title: 'A Class Event' }),
      evt({ id: 'e2', title: 'An Exam Event', event_type: 'exam' }),
    ];
    render(<CalendarManagement />);
    fireEvent.change(screen.getByDisplayValue('All Types'), { target: { value: 'exam' } });
    expect(screen.queryByText('A Class Event')).not.toBeInTheDocument();
    expect(screen.getByText('An Exam Event')).toBeInTheDocument();
  });

  it('filters rows by status', () => {
    mockStore.events = [
      evt({ title: 'Scheduled One' }),
      evt({ id: 'e2', title: 'Live One', status: 'live' }),
    ];
    render(<CalendarManagement />);
    fireEvent.change(screen.getByDisplayValue('All Statuses'), { target: { value: 'live' } });
    expect(screen.queryByText('Scheduled One')).not.toBeInTheDocument();
    expect(screen.getByText('Live One')).toBeInTheDocument();
  });

  it('combines search, type and status filters', () => {
    mockStore.events = [
      evt({ title: 'JavaScript Class', status: 'scheduled' }),
      evt({ id: 'e2', title: 'JavaScript Class Live', event_type: 'exam', status: 'live' }),
    ];
    render(<CalendarManagement />);
    fireEvent.change(screen.getByPlaceholderText('Search events...'), { target: { value: 'class' } });
    fireEvent.change(screen.getByDisplayValue('All Types'), { target: { value: 'exam' } });
    fireEvent.change(screen.getByDisplayValue('All Statuses'), { target: { value: 'live' } });
    expect(screen.queryByText('JavaScript Class')).not.toBeInTheDocument();
    expect(screen.getByText('JavaScript Class Live')).toBeInTheDocument();
  });
});

describe('CalendarManagement — create event modal', () => {
  it('opens the create modal and cancels without calling createEvent', () => {
    render(<CalendarManagement />);
    fireEvent.click(screen.getByRole('button', { name: /Create Event/ }));
    expect(screen.getByRole('heading', { name: 'Create Event' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Create Event' })).not.toBeInTheDocument();
    expect(mockStore.createEvent).not.toHaveBeenCalled();
  });

  it('validates required fields before submitting', () => {
    render(<CalendarManagement />);
    fireEvent.click(screen.getByRole('button', { name: /Create Event/ }));
    const modal = screen.getByRole('heading', { name: 'Create Event' }).closest('div.fixed.inset-0') as HTMLElement;
    fireEvent.click(within(modal).getByRole('button', { name: 'Create Event' }));
    expect(screen.getByText('Title, start time, and end time are required')).toBeInTheDocument();
    expect(mockStore.createEvent).not.toHaveBeenCalled();
  });

  it('creates an event and closes the modal', async () => {
    mockStore.createEvent.mockResolvedValueOnce(evt({ id: 'created' }));
    render(<CalendarManagement />);
    fireEvent.click(screen.getByRole('button', { name: /Create Event/ }));

    const titleInput = screen.getByPlaceholderText('Event title');
    fireEvent.change(titleInput, { target: { value: 'New Workshop' } });
    fireEvent.change(screen.getByPlaceholderText('Event description'), { target: { value: 'desc' } });
    const dateInputs = screen.getAllByDisplayValue('').filter((el) => el.getAttribute('type') === 'datetime-local') as HTMLInputElement[];
    fireEvent.change(dateInputs[0], { target: { value: '2026-02-01T10:00' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-02-01T11:00' } });
    fireEvent.change(screen.getByPlaceholderText('Unlimited'), { target: { value: '30' } });

    fireEvent.click(screen.getAllByRole('button', { name: 'Create Event' })[screen.getAllByRole('button', { name: 'Create Event' }).length - 1]);

    await waitFor(() => {
      expect(mockStore.createEvent).toHaveBeenCalled();
    });
    const input = mockStore.createEvent.mock.calls[0][0];
    expect(input.title).toBe('New Workshop');
    expect(input.event_type).toBe('live_session');
    expect(input.status).toBe('scheduled');
    expect(input.visibility).toBe('public');
    expect(input.max_attendees).toBe(30);
    expect(input.start_datetime).toContain('2026-02-01T10:00');
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Create Event' })).not.toBeInTheDocument();
    });
  });
});

describe('CalendarManagement — edit event modal', () => {
  it('opens the edit modal pre-filled with event data', () => {
    mockStore.events = [evt({ title: 'JavaScript Basics', event_type: 'workshop' })];
    render(<CalendarManagement />);
    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByRole('heading', { name: 'Edit Event' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('JavaScript Basics')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Workshop', selected: true })).toBeInTheDocument();
  });

  it('updates the event on save', async () => {
    mockStore.updateEvent.mockResolvedValueOnce(evt({ title: 'Renamed Event' }));
    mockStore.events = [evt({ title: 'JavaScript Basics' })];
    render(<CalendarManagement />);
    fireEvent.click(screen.getByTitle('Edit'));
    const titleInput = screen.getByDisplayValue('JavaScript Basics');
    fireEvent.change(titleInput, { target: { value: 'Renamed Event' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Event' }));

    await waitFor(() => {
      expect(mockStore.updateEvent).toHaveBeenCalledWith('e1', expect.objectContaining({ title: 'Renamed Event' }));
    });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Edit Event' })).not.toBeInTheDocument();
    });
  });
});

describe('CalendarManagement — delete event flow', () => {
  it('cancelling the confirmation keeps the event', () => {
    mockStore.events = [evt()];
    render(<CalendarManagement />);
    fireEvent.click(screen.getByTitle('Delete'));
    expect(screen.getByRole('heading', { name: 'Delete Event' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Delete Event' })).not.toBeInTheDocument();
    expect(mockStore.deleteEvent).not.toHaveBeenCalled();
  });

  it('confirming deletes the event', async () => {
    mockStore.events = [evt(), evt({ id: 'e2', title: 'Keep Me' })];
    render(<CalendarManagement />);
    fireEvent.click(screen.getAllByTitle('Delete')[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[screen.getAllByRole('button', { name: 'Delete' }).length - 1]);
    await waitFor(() => {
      expect(mockStore.deleteEvent).toHaveBeenCalledWith('e1');
    });
    expect(mockStore.fetchStats).toHaveBeenCalled();
  });
});

describe('CalendarManagement — event detail modal', () => {
  it('opens the detail modal when a View button is clicked', () => {
    mockStore.events = [evt({ title: 'JavaScript Basics' })];
    render(<CalendarManagement />);
    fireEvent.click(screen.getByTitle('View'));
    expect(mockStore.setSelectedEvent).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }));
  });

  it('renders the detail modal contents when an event is selected', () => {
    mockStore.selectedEvent = evt({ title: 'JavaScript Basics', location: 'Room 1' });
    render(<CalendarManagement />);
    expect(screen.getAllByText('JavaScript Basics').length).toBeGreaterThan(0);
    expect(screen.getByText('Room 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Going/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Maybe/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Can't Go/ })).toBeInTheDocument();
  });

  it('submits an RSVP from the detail modal', async () => {
    mockStore.selectedEvent = evt();
    mockStore.rsvp.mockResolvedValueOnce(undefined);
    render(<CalendarManagement />);
    fireEvent.click(screen.getByRole('button', { name: /Going/ }));
    await waitFor(() => {
      expect(mockStore.rsvp).toHaveBeenCalledWith('e1', 'going');
    });
  });

  it('closes the detail modal by calling setSelectedEvent(null)', () => {
    mockStore.selectedEvent = evt();
    render(<CalendarManagement />);
    // First button in the modal is the X close button
    const modal = screen.getByRole('button', { name: /Going/ }).closest('div[class*="max-w-lg"]') as HTMLElement;
    const xButton = within(modal).getAllByRole('button')[0];
    fireEvent.click(xButton);
    expect(mockStore.setSelectedEvent).toHaveBeenCalledWith(null);
  });
});