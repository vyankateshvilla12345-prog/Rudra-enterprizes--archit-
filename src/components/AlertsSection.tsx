import React, { useState, useEffect } from 'react';
import { useAlerts } from '../hooks/useFirebaseData';
import { AlertTriangle, Clock, CheckCircle, ArrowRight, Filter, Search, Loader2, ShieldAlert as ShieldAlertIcon, MapPin, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate } from '../lib/utils';

export default function AlertsSection() {
  const { data: alerts, loading } = useAlerts();
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  
  const filteredAlerts = alerts.filter(a => {
    if (filter === 'unresolved') return !a.resolved;
    if (filter === 'resolved') return a.resolved;
    return true;
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Alerts</h1>
          <p className="text-gray-500 font-medium whitespace-nowrap">Monitor timing violations and security incidents.</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm gap-1">
          {(['unresolved', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-gray-200" /></div>
          ) : filteredAlerts.length === 0 ? (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }}
               className="py-20 text-center bg-white rounded-[40px] border border-dashed border-gray-100"
            >
               <CheckCircle className="w-12 h-12 mx-auto text-emerald-100 mb-4" />
               <p className="text-gray-400 font-bold">No {filter !== 'all' ? filter : ''} alerts found. Everything is smooth.</p>
            </motion.div>
          ) : filteredAlerts.map((alert) => (
            <motion.div key={alert.id} layout>
               <AlertCard alert={alert} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: any }) {
  const isCritical = alert.type === 'unauthorized' || alert.type === 'expiry' || alert.type === 'limit_exceeded';

  const resolveAlert = async () => {
    try {
      await updateDoc(doc(db, 'alerts', alert.id), { resolved: true });
    } catch (e) {
      console.error(e);
    }
  };

  const openInMaps = () => {
    if (alert.lat && alert.lng) {
      window.open(`https://www.google.com/maps?q=${alert.lat},${alert.lng}`, '_blank');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6 group hover:shadow-xl transition-all ${
        !alert.resolved && isCritical ? 'border-l-4 border-l-red-500' : 
        !alert.resolved ? 'border-l-4 border-l-orange-400' : ''
      }`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
        alert.resolved ? 'bg-gray-50 text-gray-400' :
        isCritical ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
      }`}>
        {alert.type === 'unauthorized' ? <ShieldAlertIcon className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
      </div>


      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className={`text-[10px] font-black uppercase tracking-widest ${
            alert.resolved ? 'text-gray-400' :
            isCritical ? 'text-red-500' : 'text-orange-500'
          }`}>
            {alert.type.replace(/_/g, ' ')} ALERT
          </span>
          <span className="text-gray-300">•</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase">{formatDate(alert.createdAt)}</span>
        </div>
        <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">{alert.message}</h3>
        <p className="text-sm font-bold text-gray-400">
          Ref: <span className="text-blue-500">#{alert.qrId?.slice(-6) || 'N/A'}</span> 
          {alert.orderId && <> (Order <span className="text-gray-900">#{alert.orderId.slice(0, 8)}</span>)</>}
        </p>
        
        {alert.scanTime && (
          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
             <Clock className="w-3 h-3" />
             Scanned at: {formatDate(alert.scanTime)}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {alert.lat && alert.lng && (
           <button 
            onClick={openInMaps}
            className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
           >
             <MapPin className="w-4 h-4" />
             Get Location
             <ExternalLink className="w-3 h-3" />
           </button>
        )}
        {!alert.resolved && (
          <button 
            onClick={resolveAlert}
            className="flex items-center gap-2 px-6 py-3 bg-gray-50 text-gray-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all shadow-sm"
          >
            Mark Resolved
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
        {alert.resolved && (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
            <CheckCircle className="w-4 h-4" />
            Resolved
          </div>
        )}
      </div>
    </motion.div>
  );
}
