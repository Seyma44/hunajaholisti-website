import React, { useState, useMemo } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Navbar from './layout/Navbar';
import Home from './pages/Home';
import OurStory from './pages/OurStory';
import Products from './pages/Products';
import SalesAndDeliveryConditions from './pages/SalesAndDeliveryConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Payment from './Payment';
import Footer from './layout/Footer';
import { LanguageContext } from './components/LanguageContext';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Success from './components/Success';
import { CartProvider } from './components/CartContext';
import Modal from './components/Modal';
import PrivateRoute from './components/PrivateRoute';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import './index.css';
import Gallery from './pages/Gallery';

// Call loadStripe outside of a component's render to avoid recreating the Stripe object on every render
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''
);

function App() {
  const [language, setLanguage] = useState('fi');
  const [cookieConsent, setCookieConsent] = useState(
    () => localStorage.getItem('cookieConsent') ?? ''
  );

  const contextValue = useMemo(() => ({ language, setLanguage }), [
    language,
    setLanguage,
  ]);

  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="flex flex-col min-h-screen">
      <CartProvider cookieConsent={cookieConsent}>
        <LanguageContext.Provider value={contextValue}>
          <div className="flex-grow">
            <Elements stripe={stripePromise}>
              {isLoginPage ? null : <Navbar />} {/* Conditionally render Navbar */}
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/tarinamme" element={<OurStory />} />
                <Route path="/tuotteemme" element={<Products />} />
                <Route path="/galleria" element={<Gallery />} />
                <Route
                  path="/myyntiehdot"
                  element={<SalesAndDeliveryConditions />}
                />
                <Route path="/tietosuojaseloste" element={<PrivacyPolicy />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/cart" element={<Cart />} />
                <Route
                  path="/checkout"
                  element={
                    <PrivateRoute
                      path="/checkout"
                      redirectTo="/"
                      element={<Checkout />}
                    />
                  }
                />
                {isLoginPage ? null : <Route path="/success" element={<Success />} />} {/* Conditionally render Success route */}
                {isLoginPage ? null : <Route path="/profile" element={<ProfilePage />} />} {/* Conditionally render ProfilePage route */}
                <Route path="/login" element={<LoginPage />} />
              </Routes>
            </Elements>
          </div>
          {cookieConsent === '' && (
            <Modal
              onAccept={() => {
                setCookieConsent('true');
                localStorage.setItem('cookieConsent', 'true');
              }}
              onReject={() => {
                setCookieConsent('false');
                localStorage.setItem('cookieConsent', 'false');
              }}
            />
          )}
          {isLoginPage ? null : <Footer />} {/* Conditionally render Footer */}
        </LanguageContext.Provider>
      </CartProvider>
    </div>
  );
}

export default App;
