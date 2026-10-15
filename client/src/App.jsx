import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicLayout from './layouts/PublicLayout';
import AppShell from './layouts/AppShell';
import LandingPage from './features/landing/LandingPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import DashboardPage from './features/athlete/DashboardPage';
import ProfilePage from './features/athlete/ProfilePage';
import DailyLogPage from './features/daily-tracking/DailyLogPage';
import EntriesPage from './features/daily-tracking/EntriesPage';
import TwinPage from './features/digital-twin/TwinPage';
import ReportsPage from './features/reports/ReportsPage';
import ReportDetailPage from './features/reports/ReportDetailPage';
import CoachPage from './features/admin/CoachPage';
import AdminPage from './features/admin/AdminPage';
import { Button } from './components/ui';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 text-center">
      <p className="font-display text-5xl font-semibold text-electric">404</p>
      <p className="mt-3 text-slate-300">This page does not exist.</p>
      <Link to="/" className="mt-6"><Button>Back to home</Button></Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute roles={['athlete']} />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="log" element={<DailyLogPage />} />
          <Route path="entries" element={<EntriesPage />} />
          <Route path="twin" element={<TwinPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/:id" element={<ReportDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['coach']} />}>
        <Route element={<AppShell />}><Route path="/coach" element={<CoachPage />} /></Route>
      </Route>
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<AppShell />}><Route path="/admin" element={<AdminPage />} /></Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
