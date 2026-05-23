import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin    from './pages/AdminLogin';
import AdminLayout   from './layouts/AdminLayout';
import Dashboard     from './pages/Dashboard';
import AddCollector  from './pages/AddCollector';
import ViewCollectors from './pages/ViewCollectors';
import Reports from './pages/Reports';
import ViewGreenChampions from './pages/ViewGreenChampions';
import GreenChampionRequests from './pages/GreenChampionRequests';
import EcoShopping from './pages/EcoShopping';
import AdminNotifications from './pages/AdminNotifications';
import Settings from './pages/Settings';
import ApprovalRequests from './pages/ApprovalRequests';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('admin-token');
  return token ? children : <Navigate to="/admin/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"      element={<Dashboard />} />
          <Route path="add-collector"  element={<AddCollector />} />
          <Route path="collectors"     element={<ViewCollectors />} />
          <Route path="reports"        element={<Reports />} />
          <Route path="champions"      element={<ViewGreenChampions />} />
          <Route path="champion-requests" element={<GreenChampionRequests />} />
          <Route path="approval-requests" element={<ApprovalRequests />} />
          <Route path="eco-shopping"   element={<EcoShopping />} />
          <Route path="notifications"  element={<AdminNotifications />} />
          <Route path="settings"       element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
