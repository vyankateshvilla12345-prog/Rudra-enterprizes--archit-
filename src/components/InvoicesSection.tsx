import React, { useState } from 'react';
import { useInvoices } from '../hooks/useFirebaseData';
import { FileText, Search, Filter, ArrowRight, Download, Eye, Loader2, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../lib/utils';
import InvoiceGenerator from './InvoiceGenerator';

export default function InvoicesSection() {
  const { data: invoices, loading } = useInvoices();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const filteredInvoices = invoices.filter(inv => 
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Invoice Archive</h1>
          <p className="text-gray-500 font-medium tracking-tight">View and manage all generated commercial invoices.</p>
        </div>
        <button 
          onClick={() => setSelectedInvoice({ isNew: true })}
          className="bg-blue-600 text-white px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <FileText className="w-4 h-4" />
          Manual Invoice
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
               <p className="text-2xl font-black italic">₹{invoices.reduce((a, b) => a + b.total, 0).toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
               <IndianRupee className="w-6 h-6 text-emerald-500" />
            </div>
         </div>
         <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Invoices Issued</p>
               <p className="text-2xl font-black">{invoices.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
               <FileText className="w-6 h-6 text-blue-500" />
            </div>
         </div>
         <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg. Value</p>
               <p className="text-2xl font-black italic">
                 ₹{invoices.length ? Math.round(invoices.reduce((a, b) => a + b.total, 0) / invoices.length).toLocaleString() : 0}
               </p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
               <Filter className="w-6 h-6 text-orange-500" />
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[32px] sm:rounded-[40px] border border-gray-100 shadow-xl overflow-hidden min-h-[600px]">
        <div className="p-6 sm:p-8 border-b border-gray-50 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input 
              type="text"
              placeholder="Search by client or invoice #..."
              className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200 mb-2" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fetching Invoices</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-100 mb-4" />
                    <p className="text-gray-400 font-bold">No invoices found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="font-black text-gray-900">{inv.invoiceNumber}</p>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Ref: {inv.dispatchId?.slice(-6) || 'MANUAL'}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-gray-900">{inv.customerName}</p>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-xs font-bold text-gray-500">{formatDate(inv.createdAt)}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <p className="font-black text-gray-900 italic">₹{inv.total.toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                         inv.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                       }`}>
                         {inv.status}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center justify-center gap-2">
                          <button 
                            className="p-3 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                            title="View / Print"
                          >
                             <Eye className="w-4 h-4" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceGenerator 
             onClose={() => setSelectedInvoice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
