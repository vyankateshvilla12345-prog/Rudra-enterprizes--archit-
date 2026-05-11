import React, { useState } from 'react';
import { useDispatchesV2 } from '../hooks/useFirebaseData';
import { formatDate } from '../lib/utils';
import { DispatchV2 } from '../types';
import { Search, Filter, MoreHorizontal, Download, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InvoiceGenerator from './InvoiceGenerator';

export default function DispatchList() {
  const { data: dispatches, loading } = useDispatchesV2();
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchV2 | null>(null);

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Delivery History</h1>
          <p className="text-gray-500 font-medium">Tracking V2 dispatches with customer association.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-100 shadow-sm hover:bg-gray-50 transition-all w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400" /> Filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Customer</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Driver</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Cylinders</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {dispatches.map((dispatch) => (
              <tr key={dispatch.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-5">
                   <p className="font-bold text-gray-900">{dispatch.customerName}</p>
                   <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">#{dispatch.id.slice(-6)}</p>
                </td>
                <td className="px-6 py-5">
                   <p className="font-bold text-gray-700">{dispatch.labourName}</p>
                </td>
                <td className="px-6 py-5 text-center">
                   <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-black text-xs">
                      {dispatch.cylinders.length}
                   </span>
                </td>
                <td className="px-6 py-5 text-center">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      dispatch.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                   }`}>
                      {dispatch.status}
                   </span>
                </td>
                <td className="px-6 py-5 text-right">
                   <button 
                     onClick={() => setSelectedDispatch(dispatch)}
                     className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 ml-auto shadow-sm"
                   >
                      <FileText className="w-3 h-3" />
                      Invoice
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedDispatch && (
           <InvoiceGenerator 
             dispatch={selectedDispatch}
             onClose={() => setSelectedDispatch(null)}
           />
        )}
      </AnimatePresence>
    </div>
  );
}
