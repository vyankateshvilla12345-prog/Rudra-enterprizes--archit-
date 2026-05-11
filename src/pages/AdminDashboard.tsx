import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import DashboardOverview from '../components/DashboardOverview';
import LiveTracking from '../components/LiveTracking';
import DispatchList from '../components/DispatchList';
import DispatchFormModal from '../components/DispatchFormModal';
import OrdersList from '../components/OrdersList';
import StockOverview from '../components/StockOverview';
import DispatchSection from '../components/DispatchSection';
import CylinderRegistration from '../components/CylinderRegistration';
import UsersSection from '../components/UsersSection';
import AlertsSection from '../components/AlertsSection';
import DriverAnalytics from '../components/DriverAnalytics';
import CustomersSection from '../components/CustomersSection';
import SettingsSection from '../components/SettingsSection';
import InvoicesSection from '../components/InvoicesSection';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bell, X } from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [newAlert, setNewAlert] = useState<any>(null);
  
  const isAdmin = profile?.role === 'admin';
  const isAccountant = profile?.role === 'accountant';

  const [activeTab, setActiveTab] = useState(isAccountant ? 'registration' : 'dashboard');
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Real-time Push-style Notifications
  React.useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(1));
    let initialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      
      const alert = snapshot.docs[0]?.data();
      if (alert) {
        setNewAlert(alert);
        // Auto-dismiss after 8 seconds
        setTimeout(() => setNewAlert(null), 8000);
      }
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Security check for tabs
  const canAccess = (tab: string) => {
      if (isAdmin) return true;
      if (isAccountant) {
         return ['registration', 'dispatch', 'stock', 'customers', 'invoices'].includes(tab);
      }
      return false;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[40] lg:hidden"
          />
        )}
      </AnimatePresence>
      
      <main className="flex-1 flex flex-col min-w-0">
        <TopBar onToggleMenu={() => setIsSidebarOpen(true)} />
        
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && canAccess('dashboard') && <DashboardOverview onCreateDispatch={() => setShowDispatchForm(true)} />}
              {activeTab === 'tracking' && canAccess('tracking') && <LiveTracking />}
              {activeTab === 'dispatches' && canAccess('dispatches') && <DispatchList />}
              {activeTab === 'orders' && canAccess('orders') && <OrdersList />}
              {activeTab === 'dispatch' && canAccess('dispatch') && <DispatchSection />}
              {activeTab === 'registration' && canAccess('registration') && <CylinderRegistration />}
              {activeTab === 'stock' && canAccess('stock') && <StockOverview />}
              {activeTab === 'users' && canAccess('users') && <UsersSection />}
              {activeTab === 'alerts' && canAccess('alerts') && <AlertsSection />}
              {activeTab === 'analytics' && canAccess('analytics') && <DriverAnalytics />}
              {activeTab === 'customers' && canAccess('customers') && <CustomersSection />}
              {activeTab === 'invoices' && canAccess('invoices') && <InvoicesSection />}
              {activeTab === 'settings' && canAccess('settings') && <SettingsSection />}
              {activeTab !== 'dashboard' && activeTab !== 'tracking' && activeTab !== 'dispatches' && activeTab !== 'orders' && activeTab !== 'stock' && activeTab !== 'dispatch' && activeTab !== 'registration' && activeTab !== 'users' && activeTab !== 'alerts' && activeTab !== 'analytics' && activeTab !== 'customers' && activeTab !== 'settings' && activeTab !== 'invoices' && (
                <div className="flex items-center justify-center h-full text-gray-400 font-medium">
                  Section "{activeTab}" is under development.
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {newAlert && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 right-6 z-[200] w-96 bg-gray-900 text-white rounded-[32px] p-6 shadow-2xl border border-white/5 overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-black uppercase tracking-widest text-red-500">{newAlert.type}</h4>
                  <button onClick={() => setNewAlert(null)} className="text-gray-600 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm font-bold text-gray-100 mb-2 leading-tight">
                  {newAlert.message}
                </p>
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-bold text-gray-500">Order #{newAlert.orderId?.slice(-6)}</p>
                   <button 
                    onClick={() => { setActiveTab('alerts'); setNewAlert(null); }}
                    className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                   >
                    View Details
                   </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDispatchForm && (
          <DispatchFormModal onClose={() => setShowDispatchForm(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
