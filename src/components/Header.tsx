import React, { useEffect, useState } from 'react';
import { useStore, AppView } from '../context/StoreContext.tsx';
import {
  ShoppingBag,
  LayoutGrid,
  Shield,
  UserCheck,
  Truck,
  Award,
  Settings2,
  Lock,
  KeyRound,
  LogOut,
  LogIn,
  CheckCircle2,
  User,
  Bell,
  CheckCheck,
  Receipt,
  Menu,
  X,
} from 'lucide-react';
import { ChangePinModal } from './auth/ChangePinModal.tsx';
import { ChangePasswordModal } from './auth/ChangePasswordModal.tsx';
import { LocationSharingControl } from './location/LocationSharingControl.tsx';
import { translate } from '../utils/translations.ts';

interface HeaderProps {
  onOpenCart: () => void;
  onOpenStoreSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCart, onOpenStoreSettings }) => {
  const {
    currentView,
    setCurrentView,
    cart,
    currentUser,
    lockSystem,
    logout,
    openAuthModal,
    languagePreference,
    setLanguagePreference,
    darkMode,
    setDarkMode,
    fontSizePreference,
    setFontSizePreference,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useStore();
  const t = (text: string, values?: Record<string, string | number>) =>
    translate(text, languagePreference, values);

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setShowNotifications(false);
  }, [currentView]);

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    setIsNavMenuOpen(false);
    setShowNotifications(false);
    setShowSettings(false);
    setShowRoleMenu(false);
  };

  const closeHeaderPopovers = () => {
    setShowNotifications(false);
    setShowSettings(false);
    setShowRoleMenu(false);
    setIsNavMenuOpen(false);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const unreadNotifications = currentUser
    ? notifications.filter((notification) => !notification.readBy.includes(currentUser.id))
    : [];
  const canManageStoreSettings =
    currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const navItems: { view: AppView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { view: 'storefront', label: 'Shop', icon: <ShoppingBag className="w-4 h-4" /> },
    {
      view: 'dragdrop_dashboard',
      label: 'Drag & Drop Dashboard',
      icon: <LayoutGrid className="w-4 h-4 text-[#ab3425]" />,
      badge: 'Live',
    },
    { view: 'admin', label: 'Admin', icon: <Shield className="w-4 h-4" /> },
    { view: 'manager', label: 'Manager', icon: <UserCheck className="w-4 h-4" /> },
    { view: 'driver', label: 'Courier', icon: <Truck className="w-4 h-4" /> },
    { view: 'member', label: 'Alex (Member)', icon: <Award className="w-4 h-4" /> },
    { view: 'invoices', label: 'Invoices', icon: <Receipt className="w-4 h-4" /> },
  ];

  return (
    <>
      <header className="fixed top-0 w-full z-40 bg-[#fcf9f3] border-b border-[#e5e2dc] shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => navigateTo('storefront')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#2c1e1a] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px] text-[#ffdad4]">local_bar</span>
            </div>
            <div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#130805] tracking-tight">
                Sip & Snack
              </span>
              <span className="hidden sm:inline-block text-[10px] text-[#817471] block leading-none font-medium">
                Artisan Food & Drinks
              </span>
            </div>
          </div>

          {/* View Nav Tabs */}
          <nav className="hidden 2xl:flex items-center gap-1 bg-[#f0eee8] p-1 rounded-full border border-[#d2c3bf]/40">
            {navItems
              .filter((item) => item.view !== 'invoices' || currentUser)
              .map((item) => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => {
                    navigateTo(item.view);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#130805] text-white shadow-sm'
                      : 'text-[#4f4542] hover:text-[#1c1c18] hover:bg-[#e5e2dc]/60'
                  }`}
                >
                  {item.icon}
                  <span>{t(item.label)}</span>
                  {item.badge && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#ab3425] text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => {
              setShowNotifications(false);
              setShowSettings(false);
              setShowRoleMenu(false);
              setIsNavMenuOpen((open) => !open);
            }}
            aria-label={isNavMenuOpen ? t('Close navigation menu') : t('Open navigation menu')}
            aria-expanded={isNavMenuOpen}
            className="2xl:hidden p-2 rounded-xl bg-[#f0eee8] hover:bg-[#ebe8e2] text-[#130805] transition-colors"
          >
            {isNavMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Right Tools & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cart Icon (with badge) */}
            <button
              type="button"
              onClick={() => {
                closeHeaderPopovers();
                onOpenCart();
              }}
              aria-label="Open Shopping Cart"
              className="relative p-2 rounded-full bg-[#f0eee8] hover:bg-[#ebe8e2] text-[#130805] transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ab3425] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Quick Settings Icon */}
            <button
              type="button"
              onClick={() => {
                setShowNotifications(false);
                setShowRoleMenu(false);
                setShowSettings((open) => !open);
              }}
              title={t('Personal settings')}
              aria-label={t('Personal settings')}
              aria-expanded={showSettings}
              aria-haspopup="dialog"
              className="p-2 rounded-full bg-[#f0eee8] hover:bg-[#ebe8e2] text-[#130805] transition-colors"
            >
              <Settings2 className="w-5 h-5" />
            </button>

            {showSettings && (
              <section
                role="dialog"
                aria-label={t('Personal settings')}
                className="fixed top-20 right-4 sm:right-6 z-50 w-[min(22rem,calc(100vw-2rem))] max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-[#e5e2dc] bg-white p-4 shadow-2xl"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#1c1c18]">{t('Personal settings')}</h2>
                    <p className="mt-1 text-xs text-[#817471]">{t('Adjust the app for your device.')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    aria-label={t('Close settings')}
                    className="rounded-lg p-2 text-[#4f4542] hover:bg-[#f0eee8]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-4 text-xs">
                  <LocationSharingControl />
                  <label className="block space-y-1.5">
                    <span className="font-semibold text-[#4f4542]">{t('Language preference')}</span>
                    <select
                      value={languagePreference}
                      onChange={(event) => setLanguagePreference(event.target.value === 'km' ? 'km' : 'en')}
                      className="w-full rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] p-2.5 text-[#1c1c18]"
                    >
                      <option value="en">English</option>
                      <option value="km">ខ្មែរ</option>
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="font-semibold text-[#4f4542]">{t('Theme')}</span>
                    <select
                      value={darkMode ? 'dark' : 'light'}
                      onChange={(event) => setDarkMode(event.target.value === 'dark')}
                      className="w-full rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] p-2.5 text-[#1c1c18]"
                    >
                      <option value="light">{t('Light')}</option>
                      <option value="dark">{t('Dark')}</option>
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="font-semibold text-[#4f4542]">{t('Font size')}</span>
                    <select
                      value={fontSizePreference}
                      onChange={(event) => {
                        const size = event.target.value;
                        if (size === 'small' || size === 'normal' || size === 'large') {
                          setFontSizePreference(size);
                        }
                      }}
                      className="w-full rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] p-2.5 text-[#1c1c18]"
                    >
                      <option value="small">{t('Small')}</option>
                      <option value="normal">{t('Normal')}</option>
                      <option value="large">{t('Large')}</option>
                    </select>
                  </label>
                </div>
                {canManageStoreSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      closeHeaderPopovers();
                      onOpenStoreSettings();
                    }}
                    className="mt-4 w-full rounded-xl bg-[#130805] px-3 py-2.5 text-left text-xs font-bold text-white hover:bg-[#2c1e1a]"
                  >
                    {t('Store Configuration & Settings')}
                  </button>
                )}
              </section>
            )}

            {currentUser && (
              <button
                type="button"
                onClick={() => navigateTo('invoices')}
                title={t('Invoices')}
                aria-label={t('Invoices')}
                className="2xl:hidden p-2 rounded-full bg-[#f0eee8] hover:bg-[#ebe8e2] text-[#130805] transition-colors"
              >
                <Receipt className="w-5 h-5" />
              </button>
            )}

            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setShowRoleMenu(false);
                    setIsNavMenuOpen(false);
                    setShowNotifications((open) => !open);
                  }}
                  title={t('Notifications')}
                  aria-label={`${t('Notifications')}${unreadNotifications.length ? ` (${unreadNotifications.length} ${t('unread')})` : ''}`}
                  aria-expanded={showNotifications}
                  className="relative p-2 rounded-full bg-[#f0eee8] hover:bg-[#ebe8e2] text-[#130805] transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-[#ab3425] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                      {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <section
                    aria-label={t('Notifications')}
                    className="fixed top-20 left-2 right-2 sm:left-auto sm:right-2 sm:w-96 max-h-[calc(100dvh-6rem)] overflow-hidden bg-white rounded-2xl shadow-2xl border border-[#e5e2dc] z-50"
                  >
                    <div className="p-3 flex items-center justify-between border-b border-[#e5e2dc]">
                      <h2 className="text-sm font-bold text-[#1c1c18]">{t('Notifications')}</h2>
                      {unreadNotifications.length > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="text-[11px] font-semibold text-[#ab3425] hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          {t('Mark all read')}
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto overscroll-contain max-h-[calc(100dvh-10rem)] divide-y divide-[#f0eee8]">
                      {notifications.length === 0 ? (
                        <p className="p-6 text-center text-xs text-[#817471]">{t('No notifications yet.')}</p>
                      ) : (
                        notifications.slice(0, 30).map((notification) => {
                          const isRead = notification.readBy.includes(currentUser.id);
                          return (
                            <article
                              key={notification.id}
                              className={`p-3 ${isRead ? 'bg-white' : 'bg-[#fff8f5]'}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`mt-1.5 w-2 h-2 shrink-0 rounded-full ${isRead ? 'bg-transparent' : 'bg-[#ab3425]'}`} />
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-xs font-bold text-[#1c1c18]">{t(notification.title)}</h3>
                                  <p className="mt-1 text-xs text-[#4f4542] break-words">
                                    {t(notification.message, notification.values)}
                                  </p>
                                  <time className="mt-1 block text-[10px] text-[#817471]">
                                    {new Date(notification.createdAt).toLocaleString(languagePreference === 'km' ? 'km-KH' : 'en-US')}
                                  </time>
                                </div>
                                {!isRead && (
                                  <button
                                    type="button"
                                    onClick={() => markNotificationRead(notification.id)}
                                    className="shrink-0 text-[10px] font-semibold text-[#ab3425] hover:underline"
                                  >
                                    {t('Mark read')}
                                  </button>
                                )}
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Quick Lock System Button (with PIN lock icon) */}
            {currentUser && (
              <button
                onClick={() => {
                  closeHeaderPopovers();
                  lockSystem();
                }}
                title={t('Lock Session')}
                aria-label={t('Lock Session')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 transition-colors shadow-xs"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span className="text-[11px] font-bold hidden md:inline-block">Lock PIN</span>
              </button>
            )}

            {/* Account / User & Role Dropdown */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    setShowSettings(false);
                    setShowRoleMenu(!showRoleMenu);
                  }}
                  className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-[#2c1e1a] text-white hover:bg-[#130805] transition-colors shadow-sm"
                >
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-6 h-6 rounded-full object-cover border border-white/40"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#ffdad4] text-[#130805] font-bold text-xs flex items-center justify-center">
                      {currentUser.name[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold max-w-[100px] truncate hidden sm:inline-block">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-[#e5e2dc] p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {/* User Profile Summary */}
                    <div className="p-3 rounded-xl bg-[#fcf9f3] border border-[#e5e2dc] mb-2">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        {currentUser.avatar ? (
                          <img
                            src={currentUser.avatar}
                            alt={currentUser.name}
                            className="w-9 h-9 rounded-full object-cover border border-[#ab3425]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#2c1e1a] text-white flex items-center justify-center font-bold text-sm">
                            {currentUser.name[0]}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[#130805] truncate">
                            {currentUser.name}
                          </div>
                          <div className="text-[10px] text-[#817471] truncate">
                            {currentUser.email}
                          </div>
                          {currentUser.createdAt && Number.isFinite(Date.parse(currentUser.createdAt)) && (
                            <div className="mt-0.5 text-[10px] text-[#817471]">
                              {currentUser.createdByAdmin ? t('Created by administrator') : t('Account created')}
                              {' · '}{new Date(currentUser.createdAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-[#e5e2dc]/80 text-[10px]">
                        <span className="px-2 py-0.5 rounded-full font-bold uppercase bg-[#ab3425] text-white">
                          {t(currentUser.role === 'driver' ? 'Courier' : currentUser.role)}
                        </span>
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('PIN Configured')}</span>
                        </span>
                      </div>
                    </div>

                    {/* PIN and Security Actions */}
                    <div className="space-y-1 mb-2">
                      <button
                        onClick={() => {
                          setShowRoleMenu(false);
                          setIsChangePasswordOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#1c1c18] hover:bg-[#f6f3ed] flex items-center gap-2 transition-all"
                      >
                        <Lock className="w-4 h-4 text-[#ab3425]" />
                        <span>{t('Change Password')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowRoleMenu(false);
                          setIsChangePinOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#1c1c18] hover:bg-[#f6f3ed] flex items-center gap-2 transition-all"
                      >
                        <KeyRound className="w-4 h-4 text-[#ab3425]" />
                        <span>{t('Change Security PIN')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowRoleMenu(false);
                          lockSystem();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#1c1c18] hover:bg-amber-50 flex items-center gap-2 transition-all"
                      >
                        <Lock className="w-4 h-4 text-amber-700" />
                        <span>{t('Lock System (PIN Unlock)')}</span>
                      </button>
                    </div>

                    {/* Log Out Button */}
                    <div className="mt-2 pt-2 border-t border-[#f0eee8]">
                      <button
                        onClick={() => {
                          setShowRoleMenu(false);
                          logout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('Exit')}</span>
                      </button>
                      <p className="text-[10px] text-[#817471] px-3 pt-0.5 pb-1">
                        {t('Exit signs you out. Sign in with email and password, then enter your PIN.')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* When logged out */
              <button
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ab3425] hover:bg-[#8f2b1e] text-white text-xs font-bold shadow-sm transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('Log In / Register')}</span>
              </button>
            )}
          </div>
        </div>
        {isNavMenuOpen && (
          <nav
            aria-label={t('Main navigation')}
            className="2xl:hidden absolute top-full left-0 right-0 max-h-[calc(100vh-4rem)] overflow-y-auto bg-[#fcf9f3] border-b border-[#e5e2dc] shadow-xl p-3"
          >
            <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-2 gap-2">
              {navItems
                .filter((item) => item.view !== 'invoices' || currentUser)
                .map((item) => (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => {
                      navigateTo(item.view);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-colors ${
                      currentView === item.view
                        ? 'bg-[#130805] text-white'
                        : 'bg-[#f0eee8] text-[#1c1c18] hover:bg-[#e5e2dc]'
                    }`}
                  >
                    {item.icon}
                    <span>{t(item.label)}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#ab3425] text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </nav>
        )}
      </header>

      {/* Change PIN Modal */}
      <ChangePinModal
        isOpen={isChangePinOpen}
        onClose={() => setIsChangePinOpen(false)}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
};
