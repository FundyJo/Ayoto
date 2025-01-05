import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';  // Import HashRouter
import { useEffect } from 'react';
import {
  Profile,
  Navbar,
  ThemeProvider,
  Footer,
  Home,
  Watch,
  Search,
  Page404,
  About,
  PolicyTerms,
  ShortcutsPopup,
  ScrollToTop,
  usePreserveScrollOnReload,
  Callback,
  ApolloClientProvider,
  Settings,
  SettingsProvider,
} from './index.ts';
import { register } from 'swiper/element/bundle';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './client/useAuth.tsx';
import ReactGA from 'react-ga4';
import Addons from './pages/Addons.tsx';
import NotificationTray from './components/NotificationTray.tsx';

register();

function App() {
  usePreserveScrollOnReload();

  return (
    <ApolloClientProvider>
      <Router> {/* Verwende HashRouter hier */}
        <AuthProvider>
          <ThemeProvider>
            <SettingsProvider>
              <Navbar />
              <ShortcutsPopup />
              <ScrollToTop />
              <TrackPageViews />
              <div style={{ minHeight: '35rem' }}>
                <Routes>
                  <Route path='/' element={<Home />} />
                  <Route path='/home' element={<Home />} />
                  <Route path='/search' element={<Search />} />
                  <Route path='/watch/:animeId' element={<Watch />} />
                  <Route
                    path='/watch/:animeId/:seasonNumber/:episodeNumber'
                    element={<Watch />}
                  />
                  <Route path='/addons' element={<Addons />} />
                  <Route path='/profile' element={<Profile />} />
                  <Route path='/profile/settings' element={<Settings />} />
                  <Route path='/about' element={<About />} />
                  <Route path='/pptos' element={<PolicyTerms />} />
                  <Route path='/callback' element={<Callback />} />
                  <Route path='*' element={<Page404 />} />
                </Routes>
              </div>
              <Footer />
              <NotificationTray /> {/* Das Notification Tray hinzufügen */}
            </SettingsProvider>
          </ThemeProvider>
        </AuthProvider>
      </Router>
      <Analytics />
    </ApolloClientProvider>
  );
}

function TrackPageViews() {
  const { pathname } = useLocation();

  useEffect(() => {
    ReactGA.send({ hitType: 'pageview', page: pathname });
  }, [pathname]);

  return null;
}

export default App;
