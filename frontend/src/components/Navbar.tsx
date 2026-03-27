import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bars3Icon, BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import logo from '../assets/curenet_logo.png';
import NotificationCenterModal from './NotificationCenterModal';

const navLinks = [
  { to: '/', label: 'HOME' },
  { to: '/doctors', label: 'ALL DOCTORS' },
  { to: '/about', label: 'ABOUT' },
  { to: '/contact', label: 'CONTACT US' },
];

const API_ORIGIN = import.meta.env.VITE_API_URL
  ? new URL(import.meta.env.VITE_API_URL).origin
  : 'http://localhost:5000';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { unreadCount: number } }>('/notifications?limit=10');
      return data.data;
    },
    enabled: !!user,
  });

  const displayName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'User' : '';
  const initial = (user?.firstName?.charAt(0) ?? user?.lastName?.charAt(0) ?? '?').toUpperCase();
  const profileImageUrl = user?.profileImage
    ? user.profileImage.startsWith('http')
      ? user.profileImage
      : `${API_ORIGIN}${user.profileImage}`
    : null;
  const showProfileImage = Boolean(profileImageUrl) && !profileImageFailed;
  const unreadCount = notificationsData?.unreadCount ?? 0;

  useEffect(() => {
    setProfileImageFailed(false);
  }, [profileImageUrl]);

  useEffect(() => {
    if (!user) {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      return;
    }

    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const streamUrl = `${base.replace(/\/$/, '')}/notifications/stream`;
    const source = new EventSource(streamUrl, { withCredentials: true });
    eventSourceRef.current = source;

    source.addEventListener('notification', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent<string>).data) as {
          id: number;
          title: string;
          message: string;
        };
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'summary'] });
        toast(payload.title, {
          icon: '🔔',
        });
      } catch {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'summary'] });
      }
    });

    return () => {
      source.close();
      if (eventSourceRef.current === source) eventSourceRef.current = null;
    };
  }, [queryClient, user]);

  const dashboardPath =
    user?.role === 'patient'
      ? '/app/patient-dashboard'
      : user?.role === 'doctor'
        ? '/app/doctor-dashboard'
        : '/app/admin-dashboard';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/50 shadow-sm font-sans w-full transition-all relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 shrink-0 group" onClick={closeMobileMenu}>
          <img src={logo} className="w-32 md:w-36 object-contain group-hover:opacity-90 transition-opacity" alt="CureNET" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative px-4 py-2 text-[13px] font-bold tracking-wide transition-all duration-300 rounded-full ${isActive
                  ? 'text-blue-700 bg-blue-50/80 shadow-sm'
                  : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex gap-3 items-center shrink-0 border-l border-slate-200 pl-4 lg:pl-6 ml-2">
          {user ? (
            <>
              <Link
                to="#"
                onClick={(event) => {
                  event.preventDefault();
                  setNotificationOpen(true);
                }}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
              >
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 min-w-[1.25rem] rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </Link>
              <Link
                to={dashboardPath}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors group"
              >
                {showProfileImage ? (
                  <img
                    src={profileImageUrl || undefined}
                    alt={displayName}
                    onError={() => setProfileImageFailed(true)}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-100 shadow-sm transition-all group-hover:shadow"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm group-hover:shadow transition-all">
                    {initial}
                  </div>
                )}
                <span className="text-slate-700 text-sm font-bold group-hover:text-blue-600 transition-colors truncate max-w-[140px]">
                  {displayName}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-slate-500 text-sm font-bold hover:text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-600 text-sm font-bold hover:text-blue-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                Log in
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-full text-[13px] tracking-wide font-bold hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                SIGN UP
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors focus:outline-none"
          onClick={() => setMobileMenuOpen((o) => !o)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl shadow-xl z-40">
          <div className="w-full px-5 py-6 flex flex-col gap-2 max-h-[calc(100vh-80px)] overflow-y-auto">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `text-[15px] font-bold tracking-wide transition-colors py-3.5 px-5 rounded-2xl ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                  }`
                }
                onClick={closeMobileMenu}
              >
                {label}
              </NavLink>
            ))}

            <div className="my-3 border-t border-slate-100"></div>

            {user ? (
              <div className="flex flex-col gap-2">
                <Link
                  to="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setNotificationOpen(true);
                    closeMobileMenu();
                  }}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-5 py-4 text-slate-800 transition-colors hover:text-blue-600"
                >
                  <span className="inline-flex items-center gap-3 font-bold">
                    <BellIcon className="h-5 w-5" />
                    Notifications
                  </span>
                  {unreadCount > 0 ? (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : null}
                </Link>
                <Link
                  to={dashboardPath}
                  className="flex items-center gap-3 text-slate-800 font-bold hover:text-blue-600 bg-slate-50 px-5 py-4 rounded-2xl transition-colors"
                  onClick={closeMobileMenu}
                >
                  {showProfileImage ? (
                    <img
                      src={profileImageUrl || undefined}
                      alt={displayName}
                      onError={() => setProfileImageFailed(true)}
                      className="h-10 w-10 rounded-full object-cover shadow-md ring-2 ring-white shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md shrink-0">
                      {initial}
                    </div>
                  )}
                  <div className="truncate">
                    <div className="text-[15px] truncate">{displayName}</div>
                    <div className="text-xs text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">
                      {user.role} Dashboard
                    </div>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left text-rose-600 text-[15px] font-bold hover:bg-rose-50 mt-2 px-5 py-3.5 rounded-2xl transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pb-2">
                <Link
                  to="/login"
                  className="w-full bg-slate-100 text-slate-700 text-center py-3.5 rounded-full font-bold hover:bg-slate-200 transition-colors"
                  onClick={closeMobileMenu}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-3.5 rounded-full font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all tracking-wide"
                  onClick={closeMobileMenu}
                >
                  SIGN UP
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {notificationOpen ? <NotificationCenterModal onClose={() => setNotificationOpen(false)} /> : null}
    </nav>
  );
};

export default Navbar;
