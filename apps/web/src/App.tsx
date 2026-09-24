import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/layout/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { FriendsPage } from './pages/FriendsPage';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { JoinRoomPage } from './pages/JoinRoomPage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import HomePage from './pages/HomePage';
import GamesPage from './pages/GamesPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-900 dark:text-zinc-100">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-black dark:border-white border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function App() {
  const location = useLocation();
  const isGameRoute = location.pathname.startsWith('/game/');

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col transition-colors">
      {!isGameRoute && <Navbar />}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join" element={<JoinRoomPage />} />
          <Route path="/join/:roomCode" element={<JoinRoomPage />} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
          <Route path="/room/create" element={<ProtectedRoute><CreateRoomPage /></ProtectedRoute>} />
          <Route path="/lobby/:roomCode" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
          <Route path="/game/:roomCode" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}
