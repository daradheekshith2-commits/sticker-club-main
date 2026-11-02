import { AuthProvider } from './context/AuthContext';
import { CatalogueProvider } from './context/CatalogueContext';
import { AuthPage, CustomerDashboard, AdminDashboard } from './pages/AccountPages';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/layout/Layout';
import { RouterProvider, Routes, type RouteDef } from './router/router';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductPage } from './pages/ProductPage';
import { VibesPage } from './pages/VibesPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { BuildWallPage } from './pages/BuildWallPage';
import { CreateStickersPage } from './pages/CreateStickersPage';
import { BuildPackPage } from './pages/BuildPackPage';
import { CollectiblesPage } from './pages/CollectiblesPage';
import { DuosPage, SecretMessagesPage } from './pages/CollectionLandingPages';
import { PassportPage } from './pages/PassportPage';
import { RarityPage } from './pages/RarityPage';
import { VotePage } from './pages/VotePage';
import { AboutPage, ContactPage, FaqPage, NotFoundPage, PolicyPage } from './pages/InfoPages';

// Every page of the site. The first matching path wins; '*' catches the rest.
const routes: RouteDef[] = [
  { path: '/', element: <HomePage /> },
  { path: '/shop', element: <ShopPage /> },
  { path: '/vibes', element: <VibesPage /> },
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
              <Routes routes={routes} />
            </Layout>
          </CartProvider>
        </CatalogueProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
