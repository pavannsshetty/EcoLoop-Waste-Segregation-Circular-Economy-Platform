import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardPlaceholder from './pages/DashboardPlaceholder';
import CitizenDashboard from './pages/CitizenDashboard';
import CitizenProfile from './pages/CitizenProfile';
import MyReports from './pages/MyReports';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                    element={<LandingPage />} />
        <Route path="/dashboard"           element={<DashboardPlaceholder />} />
        <Route path="/citizen"             element={<CitizenDashboard />} />
        <Route path="/citizen/profile"     element={<CitizenProfile />} />
        <Route path="/my-reports"          element={<MyReports />} />
        <Route path="/collector-dashboard" element={<DashboardPlaceholder />} />
        <Route path="/green-dashboard"     element={<DashboardPlaceholder />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
