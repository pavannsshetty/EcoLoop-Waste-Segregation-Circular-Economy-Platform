import { Route, Navigate } from 'react-router-dom';
import CollectorLayout from '../../shared/layouts/CollectorLayout';
import CollectorDashboard from '../dashboard/CollectorDashboard';
import AssignedReports from '../assignedReports/AssignedReports';
import CollectorPerformance from '../performance/CollectorPerformance';
import CollectorProfile from '../profile/CollectorProfile';
import NearbyIssues from '../../shared/pages/NearbyIssues';
import Settings from '../settings/Settings';

const collectorRoutes = (
  <Route path="/collector" element={<CollectorLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<CollectorDashboard />} />
    <Route path="assigned" element={<AssignedReports />} />
    <Route path="tasks" element={<AssignedReports />} />
    <Route path="completed" element={<AssignedReports />} />
    <Route path="nearby" element={<NearbyIssues />} />
    <Route path="performance" element={<CollectorPerformance />} />
    <Route path="profile" element={<CollectorProfile />} />
    <Route path="settings" element={<Settings />} />
  </Route>
);

export default collectorRoutes;
