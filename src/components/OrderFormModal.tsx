import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, ShoppingBag, Check, Loader2, MapPin, User, Package, QrCode, AlertCircle } from 'lucide-react';
import { useDrivers, useStock, VALID_WEIGHTS } from '../hooks/useFirebaseData';
import { addDoc, collection, doc, runTransaction, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CylinderWeight } from '../types';
import QRCode from 'react-qr-code';

const QRCodeComponent = QRCode as any;

interface OrderFormProps {
  onClose: () => void;
}

export default function OrderFormModal({ onClose }: OrderFormProps) {
  const [step, setStep] = useState(1);
  const { data: drivers } = useDrivers();
  const { data: stock } = useStock();
  
  const [formData, setFormData] = useState({
    customerName: '',
    cylinderWeight: '14kg' as CylinderWeight,
    quantity: 1,
    location: '',
    driverId: '',
    driverName: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrderData, setCreatedOrderData] = useState<{ id: string, qrCodes: string[] } | null>(null);

  const cylinderStock = stock?.items.find(i => i.weight === formData.cylinderWeight);
  const isStockSufficient = cylinderStock && cylinderStock.available >= formData.quantity;

  const handleNext = () => {
    if (step === 1 && !isStockSufficient) {
       setError("Insufficient stock for the selected weight.");
       return;
    }
    setError(null);
    setStep(s => s + 1);
  };
  const handlePrev = () => {
    setError(null);
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const orderRef = doc(collection(db, 'orders'));
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + 6); // 6 hours expiry

      await runTransaction(db, async (transaction) => {
        const stockRef = doc(db, 'stock', 'summary');
        const stockDoc = await transaction.get(stockRef);

        let items: any[];
        if (!stockDoc.exists()) {
          items = VALID_WEIGHTS.map(weight => ({
            weight: weight as any,
            available: 100,
            total: 100,
          }));
        } else {
          items = [...stockDoc.data().items];
        }

        const itemIndex = items.findIndex(i => i.weight === formData.cylinderWeight);

        if (itemIndex === -1 || items[itemIndex].available < formData.quantity) {
          throw new Error("Insufficient stock available.");
        }

        // 1. Update Stock
        items[itemIndex].available -= formData.quantity;
        transaction.set(stockRef, { items, updatedAt: new Date().toISOString() }, { merge: true });

        // 2. Create Order
        transaction.set(orderRef, {
          ...formData,
          status: 'pending',
          createdAt: new Date().toISOString(),
          expiryTime: expiryTime.toISOString(),
          type: 'LPG'
        });

        // 3. Create QR Codes
        const qrCodesTokens: string[] = [];
        for (let i = 1; i <= formData.quantity; i++) {
          const qrRef = doc(collection(db, 'qrCodes'));
          const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          const qrData = {
            id: qrRef.id,
            orderId: orderRef.id,
            cylinderIndex: i,
            token,
            status: 'pending',
            cylinderWeight: formData.cylinderWeight,
            expiryTime: expiryTime.toISOString(),
            labourId: formData.driverId
          };
          transaction.set(qrRef, qrData);
          qrCodesTokens.push(JSON.stringify({ orderId: orderRef.id, index: i, token }));
        }
        
        setCreatedOrderData({ id: orderRef.id, qrCodes: qrCodesTokens });
      });

      setStep(4);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to create order.");
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
        onClick={() => step !== 4 && onClose()}
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
              <div key={s} className={`h-1 flex-1 rounded-full ${step >= s ? 'bg-purple-600' : 'bg-gray-100'}`} />
            ))}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 4 ? 'QR Codes Generated' : 'Create Order'}
          </h2>
          <p className="text-gray-500 font-medium text-sm">
            {step === 1 ? 'Product & Quantity' : 
             step === 2 ? 'Customer Details' : 
             step === 3 ? 'Assignment & Review' : 
             `Generated ${formData.quantity} unique codes`}
          </p>
        </div>

        <div className="min-h-[350px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1" 
                initial={{ x: 20, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-500" /> Cylinder Weight
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {VALID_WEIGHTS.map((w) => (
                      <button
                        key={w}
                        onClick={() => setFormData({ ...formData, cylinderWeight: w as any })}
                        className={`py-3 rounded-2xl text-xs font-bold border-2 transition-all ${
                          formData.cylinderWeight === w 
                            ? 'border-purple-600 bg-purple-50 text-purple-600 shadow-sm' 
                            : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-gray-200'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700">Order Quantity</label>
                    <div className="flex flex-col items-end">
                      <span className="text-purple-600 font-black text-xl">{formData.quantity}</span>
                      {cylinderStock && (
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${cylinderStock.available < formData.quantity ? 'text-red-500' : 'text-emerald-500'}`}>
                          Available: {cylinderStock.available}
                        </span>
                      )}
                    </div>
                  </div>
                  <input 
                    type="number"
                    min="1"
                    className={`w-full border-none rounded-2xl p-4 text-sm font-semibold transition-all focus:ring-2 ${
                      !isStockSufficient 
                        ? 'bg-red-50 focus:ring-red-100 text-red-900' 
                        : 'bg-gray-50 focus:ring-purple-100'
                    }`}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  />
                  {!isStockSufficient && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs font-black text-red-500 text-center bg-red-100/50 py-3 rounded-2xl mt-2 flex items-center justify-center gap-2 uppercase tracking-tight"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Critical: Insufficient Inventory
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2" 
                initial={{ x: 20, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Customer Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold focus:ring-2 focus:ring-purple-100"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Delivery Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold focus:ring-2 focus:ring-purple-100"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
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
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Assign Driver / Labour</label>
                  <select 
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-semibold focus:ring-2 focus:ring-purple-100"
                    onChange={(e) => {
                      const d = drivers.find(drv => drv.uid === e.target.value);
                      setFormData({ ...formData, driverId: e.target.value, driverName: d?.displayName || '' });
                    }}
                    value={formData.driverId}
                  >
                    <option value="">Select a driver</option>
                    {drivers.map(d => (
                      <option key={d.uid} value={d.uid}>{d.displayName}</option>
                    ))}
                  </select>
                </div>

                <div className="p-6 bg-purple-50 rounded-[32px] border border-purple-100 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-gray-500">Total Cylinders</span>
                    <span className="font-black text-purple-600">{formData.quantity} ({formData.cylinderWeight})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-gray-500">Expiry Window</span>
                    <span className="font-black text-gray-900">6 Hours</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4" 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-4"
              >
                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4">
                  {createdOrderData?.qrCodes.map((token, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="bg-white p-2 rounded-lg">
                        <QRCodeComponent value={token} size={80} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Cylinder #{idx + 1}</p>
                        <p className="text-[10px] font-bold text-purple-500 uppercase">Token: {JSON.parse(token).token.slice(0, 8)}...</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write('<html><head><title>Print QRs</title></head><body>');
                      printWindow.document.write('<div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">');
                      createdOrderData?.qrCodes.forEach((token, i) => {
                        printWindow.document.write(`<div style="border: 2px solid #eee; padding: 10px; border-radius: 10px; text-align: center;">`);
                        printWindow.document.write(`<div style="font-weight: bold; margin-bottom: 5px;">Cylinder #${i+1}</div>`);
                        printWindow.document.write(`<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(token)}" />`);
                        printWindow.document.write('</div>');
                      });
                      printWindow.document.write('</div></body></html>');
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="w-full py-3 bg-purple-100 text-purple-600 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" /> Print All QR Codes
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <p className="text-xs font-bold text-red-500 text-center mb-4">{error}</p>
        )}

        <div className="flex gap-4">
          {step > 1 && step < 4 && (
            <button
              onClick={handlePrev}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold bg-purple-600 text-white shadow-xl shadow-purple-100 hover:bg-purple-700 transition-all"
            >
              Next
            </button>
          ) : step === 3 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.customerName || !formData.driverId}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold bg-gray-900 text-white shadow-xl hover:bg-black transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Generate {formData.quantity} QRs <Check className="w-5 h-5" /></>
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-bold bg-purple-600 text-white shadow-xl hover:bg-purple-700 transition-all"
            >
              Done
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
