import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import EntryForm from './EntryForm';

describe('EntryForm validation', () => {
  it('blocks submit and shows errors for missing/out-of-range values', async () => {
    const onSubmit = vi.fn();
    render(<EntryForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: /save entry/i }));
    expect(await screen.findByText('Duration is required')).toBeInTheDocument();
    expect(screen.getByText('Performance score is required')).toBeInTheDocument();
    expect(screen.getByText('Sleep hours is required')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/duration/i), '900');
    await userEvent.type(screen.getByLabelText(/performance score/i), '120');
    await userEvent.type(screen.getByLabelText(/sleep last night/i), '30');
    await userEvent.click(screen.getByRole('button', { name: /save entry/i }));
    expect(await screen.findByText('Duration must be between 1 and 600')).toBeInTheDocument();
    expect(screen.getByText('Performance score must be between 0 and 100')).toBeInTheDocument();
    expect(screen.getByText('Sleep hours must be between 0 and 24')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a numeric payload when valid', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(<EntryForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/duration/i), '60');
    await userEvent.type(screen.getByLabelText(/performance score/i), '80');
    await userEvent.type(screen.getByLabelText(/sleep last night/i), '7.5');
    await userEvent.click(screen.getByRole('button', { name: /save entry/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      durationMinutes: 60, performanceScore: 80, sleepHours: 7.5, feelingScore: 3, mealCount: 3,
    });
  });
});
