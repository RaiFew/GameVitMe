import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Sun, Moon, Menu, X, Gamepad2, Users, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';

export default function Navbar() {
  const { isAuthenticated, clearUser, user } = useAuthStore();
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: isAuthenticated ? '/dashboard' : '/' },
    { name: 'Games', path: '/games' },
    ...(isAuthenticated
      ? [
          { name: 'Friends', path: '/friends' },
          { name: 'Profile', path: '/profile' },
        ]
      : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xs sticky top-0 z-40 transition-colors">
      <div className="container mx-auto px-4 h-16 flex justify-between items-center max-w-7xl">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-black tracking-tighter text-lg uppercase text-black dark:text-white group">
          <div className="w-7 h-7 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-mono font-bold text-xs rounded-xs">
            PG
          </div>
          <span className="font-mono tracking-widest text-sm">PARTY//GAME</span>
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition-colors rounded-xs ${
                  isActive(link.path)
                    ? 'text-black dark:text-white bg-zinc-100 dark:bg-zinc-800/80 font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Auth Action */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                {user?.displayName}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={clearUser}
                className="text-xs py-1.5 px-3 h-8"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button size="sm" className="text-xs py-1.5 px-4 h-8">
                Login
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile controls: Theme toggle + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors rounded-xs"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors rounded-xs"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 text-xs uppercase tracking-wider font-semibold rounded-xs ${
                  isActive(link.path)
                    ? 'text-black dark:text-white bg-zinc-100 dark:bg-zinc-800 font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            {isAuthenticated ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-mono text-zinc-500">{user?.displayName}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearUser();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link to="/login" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" className="w-full text-xs">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
