import { Route } from 'react-router-dom';
import AdminLayout from '../../shared/layouts/AdminLayout';
import ManageCitizens from '../manageCitizens/ManageCitizens';
import AdminPlaceholder from '../pages/AdminPlaceholder';
import AdminDashboard from '../pages/AdminDashboard';
import EcoShoppingOrders from '../ecoShopping/EcoShoppingOrders';
import EcoProductBuyers from '../ecoShopping/EcoProductBuyers';

function AdminLoginRedirect() {
  window.location.href = '/admin';
  return null;
}

const adminRoutes = (
  <Route path="/admin" element={<AdminLayout />}>
    <Route index element={<AdminLoginRedirect />} />
    <Route path="manage-citizens" element={<ManageCitizens />} />
    <Route path="dashboard" element={<AdminDashboard />} />
    <Route path="add-collector" element={<AdminPlaceholder />} />
    <Route path="view-collectors" element={<AdminPlaceholder />} />
    <Route path="green-champions" element={<AdminPlaceholder />} />
    <Route path="champion-requests" element={<AdminPlaceholder />} />
    <Route path="approval-requests" element={<AdminPlaceholder />} />
    <Route path="reports" element={<AdminPlaceholder />} />
    <Route path="home-pickup-requests" element={<AdminPlaceholder />} />
    <Route path="eco-shopping" element={<EcoShoppingOrders />} />
    <Route path="eco-shopping/buyers" element={<EcoProductBuyers />} />
    <Route path="broadcast" element={<AdminPlaceholder />} />
    <Route path="broadcast-history" element={<AdminPlaceholder />} />
    <Route path="settings" element={<AdminPlaceholder />} />
    <Route path="notifications" element={<AdminPlaceholder />} />
  </Route>
);

export default adminRoutes;
