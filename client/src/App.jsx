import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './shared/pages/LandingPage';
import DashboardPlaceholder from './shared/pages/DashboardPlaceholder';
import citizenRoutes from './citizen/routes/CitizenRoutes.jsx';
import collectorRoutes from './collector/routes/CollectorRoutes.jsx';
import greenRoutes from './greenChampion/routes/GreenRoutes.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPlaceholder />} />
        <Route path="/collector-dashboard" element={<DashboardPlaceholder />} />
        <Route path="/green-dashboard" element={<DashboardPlaceholder />} />
        {citizenRoutes}
        {collectorRoutes}
        {greenRoutes}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
