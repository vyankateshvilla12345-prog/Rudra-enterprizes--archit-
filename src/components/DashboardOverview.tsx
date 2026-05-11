import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Truck, Package, CheckCircle, Clock, Plus, ArrowUpRight, Map as MapIcon, ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';
import { useStock, useDispatches, useAlerts, useOrders, useDrivers } from '../hooks/useFirebaseData';
import { Dispatch, UserProfile } from '../types';
import { formatDate } from '../lib/utils';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, limit, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function DashboardOverview({ onCreateDispatch }: { onCreateDispatch: () => void }) {
  const { data: stock } = useStock();
  const { data: dispatches } = useDispatches();
  const { data: alerts } = useAlerts();
  const { data: orders } = useOrders();
  const { data: drivers } = useDrivers();

  // Background check for expired QR codes
  useEffect(() => {
    const checkExpiry = async () => {
      const now = new Date();
      const nowStr = now.toISOString();
      
      // 1. Check Delivery Window (Status: dispatched)
      const deliveryQ = query(
        collection(db, 'qrCodes'), 
        where('status', '==', 'dispatched'), 
        where('expiryTime', '<', nowStr)
      );
      const deliverySnap = await getDocs(deliveryQ);
      for (const qrDoc of deliverySnap.docs) {
        const qr = qrDoc.data();
        const alertQ = query(collection(db, 'alerts'), where('qrId', '==', qrDoc.id), where('type', '==', 'expiry'));
        const alertSnapshot = await getDocs(alertQ);
        if (alertSnapshot.empty) {
          await addDoc(collection(db, 'alerts'), {
            type: 'expiry',
            message: `CRITICAL: Cylinder #${qr.cylinderIndex} delivery window exceeded.`,
            createdAt: nowStr,
            resolved: false,
            qrId: qrDoc.id,
            orderId: qr.orderId,
            priority: 'red'
          });
        }
      }

      // 2. Check Pickup Window (Status: delivered)
      const pickupQ = query(collection(db, 'qrCodes'), where('status', '==', 'delivered'));
      const pickupSnap = await getDocs(pickupQ);
      for (const qrDoc of pickupSnap.docs) {
        const qr = qrDoc.data();
        if (qr.dispatchId) {
          const dispatchDoc = await getDocs(query(collection(db, 'dispatchesV2'), where('id', '==', qr.dispatchId), limit(1)));
          if (!dispatchDoc.empty) {
            const dData = dispatchDoc.docs[0].data();
            if (nowStr > dData.pickupTimeLimit) {
              const alertQ = query(collection(db, 'alerts'), where('qrId', '==', qrDoc.id), where('type', '==', 'missing_scan'));
              const alertSnapshot = await getDocs(alertQ);
              if (alertSnapshot.empty) {
                await addDoc(collection(db, 'alerts'), {
                  type: 'missing_scan',
                  message: `WARNING: Unit #${qr.cylinderIndex} pickup date passed.`,
                  createdAt: nowStr,
                  resolved: false,
                  qrId: qrDoc.id,
                  orderId: qr.orderId,
                  priority: 'yellow'
                });
              }
            }
          }
        }
      }
    };

    const interval = setInterval(checkExpiry, 60000 * 5); // Every 5 mins
    checkExpiry();
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { 
      label: 'Inventory Units', 
      value: stock?.items.reduce((acc, curr) => acc + curr.total, 0) || 0, 
      icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' 
    },
    { 
      label: 'On Field', 
      value: orders.filter(o => o.status === 'assigned' || o.status === 'confirmed').length, 
      icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50' 
    },
    { 
      label: 'Incidents', 
      value: alerts.filter(a => !a.resolved).length, 
      icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' 
    },
    { 
      label: 'Completed Port', 
      value: orders.filter(o => o.status === 'delivered').length, 
      icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' 
    },
  ];

  const activeAlerts = alerts.filter(a => !a.resolved).slice(0, 3);

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Fleet Overview</h1>
          <p className="text-gray-400 font-bold tracking-tight">Active monitoring of logistics and security.</p>
        </div>
        <button 
          onClick={onCreateDispatch}
          className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-black shadow-xl hover:bg-black transition-all active:scale-[0.98] w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Quick Dispatch
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden group"
          >
            <div className={stat.bg + " w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"}>
              <stat.icon className={"w-6 h-6 " + stat.color} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-black text-gray-900">{stat.value}</h3>
              <ArrowRight className="w-5 h-5 text-gray-100 group-hover:text-gray-300 transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Active Alerts Bar */}
          {activeAlerts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Active Threats</h2>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                   <span className="text-[10px] font-black text-red-500 uppercase">Attention Required</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeAlerts.map(alert => (
                  <div key={alert.id} className="bg-white border border-red-100 p-6 rounded-[32px] shadow-sm flex items-start gap-4">
                    <div className="p-3 bg-red-50 rounded-2xl text-red-600 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">{alert.type}</p>
                      <p className="text-sm font-black text-gray-900 leading-tight mb-2">{alert.message}</p>
                      <p className="text-[10px] font-bold text-gray-400">{formatDate(alert.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
             <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight px-2">Recent Fleet Activity</h2>
             <div className="bg-white rounded-[32px] sm:rounded-[40px] border border-gray-100 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Destination</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Personnel</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dispatches.slice(0, 6).map((dispatch) => (
                      <tr key={dispatch.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                           <p className="font-black text-gray-900">{dispatch.destination}</p>
                           <p className="text-xs font-bold text-gray-400">{formatDate(dispatch.createdAt)}</p>
                        </td>
                        <td className="px-8 py-6">
                           <p className="font-bold text-gray-700">{dispatch.driverName}</p>
                           <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider">{dispatch.vehicleNumber}</p>
                        </td>
                        <td className="px-8 py-6">
                           <StatusBadge status={dispatch.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight px-2">Active Personnel</h2>
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6 space-y-6">
                {drivers.length === 0 ? (
                  <p className="text-center text-gray-400 font-bold py-10">No active drivers found.</p>
                ) : drivers.map(driver => {
                  const isOnline = driver.lastPing && (Date.now() - new Date(driver.lastPing).getTime() < 1000 * 60 * 15);
                  return (
                    <div key={driver.uid} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-gray-400 font-black transition-all ${
                          isOnline ? 'bg-blue-50 text-blue-500' : 'bg-gray-50'
                        }`}>
                          {driver.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 leading-none mb-1">{driver.displayName}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {driver.activeDispatchId ? `On Job: ${driver.activeDispatchId.slice(-6)}` : 'Available'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-200'}`} />
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">
                          {isOnline ? 'LIVE' : 'OFFLINE'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>

           <div className="bg-gray-900 rounded-[40px] p-8 text-white relative overflow-hidden group shadow-2xl">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all" />
              <div className="relative z-10 space-y-6">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-400" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black mb-2">Live Logistics Map</h3>
                    <p className="text-gray-400 text-sm font-bold">Track every cylinder and personnel in real-time across the region.</p>
                 </div>
                 <button className="w-full py-4 bg-white text-gray-900 rounded-[20px] font-black text-sm uppercase tracking-widest hover:scale-[1.02] transition-all">
                    Open Satellite View
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Dispatch['status'] }) {
  const styles = {
    pending: 'bg-orange-50 text-orange-600',
    picked_up: 'bg-blue-50 text-blue-600',
    delivered: 'bg-emerald-50 text-emerald-600',
    expired: 'bg-red-50 text-red-600',
  };

  return (
    <span className={styles[status] + " px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider"}>
      {status.replace('_', ' ')}
    </span>
  );
}
