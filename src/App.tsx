import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Login } from '@/pages/Login';
import { ResetPassword } from '@/pages/ResetPassword';
import { Security } from '@/pages/Security';
import { UserGuide } from '@/pages/UserGuide';
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
import { Resources } from '@/pages/Resources';
import { CourseProgress } from '@/pages/CourseProgress';
import { CohortPresent } from '@/pages/CohortPresent';
import { SharePresent } from '@/pages/SharePresent';
import { Admin } from '@/pages/Admin';
import { President } from '@/pages/President';
import { TeammateProfile } from '@/pages/TeammateProfile';
import { ConfigBanner } from '@/components/shared/ConfigBanner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import type { ReactNode } from 'react';

function Guarded({ label, children }: { label: string; children: ReactNode }) {
  return <ErrorBoundary label={label}>{children}</ErrorBoundary>;
}

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
        <Route path="/register" element={<Login />} />
        <Route path="/signup" element={<Login />} />
        <Route path="/auth/reset" element={<ResetPassword />} />
        <Route path="/security" element={<Security />} />
        <Route path="/guide" element={<UserGuide />} />
        <Route path="/share/cohort/:token" element={<SharePresent />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/auth/reset" element={<ResetPassword />} />
      <Route path="/security" element={<Security />} />
      <Route path="/guide" element={<UserGuide />} />
      <Route path="/share/cohort/:token" element={<SharePresent />} />
      <Route
        path="/dashboard/present"
        element={
          <Guarded label="Present mode (working group)">
            <DashboardPresent />
          </Guarded>
        }
      />
      <Route
        path="/dashboard/cohort"
        element={
          <Guarded label="Present mode (cohort session)">
            <CohortPresent />
          </Guarded>
        }
      />
      <Route element={<AppShell />}>
        <Route index element={<Guarded label="Dashboard"><Dashboard /></Guarded>} />
        <Route path="/team" element={<Guarded label="Team"><Team /></Guarded>} />
        <Route path="/team/:userId" element={<Guarded label="Profile"><ProfileDetail /></Guarded>} />
        <Route path="/profile" element={<Guarded label="My profile"><MyProfile /></Guarded>} />
        <Route path="/pitches" element={<Guarded label="Pitches"><Pitches /></Guarded>} />
        <Route path="/pitches/:userId" element={<Guarded label="Pitch detail"><PitchDetail /></Guarded>} />
        <Route path="/meetings" element={<Guarded label="Meetings"><Meetings /></Guarded>} />
        <Route path="/meetings/:id" element={<Guarded label="Meeting detail"><MeetingDetail /></Guarded>} />
        <Route path="/sprints" element={<Guarded label="Sprints"><Sprints /></Guarded>} />
        <Route path="/polls" element={<Guarded label="Polls"><Polls /></Guarded>} />
        <Route path="/polls/:id" element={<Guarded label="Poll"><PollDetail /></Guarded>} />
        <Route path="/leaderboard" element={<Guarded label="Leaderboard"><Leaderboard /></Guarded>} />
        <Route path="/progress" element={<Guarded label="Course progress"><CourseProgress /></Guarded>} />
        <Route path="/resources" element={<Guarded label="Resources"><Resources /></Guarded>} />
        <Route path="/admin" element={<Guarded label="Admin"><Admin /></Guarded>} />
        <Route path="/president" element={<Guarded label="Teammates"><President /></Guarded>} />
        <Route
          path="/president/profile/:userId"
          element={<Guarded label="Teammate profile (proxy)"><TeammateProfile /></Guarded>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
