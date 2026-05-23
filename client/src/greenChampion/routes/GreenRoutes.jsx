import { Route, Navigate } from 'react-router-dom';
import GreenChampionLayout from '../../shared/layouts/GreenChampionLayout';
import GreenChampionDashboard from '../dashboard/GreenChampionDashboard';
import GreenChampionAwareness from '../awareness/GreenChampionAwareness';
import GreenChampionCommunity from '../community/GreenChampionCommunity';
import GreenChampionProfile from '../profile/GreenChampionProfile';
import Settings from '../settings/Settings';
import CampaignManager from '../campaigns/CampaignManager';
import GreenChampionLeaderboard from '../leaderboard/Leaderboard';
import RecyclingPickups from '../recycling/RecyclingPickups';
import NearbyReports from '../reports/NearbyReports';
import TaskManager from '../tasks/TaskManager';
import CleanupVerification from '../verifications/CleanupVerification';

const greenRoutes = (
  <Route path="/green-champion" element={<GreenChampionLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<GreenChampionDashboard />} />
    <Route path="awareness" element={<GreenChampionAwareness />} />
    <Route path="community" element={<GreenChampionCommunity />} />
    <Route path="campaigns" element={<CampaignManager />} />
    <Route path="leaderboard" element={<GreenChampionLeaderboard />} />
    <Route path="recycling" element={<RecyclingPickups />} />
    <Route path="reports" element={<NearbyReports />} />
    <Route path="tasks" element={<TaskManager />} />
    <Route path="verify" element={<CleanupVerification />} />
    <Route path="profile" element={<GreenChampionProfile />} />
    <Route path="settings" element={<Settings />} />
  </Route>
);

export default greenRoutes;
