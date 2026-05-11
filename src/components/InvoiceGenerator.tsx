import React, { useState, useRef } from 'react';
import { useSystemSettings } from '../hooks/useFirebaseData';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { motion } from 'motion/react';
import { FileText, Printer, Save, X, Plus, Trash2, Loader2, IndianRupee, ShieldCheck } from 'lucide-react';
import { DispatchV2, Customer } from '../types';

interface InvoiceGeneratorProps {
  dispatch?: DispatchV2;
  customer?: Customer;
  onClose: () => void;
}

const THEME_COLORS: Record<string, string> = {
  blue: 'bg-blue-600',
  emerald: 'bg-emerald-600',
  slate: 'bg-slate-900',
  rose: 'bg-rose-600',
  orange: 'bg-orange-600'
};

const THEME_TEXT: Record<string, string> = {
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
  slate: 'text-slate-900',
  rose: 'text-rose-600',
  orange: 'text-orange-600'
};

const THEME_ACCENT: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  slate: 'bg-slate-100 text-slate-900',
  rose: 'bg-rose-50 text-rose-600',
  orange: 'bg-orange-50 text-orange-600'
};

export default function InvoiceGenerator({ dispatch, customer, onClose }: InvoiceGeneratorProps) {
  const { settings } = useSystemSettings();
  const [saving, setSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const themeColor = settings?.themeColor || 'blue';

  const [items, setItems] = useState([
    { 
      description: dispatch ? `Cylinder Refill (${dispatch.cylinders.length} units)` : 'General Supply',
      quantity: dispatch ? dispatch.cylinders.length : 1,
      rate: customer ? customer.rate : (dispatch ? 500 : 0),
      amount: (dispatch?.cylinders.length || 1) * (customer?.rate || (dispatch ? 500 : 0))
    }
  ]);

  const [taxRate, setTaxRate] = useState(settings?.defaultTaxRate || 18);

  // Sync tax rate if settings load later
  React.useEffect(() => {
    if (settings?.defaultTaxRate) {
      setTaxRate(settings.defaultTaxRate);
    }
  }, [settings]);

  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }
    setItems(newItems);
  };

  const saveInvoice = async () => {
    setSaving(true);
    try {
      await runTransaction(db, async (transaction) => {
        const settingsRef = doc(db, 'settings', 'business');
        const settingsSnap = await transaction.get(settingsRef);
        
        let nextNumber = 1;
        if (settingsSnap.exists()) {
          nextNumber = (settingsSnap.data().lastInvoiceNumber || 0) + 1;
        }

        const invoiceNumber = `${settings?.invoicePrefix || 'INV'}-${String(nextNumber).padStart(4, '0')}`;
        
        const invoiceData = {
          invoiceNumber,
          dispatchId: dispatch?.id || 'manual',
          customerId: customer?.id || dispatch?.customerId || 'unknown',
          customerName: customer?.name || dispatch?.customerName || 'Walk-in Customer',
          items,
          subtotal,
          tax: taxAmount,
          total,
          createdAt: new Date().toISOString(),
          status: 'issued'
        };

        const invoiceRef = doc(collection(db, 'invoices'));
        transaction.set(invoiceRef, invoiceData);
        transaction.update(settingsRef, { lastInvoiceNumber: nextNumber });
      });

      onClose();
    } catch (err) {
      console.error("Failed to save invoice", err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 print:p-0">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md print:hidden"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white rounded-[40px] w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl print:h-auto print:rounded-none print:shadow-none"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 ${THEME_COLORS[themeColor]} rounded-xl flex items-center justify-center shadow-lg shadow-blue-100`}>
                <FileText className="text-white" />
             </div>
             <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Generate Invoice</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customizable Billing</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={handlePrint}
                className="px-6 py-3 bg-gray-100 text-gray-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2"
             >
                <Printer className="w-4 h-4" />
                Print PDF
             </button>
             <button 
                onClick={saveInvoice}
                disabled={saving}
                className={`px-6 py-3 ${THEME_COLORS[themeColor]} text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 transition-all shadow-lg flex items-center gap-2`}
             >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Finalize & Save
             </button>
             <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 bg-gray-50/50 print:bg-white print:p-0">
          <div ref={printRef} className="bg-white p-12 rounded-[40px] shadow-sm border border-gray-100 mx-auto max-w-4xl min-h-[1000px] print:border-none print:shadow-none print:p-8">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-16">
               <div className="space-y-4">
                  {settings?.logoUrl && <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto grayscale" />}
                  <div>
                    <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">{settings?.businessName || 'MY BUSINESS'}</h1>
                    <p className="text-sm font-bold text-gray-400 max-w-xs">{settings?.address || 'Street Address, City, State, ZIP'}</p>
                    <p className={`text-xs font-bold ${THEME_TEXT[themeColor]} mt-2`}>{settings?.phone || 'Phone Number'}</p>
                    <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mt-4">GSTIN: {settings?.gstin || 'XXXXXXXXXXXXXXX'}</p>
                  </div>
               </div>
               <div className="text-right">
                  <h2 className="text-6xl font-black text-gray-100 uppercase tracking-tighter leading-none mb-4">INVOICE</h2>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-widest">#{settings?.invoicePrefix}-{String((settings?.lastInvoiceNumber || 0) + 1).padStart(4, '0')}</p>
                  <p className="text-xs font-bold text-gray-400">Date: {new Date().toLocaleDateString()}</p>
               </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-12 mb-16">
               <div className="bg-gray-50 p-8 rounded-[32px] border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Bill To</p>
                  <h4 className="text-xl font-black text-gray-900 uppercase mb-2">{customer?.name || dispatch?.customerName || 'Walk-in Customer'}</h4>
                  <p className="text-sm font-bold text-gray-500 leading-relaxed">{customer?.address || 'No address provided'}</p>
               </div>
               <div className="p-8">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Payment Info</p>
                  <div className="space-y-2">
                     <p className="text-sm font-bold text-gray-700">Method: <span className={THEME_TEXT[themeColor]}>Cash / Online</span></p>
                     <p className="text-sm font-bold text-gray-700 font-mono flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 ${THEME_TEXT[themeColor]}`} /> 
                        VERIFIED TRANSACTION
                     </p>
                  </div>
               </div>
            </div>

            {/* Items Table */}
            <div className="mb-12">
               <table className="w-full">
                  <thead>
                     <tr className="border-b-2 border-gray-900">
                        <th className="py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                        <th className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Qty</th>
                        <th className="py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Rate</th>
                        <th className="py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Amount</th>
                        <th className="py-4 w-12 print:hidden italic"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {items.map((item, idx) => (
                        <tr key={idx} className="group">
                           <td className="py-6 pr-4">
                              <input 
                                 type="text" 
                                 className="w-full bg-transparent font-bold text-gray-900 outline-none border-none focus:ring-0 placeholder:text-gray-300 print:placeholder:transparent"
                                 placeholder="Item description..."
                                 value={item.description}
                                 onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                              />
                           </td>
                           <td className="py-6 text-center">
                              <input 
                                 type="number" 
                                 className="w-full bg-transparent font-black text-center text-gray-900 outline-none border-none focus:ring-0"
                                 value={item.quantity}
                                 onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                              />
                           </td>
                           <td className="py-6 text-right">
                              <div className="flex items-center justify-end font-black text-gray-900">
                                 <IndianRupee className="w-3 h-3 text-gray-400" />
                                 <input 
                                    type="number" 
                                    className="w-24 bg-transparent font-black text-right outline-none border-none focus:ring-0"
                                    value={item.rate}
                                    onChange={(e) => handleUpdateItem(idx, 'rate', Number(e.target.value))}
                                 />
                              </div>
                           </td>
                           <td className="py-6 text-right font-black text-gray-900">
                              ₹{item.amount.toLocaleString()}
                           </td>
                           <td className="py-6 text-right print:hidden">
                              <button 
                                 onClick={() => handleRemoveItem(idx)}
                                 className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 transition-all"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
               
               <button 
                  onClick={handleAddItem}
                  className="mt-6 flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline print:hidden"
               >
                  <Plus className="w-4 h-4" />
                  Add Row
               </button>
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-12 border-t-4 border-gray-900">
               <div className="w-80 space-y-4">
                  <div className="flex justify-between items-center px-4">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</p>
                     <p className="font-black text-gray-900">₹{subtotal.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center px-4">
                     <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">GST (%)</p>
                        <input 
                           type="number"
                           className="w-12 bg-gray-50 rounded-lg text-center font-black text-[10px] p-1 print:hidden focus:ring-1 focus:ring-blue-100 outline-none"
                           value={taxRate}
                           onChange={(e) => setTaxRate(Number(e.target.value))}
                        />
                        <span className="text-[10px] font-black hidden print:inline">({taxRate}%)</span>
                     </div>
                     <p className="font-bold text-gray-400">₹{taxAmount.toLocaleString()}</p>
                  </div>
                  <div className={`${THEME_COLORS[themeColor]} text-white p-6 rounded-[24px] flex justify-between items-center shadow-xl`}>
                     <p className="text-[10px] font-black uppercase tracking-widest">Total Amount</p>
                     <p className="text-2xl font-black italic">₹{total.toLocaleString()}</p>
                  </div>
               </div>
            </div>

            {/* Footer */}
            <div className="mt-24 pt-12 border-t border-gray-100 flex justify-between items-end">
               <div className="space-y-4">
                  <div className="p-6 bg-gray-50 rounded-[24px] w-64 h-32 flex items-center justify-center border-2 border-dashed border-gray-200">
                     <p className="text-[10px] font-black text-gray-300 uppercase">Stamp / Signature</p>
                  </div>
               </div>
               <div className="text-right max-w-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Terms & Conditions</p>
                  <p className="text-[10px] font-bold text-gray-400 leading-relaxed italic">
                     {settings?.footerText || "This is a computer generated document. Goods once sold cannot be returned. Please pay within 7 days of issue."}
                  </p>
               </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
