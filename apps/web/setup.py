import os

def write_file(filepath, content):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

base_dir = r"d:\ProjectGameWeb\apps\web\src"

files = {
    f"{base_dir}/App.tsx": """
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Navbar from './components/layout/Navbar';

// Dummy Pages
const HomePage = () => <div className="p-4">Home</div>;
const LoginPage = () => <div className="p-4">Login</div>;
const DashboardPage = () => <div className="p-4">Dashboard</div>;

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}
""",
    f"{base_dir}/components/layout/Navbar.tsx": """
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function Navbar() {
  const { isAuthenticated, clearUser } = useAuthStore();
  
  return (
    <nav className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
          Party Games
        </Link>
        <div className="flex gap-4 items-center">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="hover:text-cyan-400 transition-colors">Dashboard</Link>
              <button onClick={clearUser} className="px-4 py-2 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors">Logout</button>
            </>
          ) : (
            <Link to="/login" className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl font-bold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
"""
}

for filepath, content in files.items():
    write_file(filepath, content)
    print(f"Created {filepath}")
