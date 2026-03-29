import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage          from './pages/LandingPage';
import DashboardPlaceholder from './pages/DashboardPlaceholder';
import CitizenLayout        from './layouts/CitizenLayout';
import CitizenDashboard     from './pages/CitizenDashboard';
import CitizenProfile       from './pages/CitizenProfile';
import NearbyIssues         from './pages/NearbyIssues';
import Notifications        from './pages/Notifications';
import MyRewards            from './pages/MyRewards';
import Leaderboard          from './pages/Leaderboard';
import MyReportsPage        from './pages/MyReports';
import Settings             from './pages/Settings';
import HelpSupport          from './pages/HelpSupport';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"  element={<LandingPage />} />
        <Route path="/dashboard"           element={<DashboardPlaceholder />} />
        <Route path="/collector-dashboard" element={<DashboardPlaceholder />} />
        <Route path="/green-dashboard"     element={<DashboardPlaceholder />} />

        <Route path="/citizen" element={<CitizenLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"     element={<CitizenDashboard />} />
          <Route path="my-reports"    element={<MyReportsPage />} />
          <Route path="my-rewards"    element={<MyRewards />} />
          <Route path="nearby-issues" element={<NearbyIssues />} />
          <Route path="leaderboard"   element={<Leaderboard />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile"       element={<CitizenProfile />} />
          <Route path="settings"      element={<Settings />} />
          <Route path="help-support"  element={<HelpSupport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
