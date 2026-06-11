import { Route, Navigate } from 'react-router-dom';
import CitizenLayout from '../../shared/layouts/CitizenLayout';
import CitizenDashboard from '../dashboard/CitizenDashboard';
import HomeWasteReports from '../reports/HomeWasteReports';
import PublicWasteReports from '../reports/PublicWasteReports';
import MyRewards from '../rewards/MyRewards';
import NearbyIssues from '../../shared/pages/NearbyIssues';
import Notifications from '../notifications/Notifications';
import Leaderboard from '../leaderboard/Leaderboard';
import CitizenProfile from '../profile/CitizenProfile';
import CollectorDetails from '../collectorDetails/CollectorDetails';
import CompleteProfile from '../profile/CompleteProfile';
import Settings from '../settings/Settings';
import HelpSupport from '../helpSupport/HelpSupport';
import SellScrap from '../scrap/SellScrap';
import MyScrapRequests from '../scrap/MyScrapRequests';
import ReportWastePage from '../reports/ReportWastePage';
import MyReports from '../reports/MyReports';
import EcoShoppingPage from '../ecoShopping/EcoShoppingPage';
import MyOrders from '../ecoShopping/MyOrders';
import CommunityUpdates from '../../shared/pages/CommunityUpdates';

const citizenRoutes = (
   <Route path="/citizen" element={<CitizenLayout />}>
     <Route index element={<Navigate to="dashboard" replace />} />
     <Route path="dashboard" element={<CitizenDashboard />} />
     <Route path="home-reports" element={<HomeWasteReports />} />
     <Route path="public-reports" element={<PublicWasteReports />} />
     <Route path="my-reports" element={<MyReports />} />
     <Route path="report-waste" element={<ReportWastePage />} />
     <Route path="my-rewards" element={<MyRewards />} />
     <Route path="rewards" element={<MyRewards />} />
     <Route path="nearby-issues" element={<NearbyIssues />} />
     <Route path="leaderboard" element={<Leaderboard />} />
     <Route path="notifications" element={<Notifications />} />
      <Route path="profile" element={<CitizenProfile />} />
      <Route path="complete-profile" element={<CompleteProfile />} />
     <Route path="settings" element={<Settings />} />
     <Route path="help-support" element={<HelpSupport />} />
     <Route path="sell-scrap" element={<SellScrap />} />
     <Route path="scrap-requests" element={<MyScrapRequests />} />
     <Route path="eco-shopping" element={<EcoShoppingPage />} />
     <Route path="my-orders" element={<MyOrders />} />
     <Route path="community" element={<CommunityUpdates />} />
     <Route path="collector-details" element={<CollectorDetails />} />
   </Route>
 );

export default citizenRoutes;
