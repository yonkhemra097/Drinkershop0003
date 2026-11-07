/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import type { AppView } from './context/StoreContext.tsx';
import { Header } from './components/Header.tsx';
import { StorefrontView } from './components/storefront/StorefrontView.tsx';
import { DragDropDashboard } from './components/dashboard/DragDropDashboard.tsx';
import { AdminControlCenter } from './components/admin/AdminControlCenter.tsx';
import { ManagerOperations } from './components/manager/ManagerOperations.tsx';
import { DriverDeliveries } from './components/driver/DriverDeliveries.tsx';
import { MemberDashboard } from './components/member/MemberDashboard.tsx';
import { CartDrawer } from './components/storefront/CartDrawer.tsx';
import { CheckoutModal } from './components/storefront/CheckoutModal.tsx';
import { ToastNotification } from './components/modals/ToastNotification.tsx';
import { EditOrderModal } from './components/modals/EditOrderModal.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { InvoicesView } from './components/invoices/InvoicesView.tsx';
import type { FulfillmentType, Order, UserRole } from './types/index.ts';
import { formatCurrency } from './utils/formatCurrency.ts';
import { translate } from './utils/translations.ts';
import { areFirebaseFunctionsEnabled } from './utils/firebaseFunctions.ts';
import { isFirebaseConfigured } from './utils/firestoreData.ts';

const canAccessView = (view: AppView, role?: UserRole): boolean => {
  if (view === 'storefront') return true;
  if (view === 'admin') {
    if (isFirebaseConfigured() && !areFirebaseFunctionsEnabled()) return false;
    return role === 'admin' || role === 'manager';
  }
  if (view === 'manager') return role === 'admin' || role === 'manager';
  if (view === 'driver') return role === 'admin' || role === 'manager' || role === 'driver';
  if (view === 'dragdrop_dashboard') return role === 'admin' || role === 'manager' || role === 'staff';
  if (view === 'member') return role === 'admin' || role === 'manager' || role === 'customer';
  if (view === 'invoices') return role === 'admin' || role === 'manager' || role === 'staff' || role === 'driver' || role === 'customer';
  return false;
};

const AppContent: React.FC = () => {
  const { currentView, setCurrentView, showToast, currentUser, openAuthModal, settings, languagePreference } = useStore();
  const t = (text: string) => translate(text, languagePreference);
  const canOpenCurrentView = canAccessView(currentView, currentUser?.role);

  const [adminInitialTab, setAdminInitialTab] = useState<'overview' | 'settings'>('overview');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  useEffect(() => {
    const handleInputFocus = (event: FocusEvent) => {
      const target = event.target;
      if (
        !(target instanceof HTMLElement) ||
        !target.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, select')
      ) {
        return;
      }

      window.setTimeout(() => {
        if (document.activeElement !== target) return;
        const visibleTop = window.visualViewport?.offsetTop ?? 0;
        const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
        const visibleBottom = visibleTop + visibleHeight;
        const bounds = target.getBoundingClientRect();
        if (bounds.top < visibleTop + 80 || bounds.bottom > visibleBottom - 24) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    };

    document.addEventListener('focusin', handleInputFocus);
    return () => document.removeEventListener('focusin', handleInputFocus);
  }, []);

  useEffect(() => {
    if (currentView !== 'admin') setAdminInitialTab('overview');
  }, [currentView]);

  const handleCheckoutSuccess = (orderNumber: string, fulfillmentType: FulfillmentType, total: number) => {
    setIsCheckoutOpen(false);
    showToast(
      fulfillmentType === 'in_store'
        ? `Order ${orderNumber} placed. Present your items and ${formatCurrency(total, settings)} to the cashier.`
        : `Order ${orderNumber} placed. Total: ${formatCurrency(total, settings)}. Kitchen and courier notified.`
    );
  };

  return (
    <div className="min-h-screen bg-[#fcf9f3] text-[#1c1c18] flex flex-col font-['Work_Sans',sans-serif]">
      {/* Top Navbar */}
      <Header
        onOpenCart={() => setIsCartOpen(true)}
        onOpenStoreSettings={() => {
          setAdminInitialTab('settings');
          setCurrentView('admin');
        }}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-24 pb-16">
        {currentView === 'storefront' && (
          <StorefrontView onOpenCart={() => setIsCartOpen(true)} />
        )}

        {currentView === 'dragdrop_dashboard' && canOpenCurrentView && (
          <DragDropDashboard
            onEditOrder={(order) => {
              setSelectedOrderForEdit(order);
              setIsOrderModalOpen(true);
            }}
            onOpenInventoryManager={() => setCurrentView('admin')}
          />
        )}

        {currentView === 'admin' && canOpenCurrentView && <AdminControlCenter initialTab={adminInitialTab} />}

        {currentView === 'manager' && canOpenCurrentView && <ManagerOperations />}

        {currentView === 'driver' && canOpenCurrentView && <DriverDeliveries />}

        {currentView === 'member' && canOpenCurrentView && (
          <MemberDashboard isManagementView={currentUser?.role === 'manager'} />
        )}

        {currentView === 'invoices' && canOpenCurrentView && <InvoicesView />}

        {currentView !== 'storefront' && !canOpenCurrentView && (
          <section className="max-w-xl mx-auto bg-white border border-[#e5e2dc] rounded-3xl p-8 text-center">
            <h2 className="font-bold text-xl text-[#1c1c18]">{t('Access restricted')}</h2>
            <p className="text-sm text-[#817471] mt-2">
              {currentView === 'admin' && isFirebaseConfigured() && !areFirebaseFunctionsEnabled()
                ? t('Admin tools are unavailable while Cloud Functions are disabled for this Firebase project.')
                : t(currentUser
                  ? 'Your account does not have permission to open this section.'
                  : 'Sign in with an account that has access to this section.')}
            </p>
            {!currentUser && (
              <button
                onClick={() => openAuthModal('login')}
                className="mt-4 px-4 py-2 rounded-xl bg-[#ab3425] text-white font-bold text-sm"
              >
                {t('Sign in')}
              </button>
            )}
          </section>
        )}
      </main>

      {/* Footer (Matching Image 1 & Design Specs) */}
      <footer className="w-full bg-[#f6f3ed] border-t border-[#e5e2dc] py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#817471]">
          <div className="flex items-center gap-2">
            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#130805]">
              Sip & Snack
            </span>
            <span>• Artisan Drinks & Gourmet Snacks</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <button onClick={() => setCurrentView('storefront')} className="hover:text-[#130805]">
              {t('Shop')}
            </button>
            <button onClick={() => setCurrentView('dragdrop_dashboard')} className="text-[#ab3425] hover:underline font-bold">
              📊 {t('Drag & Drop Dashboard')}
            </button>
            <button onClick={() => setCurrentView('admin')} className="hover:text-[#130805]">
              {t('Admin')}
            </button>
            <button onClick={() => setCurrentView('manager')} className="hover:text-[#130805]">
              {t('Operations')}
            </button>
            <button onClick={() => setCurrentView('driver')} className="hover:text-[#130805]">
              {t('Courier')}
            </button>
          </div>

          <div>© 2024 Drink & Snack Shop. All rights reserved.</div>
        </div>
      </footer>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Edit Order Modal */}
      <EditOrderModal
        isOpen={isOrderModalOpen}
        order={selectedOrderForEdit}
        onClose={() => setIsOrderModalOpen(false)}
      />

      {/* Authentication & PIN Access Control Modal / Lock Screen */}
      <AuthModal />

      {/* Real-Time Toast Notifications */}
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
