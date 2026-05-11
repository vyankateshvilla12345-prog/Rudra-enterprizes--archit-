import React, { useState } from 'react';
import { useOrders } from '../hooks/useFirebaseData';
import { formatDate } from '../lib/utils';
import { Order } from '../types';
import { Search, Filter, MoreHorizontal, Download, ShoppingBag, Plus } from 'lucide-react';
import OrderFormModal from './OrderFormModal';
import { AnimatePresence } from 'motion/react';

export default function OrdersList() {
  const { data: orders, loading } = useOrders();
  const [showOrderForm, setShowOrderForm] = useState(false);

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Distribution & Orders</h1>
          <p className="text-gray-500 font-medium">Manage cylinder distribution to your customers.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowOrderForm(true)}
            className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl hover:bg-black transition-all active:scale-[0.98] w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Create New Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100 flex items-center gap-5">
           <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
             <Check className="w-7 h-7" />
           </div>
           <div>
             <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Delivered Today</p>
             <h3 className="text-2xl font-black text-emerald-900">128 Units</h3>
           </div>
        </div>
        <div className="bg-orange-50/50 p-6 rounded-[32px] border border-orange-100 flex items-center gap-5">
           <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
             <ShoppingBag className="w-7 h-7" />
           </div>
           <div>
             <p className="text-sm font-bold text-orange-600 uppercase tracking-widest">Pending Orders</p>
             <h3 className="text-2xl font-black text-orange-900">{orders.filter(o => o.status === 'pending').length}</h3>
           </div>
        </div>
        <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100 flex items-center gap-5">
           <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
             <Filter className="w-7 h-7" />
           </div>
           <div>
             <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">Active Drivers</p>
             <h3 className="text-2xl font-black text-blue-900">12</h3>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] sm:rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-8 border-b border-gray-50 gap-4">
           <div className="relative w-full sm:w-80">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               type="text" 
               placeholder="Search by customer name..." 
               className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-14 pr-6 text-sm font-semibold focus:ring-2 focus:ring-purple-100 placeholder:text-gray-400 transition-all font-sans"
             />
           </div>
           <div className="flex gap-2">
             <button className="p-3.5 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-all">
               <Filter className="w-5 h-5" />
             </button>
             <button className="p-3.5 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-all">
               <Download className="w-5 h-5" />
             </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="bg-gray-50/30">
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Details</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer & Location</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dispatcher</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-8 py-10 bg-gray-50/10" />
                </tr>
              ))
            ) : orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50/50 transition-all group cursor-pointer">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 leading-tight">LPG {order.cylinderWeight}</p>
                      <p className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">{order.quantity} Units &bull; #{order.id.slice(0, 6)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="font-bold text-gray-800 leading-tight">{order.customerName}</p>
                  <p className="text-xs text-gray-400 truncate max-w-[200px]">{order.location}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm font-bold text-gray-700">{order.driverName}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDate(order.createdAt)}</p>
                </td>
                <td className="px-8 py-6">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="p-2 text-gray-300 hover:text-gray-900 transition-colors">
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <AnimatePresence>
        {showOrderForm && (
          <OrderFormModal onClose={() => setShowOrderForm(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Check(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
}

function OrderStatusBadge({ status }: { status: Order['status'] }) {
  const styles = {
    pending: 'bg-orange-50 text-orange-600 border border-orange-100',
    assigned: 'bg-blue-50 text-blue-600 border border-blue-100',
    delivered: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  };

  return (
    <span className={styles[status] + " px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"}>
      {status}
    </span>
  );
}
