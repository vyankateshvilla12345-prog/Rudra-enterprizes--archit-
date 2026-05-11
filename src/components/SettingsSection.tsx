import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, writeBatch, doc, updateDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Trash2, AlertTriangle, Loader2, ShieldAlert, CheckCircle2, Building2, MapPin, Phone, Hash, Image as ImageIcon, Save, FileText } from 'lucide-react';
import { useSystemSettings } from '../hooks/useFirebaseData';

export default function SettingsSection() {
  const { settings, loading: loadingSettings } = useSystemSettings();
  const [resetState, setResetState] = useState<'idle' | 'confirm' | 'resetting' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [form, setForm] = useState({
    businessName: '',
    address: '',
    phone: '',
    gstin: '',
    logoUrl: '',
    invoicePrefix: 'INV',
    defaultTaxRate: 18,
    footerText: '',
    themeColor: 'blue',
    lastInvoiceNumber: 0
  });

  useEffect(() => {
    if (settings) {
      setForm({
        ...form,
        ...settings,
        defaultTaxRate: settings.defaultTaxRate || 18,
        footerText: settings.footerText || 'Thank you for your business!',
        themeColor: settings.themeColor || 'blue',
        lastInvoiceNumber: settings.lastInvoiceNumber || 0
      });
    }
  }, [settings]);

  const saveBusinessProfile = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'business'), form);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleFactoryReset = async () => {
    setResetState('resetting');
    setError(null);
    try {
      const collectionsToReset = [
        'orders',
        'dispatches',
        'dispatchesV2',
        'tracking',
        'alerts',
        'customers',
        'qrCodes',
        'stock'
      ];

      for (const collName of collectionsToReset) {
        const snapshot = await getDocs(collection(db, collName));
        const batch = writeBatch(db);
        
        snapshot.docs.forEach((d) => {
          batch.delete(doc(db, collName, d.id));
        });
        
        await batch.commit();
        console.log(`Reset collection: ${collName}`);
      }

      setResetState('done');
      setTimeout(() => setResetState('idle'), 3000);
    } catch (err: any) {
      console.error("Factory Reset failed", err);
      setError(err.message || "Reset failed due to permissions or network error.");
      setResetState('idle');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Settings</h1>
        <p className="text-gray-500 font-medium tracking-tight">Configure global application parameters and maintenance.</p>
      </div>

      {/* Business Profile */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden p-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Building2 className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Business Profile</h2>
            <p className="text-sm text-gray-400 font-bold">These details appear on your generated invoices.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Business Name</label>
            <div className="relative">
               <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
               <input 
                  type="text"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  value={form.businessName}
                  onChange={e => setForm({...form, businessName: e.target.value})}
                  placeholder="e.g. Acme Corporation"
               />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">GSTIN / Tax ID</label>
            <div className="relative">
               <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
               <input 
                  type="text"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  value={form.gstin}
                  onChange={e => setForm({...form, gstin: e.target.value})}
                  placeholder="e.g. 29AAAAA0000A1Z5"
               />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Address</label>
            <div className="relative">
               <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
               <input 
                  type="text"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  value={form.address}
                  onChange={e => setForm({...form, address: e.target.value})}
                  placeholder="Full business address"
               />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Phone</label>
            <div className="relative">
               <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
               <input 
                  type="text"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="+91 00000 00000"
               />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Logo URL</label>
            <div className="relative">
               <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
               <input 
                  type="text"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  value={form.logoUrl}
                  onChange={e => setForm({...form, logoUrl: e.target.value})}
                  placeholder="https://example.com/logo.png"
               />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Default Tax Rate (%)</label>
            <div className="relative">
               <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
               <input 
                  type="number"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  value={form.defaultTaxRate}
                  onChange={e => setForm({...form, defaultTaxRate: Number(e.target.value)})}
                  placeholder="18"
               />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Invoice Prefix</label>
            <div className="relative">
               <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
               <input 
                  type="text"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  value={form.invoicePrefix}
                  onChange={e => setForm({...form, invoicePrefix: e.target.value})}
                  placeholder="INV"
               />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Next Invoice Number (Starts From)</label>
            <div className="relative">
               <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
               <input 
                  type="number"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  value={form.lastInvoiceNumber}
                  onChange={e => setForm({...form, lastInvoiceNumber: Number(e.target.value)})}
                  placeholder="0"
               />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Theme Color</label>
            <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl">
               {[
                 { id: 'blue', class: 'bg-blue-500' },
                 { id: 'emerald', class: 'bg-emerald-500' },
                 { id: 'slate', class: 'bg-slate-800' },
                 { id: 'rose', class: 'bg-rose-500' },
                 { id: 'orange', class: 'bg-orange-500' }
               ].map(color => (
                 <button
                   key={color.id}
                   onClick={() => setForm({...form, themeColor: color.id})}
                   className={`flex-1 h-10 rounded-xl transition-all border-4 ${form.themeColor === color.id ? 'border-white ring-2 ring-blue-100' : 'border-transparent opacity-50'}`}
                 >
                   <div className={`w-full h-full rounded-lg ${color.class}`} />
                 </button>
               ))}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Invoice Footer Text</label>
            <div className="relative">
               <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
               <input 
                  type="text"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  value={form.footerText}
                  onChange={e => setForm({...form, footerText: e.target.value})}
                  placeholder="Terms and conditions or thank you message"
               />
            </div>
          </div>
        </div>

        <button 
          onClick={saveBusinessProfile}
          disabled={savingSettings}
          className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-black transition-all"
        >
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Update Profile
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden p-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="text-gray-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Danger Zone</h2>
            <p className="text-sm text-gray-400 font-bold">Irreversible actions that affect the entire workspace.</p>
          </div>
        </div>

        <div className="bg-red-50/50 border border-red-100 rounded-[32px] p-8 flex items-center justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-black text-red-600 uppercase tracking-tight">Factory Reset</h3>
            </div>
            <p className="text-sm text-red-900/60 font-medium leading-relaxed">
              This will permanently delete all orders, dispatches, tracking pings, alerts, customers, and cylinder registrations. User accounts and roles will be preserved. This action cannot be undone.
            </p>
          </div>

          <div className="shrink-0">
            {resetState === 'idle' && (
              <button 
                onClick={() => setResetState('confirm')}
                className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-700 transition-all uppercase text-xs tracking-widest flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Reset Everything
              </button>
            )}

            {resetState === 'confirm' && (
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleFactoryReset}
                  className="bg-red-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-800 transition-all uppercase text-xs tracking-widest"
                >
                  Confirm Delete
                </button>
                <button 
                  onClick={() => setResetState('idle')}
                  className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {resetState === 'resetting' && (
              <div className="flex items-center gap-3 text-red-600 font-black uppercase text-xs tracking-widest">
                <Loader2 className="w-5 h-5 animate-spin" />
                Wiping Data...
              </div>
            )}

            {resetState === 'done' && (
              <div className="flex items-center gap-3 text-emerald-600 font-black uppercase text-xs tracking-widest">
                <CheckCircle2 className="w-5 h-5" />
                System Reset
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-2xl text-xs font-bold border border-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
