import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../../services/authService', () => ({
  login: vi.fn(), register: vi.fn(), me: vi.fn(), logout: vi.fn(),
}));
import * as authService from '../../services/authService';
import { AuthProvider } from '../../context/AuthContext';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

const wrap = (ui) => render(<MemoryRouter><AuthProvider>{ui}</AuthProvider></MemoryRouter>);

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows required and email format errors without calling the API', async () => {
    wrap(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('submits valid credentials', async () => {
    authService.login.mockResolvedValue({ user: { id: '1', name: 'A B', role: 'athlete' }, token: 't' });
    wrap(<LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'Secret123');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(authService.login).toHaveBeenCalledWith('a@b.co', 'Secret123'));
  });
});

describe('RegisterPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates password strength and confirmation', async () => {
    wrap(<RegisterPage />);
    await userEvent.type(screen.getByLabelText('Full name'), 'Jo Doe');
    await userEvent.type(screen.getByLabelText('Email'), 'jo@doe.com');
    await userEvent.type(screen.getByLabelText('Password'), 'abcdefgh');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'different1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Password must contain a letter and a number')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('toggles password visibility', async () => {
    wrap(<RegisterPage />);
    const pw = screen.getByLabelText('Password');
    expect(pw).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getAllByRole('button', { name: /show password/i })[0]);
    expect(pw).toHaveAttribute('type', 'text');
  });
});
