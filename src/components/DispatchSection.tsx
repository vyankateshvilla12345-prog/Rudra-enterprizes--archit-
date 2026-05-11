import React, { useState } from 'react';
import { useQRCodes, useDrivers, useCustomers } from '../hooks/useFirebaseData';
import { Truck, Check, Package, Loader2, X, ChevronRight, User, ShoppingBag } from 'lucide-react';
import { QRCodeData, DispatchV2 } from '../types';
import { formatDate } from '../lib/utils';
import { collection, doc, runTransaction, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function DispatchSection() {
  const { data: qrs, loading } = useQRCodes();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'available' | 'activity'>('available');

  const availableQRs = qrs.filter(qr => qr.status === 'pending');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDispatch = () => {
    if (selectedIds.length === 0) return;
    setShowModal(true);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cylinder Dispatch</h1>
          <p className="text-gray-500 font-medium tracking-tight whitespace-nowrap">Manage the flow of cylinders from dispatch to return.</p>
        </div>
        {activeSubTab === 'available' && (
          <button 
            onClick={handleDispatch}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
          >
            <Truck className="w-5 h-5" />
            Dispatch Selected ({selectedIds.length})
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-gray-100 pb-px">
        <button 
          onClick={() => setActiveSubTab('available')}
          className={`pb-4 px-4 text-sm font-bold transition-all relative ${activeSubTab === 'available' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Dispatch Unit
          {activeSubTab === 'available' && <motion.div layoutId="subTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveSubTab('activity')}
          className={`pb-4 px-4 text-sm font-bold transition-all relative ${activeSubTab === 'activity' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Tracking Log
          {activeSubTab === 'activity' && <motion.div layoutId="subTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest">Inventory Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-xs font-bold text-gray-500">Available</span>
                <span className="text-sm font-black text-emerald-600">{availableQRs.length} Units</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-xs font-bold text-gray-500">Dispatched</span>
                <span className="text-sm font-black text-orange-600">{qrs.filter(qr => qr.status === 'dispatched').length} Units</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-xs font-bold text-gray-500">Delivered</span>
                <span className="text-sm font-black text-blue-600">{qrs.filter(qr => qr.status === 'delivered').length} Units</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">Returned</span>
                <span className="text-sm font-black text-purple-600">{qrs.filter(qr => qr.status === 'returned').length} Units</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          {activeSubTab === 'available' ? (
            <>
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">Available Cylinders</h3>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setSelectedIds(selectedIds.length === availableQRs.length ? [] : availableQRs.map(q => q.id))}
                    className="text-xs font-black text-blue-600 uppercase tracking-widest px-4 py-2 bg-blue-50 rounded-xl"
                   >
                     {selectedIds.length === availableQRs.length ? 'Deselect All' : 'Select All'}
                   </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-12"></th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cylinder ID</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Info</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Weight</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr><td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-bold">Loading cylinders...</td></tr>
                    ) : availableQRs.length === 0 ? (
                      <tr><td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-bold">No available cylinders in inventory.</td></tr>
                    ) : availableQRs.map(qr => (
                      <tr 
                        key={qr.id} 
                        onClick={() => toggleSelect(qr.id)}
                        className={`cursor-pointer transition-all ${selectedIds.includes(qr.id) ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}
                      >
                        <td className="px-8 py-5">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            selectedIds.includes(qr.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-200'
                          }`}>
                            {selectedIds.includes(qr.id) && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="font-black text-gray-900 text-sm">#{qr.id.slice(-6)}</span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-bold text-gray-700">Order #{qr.orderId.slice(0, 8)}</p>
                          <p className="text-[10px] font-black text-blue-500 uppercase">Index: {qr.cylinderIndex}</p>
                        </td>
                        <td className="px-8 py-5">
                           <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-black uppercase">
                              {qr.cylinderWeight || 'Unit'}
                           </span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-bold text-gray-400 font-mono tracking-tight">{formatDate(qr.expiryTime)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="p-8 border-b border-gray-50">
                <h3 className="text-lg font-black text-gray-900">Activity & Tracking</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit ID</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Delivery Scan</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Pickup Scan</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {qrs.filter(q => q.status !== 'pending').map(qr => (
                      <tr key={qr.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                           <p className="font-black text-gray-900 text-sm">#{qr.id.slice(-6)}</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase">Order: {qr.orderId.slice(0, 8)}</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                          {qr.deliveryScan?.status ? (
                            <div className="inline-flex flex-col items-center">
                              <div className="p-1.5 bg-emerald-100 rounded-full text-emerald-600 mb-1">
                                <Check className="w-3 h-3" strokeWidth={4} />
                              </div>
                              <p className="text-[10px] font-bold text-gray-900 font-mono">{qr.deliveryScan.lat.toFixed(4)}, {qr.deliveryScan.lng.toFixed(4)}</p>
                              <p className="text-[8px] font-black text-gray-400 uppercase">{formatDate(qr.deliveryScan.time)}</p>
                            </div>
                          ) : (
                            <div className="p-1.5 bg-gray-50 rounded-full text-gray-300 inline-block">
                              <Loader2 className="w-3 h-3 animate-spin" strokeWidth={4} />
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6 text-center">
                          {qr.pickupScan?.status ? (
                             <div className="inline-flex flex-col items-center">
                              <div className="p-1.5 bg-purple-100 rounded-full text-purple-600 mb-1">
                                <Check className="w-3 h-3" strokeWidth={4} />
                              </div>
                              <p className="text-[10px] font-bold text-gray-900 font-mono">{qr.pickupScan.lat.toFixed(4)}, {qr.pickupScan.lng.toFixed(4)}</p>
                              <p className="text-[8px] font-black text-gray-400 uppercase">{formatDate(qr.pickupScan.time)}</p>
                            </div>
                          ) : (
                            <div className="p-1.5 bg-gray-50 rounded-full text-gray-300 inline-block">
                              <X className="w-3 h-3" strokeWidth={4} />
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <StatusBadgeV2 status={qr.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <DispatchFormModalV2 
            selectedQRs={qrs.filter(q => selectedIds.includes(q.id))}
            onClose={() => {
              setShowModal(false);
              setSelectedIds([]);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadgeV2({ status }: { status: QRCodeData['status'] }) {
  const styles = {
    pending: 'bg-gray-100 text-gray-400',
    dispatched: 'bg-orange-50 text-orange-600',
    delivered: 'bg-emerald-50 text-emerald-600',
    returned: 'bg-purple-100 text-purple-600',
  };

  return (
    <span className={`${styles[status]} px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider`}>
      {status}
    </span>
  );
}

function DispatchFormModalV2({ selectedQRs, onClose }: { selectedQRs: QRCodeData[], onClose: () => void }) {
  const { data: drivers } = useDrivers();
  const { data: customers } = useCustomers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    handoverTo: '',
    labourId: '',
    customerId: '',
    deliveryHours: 6,
    pickupDays: 2,
  });

  const handleSubmit = async () => {
    if (!formData.labourId || !formData.customerId) {
      setError("Please select a driver and a customer.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const labour = drivers.find(d => d.uid === formData.labourId);
      const customer = customers.find(c => c.id === formData.customerId);
      const dispatchId = doc(collection(db, 'dispatchesV2')).id;
      const createdAt = new Date().toISOString();
      const deliveryLimit = new Date();
      deliveryLimit.setHours(deliveryLimit.getHours() + formData.deliveryHours);
      const pickupLimit = new Date();
      pickupLimit.setHours(pickupLimit.getHours() + (formData.pickupDays * 24));

      const dispatchData: DispatchV2 = {
        id: dispatchId,
        cylinders: selectedQRs.map(q => q.id),
        labourId: formData.labourId,
        labourName: labour?.displayName || 'Unknown',
        handoverTo: formData.handoverTo || labour?.displayName || 'Unknown',
        customerId: formData.customerId,
        customerName: customer?.name || 'Unknown',
        deliveryTimeLimit: deliveryLimit.toISOString(),
        pickupTimeLimit: pickupLimit.toISOString(),
        createdAt: createdAt,
        status: 'assigned'
      };

      await runTransaction(db, async (transaction) => {
        transaction.set(doc(db, 'dispatchesV2', dispatchId), dispatchData);
        selectedQRs.forEach(qr => {
          transaction.update(doc(db, 'qrCodes', qr.id), {
            status: 'dispatched',
            dispatchId: dispatchId,
            labourId: formData.labourId,
            deliveryScan: { status: false, time: '', lat: 0, lng: 0 },
            pickupScan: { status: false, time: '', lat: 0, lng: 0 },
            expiryTime: deliveryLimit.toISOString(),
            scanCount: 0 // Reset or initialize scan count
          });
        });
      });

      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to create dispatch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-10 overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-8 right-8 p-1 text-gray-400 hover:text-gray-900">
          <X className="w-6 h-6" />
        </button>

        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900">Dispatch Details</h2>
          <p className="text-gray-400 font-bold text-sm tracking-tight">Assigning {selectedQRs.length} cylinders for delivery.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Handover To</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input 
                type="text" 
                placeholder="Receiver name (e.g. John Doe)"
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-100"
                value={formData.handoverTo}
                onChange={e => setFormData({...formData, handoverTo: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Assign Labour</label>
            <div className="relative">
              <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <select 
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold appearance-none focus:ring-2 focus:ring-blue-100 outline-none"
                value={formData.labourId}
                onChange={e => setFormData({...formData, labourId: e.target.value})}
              >
                <option value="">Select driver...</option>
                {drivers.map(d => (
                  <option key={d.uid} value={d.uid}>{d.displayName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Customer</label>
              <button 
                type="button"
                onClick={() => {
                  const name = prompt("Enter Customer Name:");
                  const address = prompt("Enter Address:");
                  const rate = prompt("Enter Rate (₹):");
                  if (name && address && rate) {
                    addDoc(collection(db, 'customers'), {
                      name, address, rate: Number(rate), createdAt: new Date().toISOString()
                    });
                  }
                }}
                className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 hover:underline"
              >
                + Quick Add
              </button>
            </div>
            <div className="relative">
              <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <select 
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold appearance-none focus:ring-2 focus:ring-blue-100 outline-none"
                value={formData.customerId}
                onChange={e => setFormData({...formData, customerId: e.target.value})}
              >
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.address}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Delivery Time</label>
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                 <input 
                  type="number" 
                  className="w-12 bg-transparent border-none text-center font-black text-blue-600 focus:ring-0 p-0"
                  value={formData.deliveryHours}
                  onChange={e => setFormData({...formData, deliveryHours: parseInt(e.target.value) || 1})}
                 />
                 <span className="text-xs font-bold text-gray-500">Hours</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Pickup Limit</label>
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                 <input 
                  type="number" 
                  className="w-12 bg-transparent border-none text-center font-black text-blue-600 focus:ring-0 p-0"
                  value={formData.pickupDays}
                  onChange={e => setFormData({...formData, pickupDays: parseInt(e.target.value) || 1})}
                 />
                 <span className="text-xs font-bold text-gray-500">Days</span>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-xs font-bold text-red-500 text-center mt-6">{error}</p>}

        <div className="mt-10">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Confirm Dispatch <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
