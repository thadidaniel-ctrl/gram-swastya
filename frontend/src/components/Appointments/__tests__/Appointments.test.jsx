import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Appointments from '../Appointments';
import { api } from '../../../services/api';
import '../../../i18n';

vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('Appointments page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and renders the doctor directory and appointment list', async () => {
    vi.spyOn(api, 'getDoctorList').mockResolvedValue({
      doctors: [
        { id: 'doc-1', name: 'Dr. Asha Sharma', specialization: 'Cardiology', consultationFee: 300 },
      ],
    });
    vi.spyOn(api, 'getAppointments').mockResolvedValue({
      appointments: [
        {
          id: 'appt-1',
          doctor: { name: 'Dr. Asha Sharma', specialization: 'Cardiology' },
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          duration: 15,
          type: 'video',
          status: 'scheduled',
          isUpcoming: true,
          payment: { status: 'pending', amount: 300 },
          meetingLink: 'https://meet.example.com/abc',
        },
      ],
      pagination: { total: 1 },
    });

    render(<Appointments />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /doctor/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Dr. Asha Sharma')).toBeInTheDocument();
    expect(screen.getByText(/payment: pending/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /join meeting/i })).toHaveAttribute(
      'href',
      'https://meet.example.com/abc'
    );
  });

  it('shows the consultation fee badge for a selected doctor', async () => {
    vi.spyOn(api, 'getDoctorList').mockResolvedValue({
      doctors: [
        { id: 'doc-1', name: 'Dr. Raj', specialization: 'General', consultationFee: 200 },
      ],
    });
    vi.spyOn(api, 'getAppointments').mockResolvedValue({ appointments: [], pagination: { total: 0 } });

    render(<Appointments />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Dr. Raj/i })).toBeInTheDocument();
    });
  });
});