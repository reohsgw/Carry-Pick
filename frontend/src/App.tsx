import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import SparkleTrail from './components/SparkleTrail';
import { Loading } from './components/ui';
import { useSession } from './session';
import BuyerHome from './pages/BuyerHome';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import MyOrders from './pages/MyOrders';
import MyPage from './pages/MyPage';
import NewRequest from './pages/NewRequest';
import NewTrip from './pages/NewTrip';
import Notifications from './pages/Notifications';
import OfferDetail from './pages/OfferDetail';
import OfferForm from './pages/OfferForm';
import OrderChat from './pages/OrderChat';
import OrderDetail from './pages/OrderDetail';
import PayResult from './pages/PayResult';
import RequestBoard from './pages/RequestBoard';
import RequestDetail from './pages/RequestDetail';
import Search from './pages/Search';
import TravelerOffers from './pages/TravelerOffers';

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<RequireAuth><BuyerHome /></RequireAuth>} />
        <Route path="/country/:code" element={<CountryRedirect />} />
        <Route path="/search" element={<RequireAuth><Search /></RequireAuth>} />
        <Route path="/offers" element={<RequireAuth><TravelerOffers /></RequireAuth>} />
        <Route path="/offers/:id" element={<RequireAuth><OfferDetail /></RequireAuth>} />
        <Route path="/requests/new" element={<RequireAuth><NewRequest /></RequireAuth>} />
        <Route path="/my-requests/:id" element={<RequireAuth><RequestDetail /></RequireAuth>} />
        <Route path="/my-requests/:id/edit" element={<RequireAuth><NewRequest /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><MyOrders role="buyer" /></RequireAuth>} />
        <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
        <Route path="/orders/:id/chat" element={<RequireAuth><OrderChat /></RequireAuth>} />
        <Route path="/orders/:id/pay" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="/pay/success" element={<RequireAuth><PayResult success /></RequireAuth>} />
        <Route path="/pay/fail" element={<RequireAuth><PayResult success={false} /></RequireAuth>} />

        <Route path="/t" element={<Navigate to="/me" replace />} />
        <Route path="/t/trips/new" element={<RequireAuth><NewTrip /></RequireAuth>} />
        <Route path="/t/trips/:id/edit" element={<RequireAuth><NewTrip /></RequireAuth>} />
        <Route path="/t/offers/new" element={<RequireAuth><OfferForm /></RequireAuth>} />
        <Route path="/t/offers/:id/edit" element={<RequireAuth><OfferForm /></RequireAuth>} />
        <Route path="/t/requests" element={<RequireAuth><RequestBoard /></RequireAuth>} />
        <Route path="/t/requests/:id" element={<RequireAuth><RequestDetail /></RequireAuth>} />
        <Route path="/t/orders" element={<RequireAuth><MyOrders role="traveler" /></RequireAuth>} />

        <Route path="/me" element={<RequireAuth><MyPage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SparkleTrail />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/** The old per-country list was merged into /offers; keep its links working. */
function CountryRedirect() {
  const { code = 'ALL' } = useParams();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set('country', code);
  return <Navigate to={`/offers?${params}`} replace />;
}
