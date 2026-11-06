import { lazy, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthProvider } from './context/AuthContext';
import { CatalogueProvider } from './context/CatalogueContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/layout/Layout';
import { RouterProvider, Routes, type RouteDef } from './router/router';
import { HomePage } from './pages/HomePage';

// Lazy-loaded routes for code splitting and dramatically smaller initial bundle size
const ShopPage = lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const ProductPage = lazy(() => import('./pages/ProductPage').then((m) => ({ default: m.ProductPage })));
const VibesPage = lazy(() => import('./pages/VibesPage').then((m) => ({ default: m.VibesPage })));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage').then((m) => ({ default: m.ReviewsPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const BuildWallPage = lazy(() => import('./pages/BuildWallPage').then((m) => ({ default: m.BuildWallPage })));
const CreateStickersPage = lazy(() => import('./pages/CreateStickersPage').then((m) => ({ default: m.CreateStickersPage })));
const BuildPackPage = lazy(() => import('./pages/BuildPackPage').then((m) => ({ default: m.BuildPackPage })));
const CollectiblesPage = lazy(() => import('./pages/CollectiblesPage').then((m) => ({ default: m.CollectiblesPage })));
const DuosPage = lazy(() => import('./pages/CollectionLandingPages').then((m) => ({ default: m.DuosPage })));
const SecretMessagesPage = lazy(() => import('./pages/CollectionLandingPages').then((m) => ({ default: m.SecretMessagesPage })));
const PassportPage = lazy(() => import('./pages/PassportPage').then((m) => ({ default: m.PassportPage })));
const RarityPage = lazy(() => import('./pages/RarityPage').then((m) => ({ default: m.RarityPage })));
const VotePage = lazy(() => import('./pages/VotePage').then((m) => ({ default: m.VotePage })));
const AuthPage = lazy(() => import('./pages/AccountPages').then((m) => ({ default: m.AuthPage })));
const CustomerDashboard = lazy(() => import('./pages/AccountPages').then((m) => ({ default: m.CustomerDashboard })));
const AdminDashboard = lazy(() => import('./pages/AccountPages').then((m) => ({ default: m.AdminDashboard })));
const AboutPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.AboutPage })));
const FaqPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.FaqPage })));
const ContactPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.ContactPage })));
const PolicyPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.PolicyPage })));
const NotFoundPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.NotFoundPage })));

function PageLoadingFallback() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-16" aria-label="Loading page">
      <div className="size-8 animate-spin rounded-full border-4 border-mint/20 border-t-lime" />
    </div>
  );
}

// Every page of the site. The first matching path wins; '*' catches the rest.
const routes: RouteDef[] = [
  { path: '/', element: <HomePage /> },
  { path: '/shop', element: <ShopPage /> },
  { path: '/vibes', element: <VibesPage /> },
  { path: '/reviews', element: <ReviewsPage /> },
  { path: '/product/:slug', element: <ProductPage /> },
  { path: '/create-your-stickers', element: <CreateStickersPage /> },
  { path: '/build-your-wall', element: <BuildWallPage /> },
  { path: '/collectibles', element: <CollectiblesPage /> },
  { path: '/build-your-pack', element: <BuildPackPage /> },
  { path: '/matching-duos', element: <DuosPage /> },
  { path: '/secret-messages', element: <SecretMessagesPage /> },
  { path: '/rare-collections', element: <RarityPage /> },
  { path: '/collector-passport', element: <PassportPage /> },
  { path: '/vote-next-drop', element: <VotePage /> },
  { path: '/checkout', element: <CheckoutPage /> },
  { path: '/login', element: <AuthPage mode="login" /> },
  { path: '/register', element: <AuthPage mode="register" /> },
  { path: '/forgot-password', element: <AuthPage mode="forgot" /> },
  { path: '/reset-password', element: <AuthPage mode="reset" /> },
  {
    path: '/account',
    element: (
      <ProtectedRoute role="CUSTOMER">
        <CustomerDashboard />
      </ProtectedRoute>
    ),
  },
  { path: '/admin/login', element: <AuthPage mode="admin" /> },
  {
    path: '/admin',
    element: (
      <ProtectedRoute role="ADMIN">
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  { path: '/about', element: <AboutPage /> },
  { path: '/faq', element: <FaqPage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/terms', element: <PolicyPage slug="terms" /> },
  { path: '/privacy', element: <PolicyPage slug="privacy" /> },
  { path: '/shipping', element: <PolicyPage slug="shipping" /> },
  { path: '/shipping-delivery', element: <PolicyPage slug="shipping" /> },
  { path: '/returns', element: <PolicyPage slug="returns" /> },
  { path: '/refund', element: <PolicyPage slug="returns" /> },
  { path: '/refund-cancellation', element: <PolicyPage slug="returns" /> },
  { path: '/policies/:slug', element: <PolicyPage /> },
  { path: '*', element: <NotFoundPage /> },
];

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <CatalogueProvider>
          <CartProvider>
            <Layout>
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes routes={routes} />
              </Suspense>
            </Layout>
            <Analytics />
            <SpeedInsights />
          </CartProvider>
        </CatalogueProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
