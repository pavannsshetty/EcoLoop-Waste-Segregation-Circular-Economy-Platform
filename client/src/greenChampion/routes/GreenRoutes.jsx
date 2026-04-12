import { Route, Navigate } from 'react-router-dom';
import GreenChampionLayout from '../../shared/layouts/GreenChampionLayout';
import GreenChampionDashboard from '../dashboard/GreenChampionDashboard';
import GreenChampionAwareness from '../awareness/GreenChampionAwareness';
import GreenChampionCommunity from '../community/GreenChampionCommunity';
import GreenChampionProfile from '../profile/GreenChampionProfile';
import Settings from '../settings/Settings';

const greenRoutes = (
  <Route path="/green-champion" element={<GreenChampionLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<GreenChampionDashboard />} />
    <Route path="awareness" element={<GreenChampionAwareness />} />
    <Route path="community" element={<GreenChampionCommunity />} />
    <Route path="profile" element={<GreenChampionProfile />} />
    <Route path="settings" element={<Settings />} />
  </Route>
);

export default greenRoutes;
