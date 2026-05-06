import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Login } from '@/pages/Login';
import { Dashboard, DashboardPresent } from '@/pages/Dashboard';
import { Team } from '@/pages/Team';
import { ProfileDetail } from '@/pages/ProfileDetail';
import { MyProfile } from '@/pages/MyProfile';
import { Pitches } from '@/pages/Pitches';
import { PitchDetail } from '@/pages/PitchDetail';
import { Meetings } from '@/pages/Meetings';
import { MeetingDetail } from '@/pages/MeetingDetail';
import { Sprints } from '@/pages/Sprints';
import { Polls } from '@/pages/Polls';
import { PollDetail } from '@/pages/PollDetail';
import { Leaderboard } from '@/pages/Leaderboard';
import { ConfigBanner } from '@/components/shared/ConfigBanner';

function Loading() {
  return (
    <div className="min-h-screen grid place-items-center text-muted text-sm">Loading…</div>
  );
}

export function App() {
  const { user, loading, configured } = useAuth();

  if (!configured) {
    return <ConfigBanner />;
  }
  if (loading) return <Loading />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/dashboard/present" element={<DashboardPresent />} />
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="/team" element={<Team />} />
        <Route path="/team/:userId" element={<ProfileDetail />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/pitches" element={<Pitches />} />
        <Route path="/pitches/:userId" element={<PitchDetail />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/meetings/:id" element={<MeetingDetail />} />
        <Route path="/sprints" element={<Sprints />} />
        <Route path="/polls" element={<Polls />} />
        <Route path="/polls/:id" element={<PollDetail />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
