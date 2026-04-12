import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin    from './pages/AdminLogin';
import AdminLayout   from './layouts/AdminLayout';
import Dashboard     from './pages/Dashboard';
import AddCollector  from './pages/AddCollector';
import ViewCollectors from './pages/ViewCollectors';

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
        </Route>
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
