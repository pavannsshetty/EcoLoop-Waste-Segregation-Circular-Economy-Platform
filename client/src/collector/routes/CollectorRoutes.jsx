import { Route, Navigate } from 'react-router-dom';
import CollectorLayout from '../../shared/layouts/CollectorLayout';
import CollectorDashboard from '../dashboard/CollectorDashboard';
import AssignedReports from '../assignedReports/AssignedReports';
import PublicWasteTasks from '../publicWasteTasks/PublicWasteTasks';
import HomePickupTasks from '../homePickupTasks/HomePickupTasks';
import CompletedTasks from '../completedTasks/CompletedTasks';
import ScrapTasks from '../scrapTasks/ScrapTasks';
import EcoDeliveryTasks from '../ecoDelivery/EcoDeliveryTasks';
import CollectorPerformance from '../performance/CollectorPerformance';
import CollectorProfile from '../profile/CollectorProfile';
import NearbyIssues from '../../shared/pages/NearbyIssues';
import CommunityUpdates from '../../shared/pages/CommunityUpdates';
import Settings from '../settings/Settings';

const collectorRoutes = (
  <Route path="/collector" element={<CollectorLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<CollectorDashboard />} />
    <Route path="assigned" element={<AssignedReports />} />
    <Route path="tasks" element={<AssignedReports />} />
    <Route path="public-waste" element={<PublicWasteTasks />} />
    <Route path="home-pickup" element={<HomePickupTasks />} />
    <Route path="completed" element={<CompletedTasks />} />
    <Route path="scrap-requests" element={<ScrapTasks />} />
    <Route path="eco-deliveries" element={<EcoDeliveryTasks />} />
    <Route path="nearby" element={<NearbyIssues />} />
    <Route path="performance" element={<CollectorPerformance />} />
    <Route path="community" element={<CommunityUpdates />} />
    <Route path="profile" element={<CollectorProfile />} />
    <Route path="settings" element={<Settings />} />
  </Route>
);

export default collectorRoutes;
