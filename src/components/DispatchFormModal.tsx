import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, QrCode, Check, Loader2 } from 'lucide-react';
import { useDrivers } from '../hooks/useFirebaseData';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
// @ts-ignore
import QRCode from 'react-qr-code';

const QRCodeComponent = QRCode as any;

interface DispatchFormProps {
  onClose: () => void;
}

export default function DispatchFormModal({ onClose }: DispatchFormProps) {
  const [step, setStep] = useState(1);
  const { data: drivers } = useDrivers();
  
  const [formData, setFormData] = useState({
    driverId: '',
    driverName: '',
    vehicleNumber: '',
    quantity: 10,
    destination: 'Godown' as 'Godown' | 'Office',
    expiryHours: 24,
  });

  const [createdDispatch, setCreatedDispatch] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + formData.expiryHours);

    try {
      const docRef = await addDoc(collection(db, 'dispatches'), {
        ...formData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiryTime: expiryDate.toISOString(),
        qrCodeData: `DISPATCH-${Math.random().toString(36).substring(7).toUpperCase()}`,
      });

      // Update driver's active dispatch
      if (formData.driverId) {
        await updateDoc(doc(db, 'users', formData.driverId), {
          activeDispatchId: docRef.id
        });
      }

      setCreatedDispatch(docRef.id);
      setStep(4);
    } catch (e) {
      console.error(e);
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
        className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-8 overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900">
          <X className="w-6 h-6" />
        </button>

        <div className="mb-8">
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-gray-100'}`} />
            ))}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Create New Dispatch</h2>
          <p className="text-gray-500 font-medium text-sm">Step {step} of 3: {
            step === 1 ? 'Select Logistics Partner' : 
            step === 2 ? 'Dispatch Logistics' :
            step === 3 ? 'Review & Confirm' : 'QR Generated'
          }</p>
        </div>

        <div className="min-h-[300px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1" 
                initial={{ x: 20, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Driver</label>
                  <select 
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-semibold focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => {
                      const d = drivers.find(drv => drv.uid === e.target.value);
                      setFormData({ ...formData, driverId: e.target.value, driverName: d?.displayName || '', vehicleNumber: d?.vehicleNumber || '' });
                    }}
                    value={formData.driverId}
                  >
                    <option value="">Select a driver</option>
                    {drivers.map(d => (
                      <option key={d.uid} value={d.uid}>{d.displayName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Vehicle Number</label>
                  <input 
                    type="text"
                    placeholder="e.g. MH 12 AB 1234"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-semibold focus:ring-2 focus:ring-blue-100"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2" 
                initial={{ x: 20, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700">Quantity</label>
                    <span className="text-blue-600 font-bold">{formData.quantity} Cylinders</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="100"
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Destination</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['Godown', 'Office'].map(dest => (
                      <button
                        key={dest}
                        onClick={() => setFormData({ ...formData, destination: dest as any })}
                        className={`p-4 rounded-2xl text-sm font-bold border-2 transition-all ${
                          formData.destination === dest ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-50 bg-gray-50 text-gray-500'
                        }`}
                      >
                        {dest}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700">Expiry Timer</label>
                    <span className="text-blue-600 font-bold">{formData.expiryHours} Hours</span>
                  </div>
                  <input 
                    type="range"
                    min="12"
                    max="168" // 1 week
                    step="12"
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    value={formData.expiryHours}
                    onChange={(e) => setFormData({ ...formData, expiryHours: parseInt(e.target.value) })}
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3" 
                initial={{ x: 20, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="bg-gray-50 p-6 rounded-[32px] space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm font-medium">Driver</span>
                    <span className="font-bold">{formData.driverName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm font-medium">Vehicle</span>
                    <span className="font-bold">{formData.vehicleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm font-medium">Quantity</span>
                    <span className="font-bold text-blue-600">{formData.quantity} Cylinders</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm font-medium">Destination</span>
                    <span className="font-bold">{formData.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm font-medium">Expiry</span>
                    <span className="font-bold">{formData.expiryHours} hours</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4" 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center space-y-6 py-4"
              >
                <div className="p-6 bg-white border-4 border-blue-50 rounded-[40px] shadow-sm flex items-center justify-center">
                  <QRCodeComponent 
                    value={`${window.location.origin}/staff?dispatchId=${createdDispatch}`} 
                    size={200} 
                  />
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-xs font-bold mb-2">
                    <Check className="w-3 h-3" /> DISPATCH CREATED
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Scan this code to start the pickup process</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex gap-4">
          {step > 1 && step < 4 && (
            <button
              onClick={handlePrev}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
          )}
          {step < 3 && (
            <button
              disabled={step === 1 && !formData.driverId}
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold bg-blue-600 text-white shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold bg-blue-600 text-white shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Confirm & Generate QR <QrCode className="w-5 h-5" /></>
              )}
            </button>
          )}
          {step === 4 && (
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-bold bg-gray-900 text-white hover:bg-black transition-all"
            >
              Done
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
