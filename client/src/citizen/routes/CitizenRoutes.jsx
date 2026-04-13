import { Route, Navigate } from 'react-router-dom';
import CitizenLayout from '../../shared/layouts/CitizenLayout';
import CitizenDashboard from '../dashboard/CitizenDashboard';
import MyReportsPage from '../reports/MyReports';
import MyRewards from '../rewards/MyRewards';
import NearbyIssues from '../../shared/pages/NearbyIssues';
import Notifications from '../notifications/Notifications';
import Leaderboard from '../leaderboard/Leaderboard';
import CitizenProfile from '../profile/CitizenProfile';
import Settings from '../settings/Settings';
import HelpSupport from '../helpSupport/HelpSupport';
import SellScrap from '../scrap/SellScrap';
import MyScrapRequests from '../scrap/MyScrapRequests';

const citizenRoutes = (
  <Route path="/citizen" element={<CitizenLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<CitizenDashboard />} />
    <Route path="my-reports" element={<MyReportsPage />} />
    <Route path="my-rewards" element={<MyRewards />} />
    <Route path="nearby-issues" element={<NearbyIssues />} />
    <Route path="leaderboard" element={<Leaderboard />} />
    <Route path="notifications" element={<Notifications />} />
    <Route path="profile" element={<CitizenProfile />} />
    <Route path="settings" element={<Settings />} />
    <Route path="help-support" element={<HelpSupport />} />
    <Route path="sell-scrap" element={<SellScrap />} />
    <Route path="scrap-requests" element={<MyScrapRequests />} />
    <Route path="scrap-status" element={<MyScrapRequests />} /> {/* Reuse for now or create specific status page later */}
  </Route>
);

export default citizenRoutes;
