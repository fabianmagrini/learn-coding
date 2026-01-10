import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './features/auth/store/authStore';
import { Onboarding } from './features/onboarding/pages/Onboarding';
import { Feed } from './features/feed/pages/Feed';
import { Login } from './features/auth/pages/Login';
import { Register } from './features/auth/pages/Register';

function App() {
  const { isAuthenticated, isOnboarded } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {isAuthenticated && !isOnboarded && (
          <Route path="/onboarding" element={<Onboarding />} />
        )}

        {isAuthenticated && isOnboarded && (
          <>
            <Route path="/feed" element={<Feed />} />
            <Route path="/" element={<Navigate to="/feed" replace />} />
          </>
        )}

        {!isAuthenticated && (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}

        {isAuthenticated && !isOnboarded && (
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
