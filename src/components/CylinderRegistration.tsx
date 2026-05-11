import React, { useState } from 'react';
import { useCylinders, VALID_WEIGHTS, useStock } from '../hooks/useFirebaseData';
import { Package, Plus, Loader2, QrCode, Download, MapPin, Database, ChevronRight, X, Check } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, doc, runTransaction, getDoc } from 'firebase/firestore';
import { Cylinder, CylinderWeight } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function CylinderRegistration() {
  const { data: cylinders, loading } = useCylinders();
  const { data: stock } = useStock();
  const [isGenerating, setIsGenerating] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    weight: '14kg' as CylinderWeight,
    quantity: 1,
    location: 'Godown',
  });
  const [selectedQR, setSelectedQR] = useState<{ url: string, id: string } | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.quantity <= 0) return;

    setIsGenerating(true);
    try {
      const batchSize = formData.quantity;
      const createdAt = new Date().toISOString();
      
      await runTransaction(db, async (transaction) => {
        // 1. Get current stock summary
        const stockRef = doc(db, 'stock', 'summary');
        const stockSnap = await transaction.get(stockRef);
        
        let currentStock: any;
        if (!stockSnap.exists()) {
          currentStock = {
            items: VALID_WEIGHTS.map(weight => ({
              weight,
              available: 0,
              total: 0,
            })),
            updatedAt: createdAt
          };
        } else {
          currentStock = stockSnap.data();
        }

        // 2. Generate cylinders
        for (let i = 0; i < batchSize; i++) {
          // Generate a UNIQUE ID: LPG-14KG-XXXX (using a timestamp and random suffix for simplicity here, 
          // but usually you'd track a counter in DB)
          const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
          const cylinderId = `LPG-${formData.weight.toUpperCase()}-${randomSuffix}`;
          const qrToken = Math.random().toString(36).substring(2, 9).toUpperCase();
          
          const cylinderData: Cylinder = {
            id: cylinderId,
            weight: formData.weight,
            type: 'LPG',
            status: 'available',
            location: formData.location,
            qrToken: qrToken,
            createdAt: createdAt
          };

          const cylRef = doc(db, 'cylinders', cylinderId);
          transaction.set(cylRef, cylinderData);
        }

        // 3. Update Inventory
        const updatedItems = currentStock.items.map((item: any) => {
          if (item.weight === formData.weight) {
            return {
              ...item,
              available: item.available + batchSize,
              total: item.total + batchSize
            };
          }
          return item;
        });

        transaction.set(stockRef, { items: updatedItems, updatedAt: createdAt }, { merge: true });
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setFormData({ ...formData, quantity: 1 });
    } catch (err) {
      console.error(err);
      alert("Error generating cylinders. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadSingleQR = async (cyl: Cylinder) => {
    const text = JSON.stringify({
      id: cyl.id,
      weight: cyl.weight,
      token: cyl.qrToken,
      type: 'cylinder'
    });
    const url = await QRCode.toDataURL(text, { width: 300, margin: 2 });
    saveAs(url, `${cyl.id}_QR.png`);
  };

  const previewQR = async (cyl: Cylinder) => {
    const text = JSON.stringify({
      id: cyl.id,
      weight: cyl.weight,
      token: cyl.qrToken,
      type: 'cylinder'
    });
    const url = await QRCode.toDataURL(text, { width: 600, margin: 2 });
    setSelectedQR({ url, id: cyl.id });
  };

  const downloadAllQR = async () => {
    const zip = new JSZip();
    const folder = zip.folder("cylinders_qr");
    
    for (const cyl of cylinders) {
      const text = JSON.stringify({
        id: cyl.id,
        weight: cyl.weight,
        token: cyl.qrToken,
        type: 'cylinder'
      });
      const url = await QRCode.toDataURL(text, { width: 300, margin: 2 });
      const base64Data = url.replace(/^data:image\/png;base64,/, "");
      folder?.file(`${cyl.id}_QR.png`, base64Data, { base64: true });
    }
    
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "all_cylinders_qr.zip");
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cylinder Registration</h1>
          <p className="text-gray-500 font-medium tracking-tight whitespace-nowrap">Register hardware units and generate security QR codes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-1">
          <form 
            onSubmit={handleRegister}
            className="bg-white rounded-[40px] border border-gray-100 shadow-xl p-10 space-y-8 sticky top-8"
          >
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Cylinder Weight</label>
              <div className="grid grid-cols-3 gap-2">
                {VALID_WEIGHTS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setFormData({ ...formData, weight: w })}
                    className={`py-3 rounded-2xl text-xs font-black transition-all ${
                      formData.weight === w 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Quantity to Add</label>
              <div className="relative">
                <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input 
                  type="number" 
                  min="1"
                  max="100"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-100"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Initial Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <select 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-blue-100"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                >
                  <option value="Godown">Godown</option>
                  <option value="Office">Office</option>
                  <option value="Warehouse">Warehouse</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Cylinder Type</p>
                    <p className="text-sm font-black text-blue-900 uppercase tracking-tight">LPG FIXED</p>
                  </div>
               </div>
            </div>

            <button 
              disabled={isGenerating}
              className="w-full py-4.5 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Register & Generate QR
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* QR List/Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Registered Units ({cylinders.length})</h2>
            {cylinders.length > 0 && (
              <button 
                onClick={downloadAllQR}
                className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100"
              >
                <Download className="w-3.5 h-3.5" />
                Download ALL (ZIP)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="col-span-full py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-bold">Synchronizing database...</p>
                </div>
              ) : cylinders.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
                  <Package className="w-12 h-12 mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-bold">No cylinders registered yet.</p>
                </div>
              ) : cylinders.map((cyl) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={cyl.id}
                  className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5 group hover:shadow-lg transition-all"
                >
                    <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 relative group-hover:bg-blue-50 transition-colors">
                      <QrCode className="w-10 h-10 text-gray-200 group-hover:text-blue-500 transition-colors" />
                      <div className="absolute inset-0 bg-blue-600/90 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 gap-1 overflow-hidden">
                        <button 
                          onClick={(e) => { e.stopPropagation(); downloadSingleQR(cyl); }}
                          className="flex items-center gap-1 text-[8px] font-black uppercase hover:bg-white/20 px-2 py-1 rounded-sm w-full justify-center"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); previewQR(cyl); }}
                          className="flex items-center gap-1 text-[8px] font-black uppercase hover:bg-white/20 px-2 py-1 rounded-sm w-full justify-center"
                        >
                          <QrCode className="w-3 h-3" />
                          View
                        </button>
                      </div>
                    </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{cyl.weight} • {cyl.status}</p>
                    <p className="text-sm font-black text-gray-900 truncate">{cyl.id}</p>
                    <p className="text-xs font-bold text-gray-400">{cyl.location}</p>
                  </div>
                  <StatusIndicator status={cyl.status} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedQR && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedQR(null)}
               className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="relative bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl text-center"
            >
              <button 
                onClick={() => setSelectedQR(null)}
                className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                id="close-qr-preview"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
              
              <div className="mb-8">
                <h3 className="text-xl font-black text-gray-900 mb-1">Cylinder QR Code</h3>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{selectedQR.id}</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 mb-8">
                <img src={selectedQR.url} alt="QR Code" className="w-full h-auto" />
              </div>

              <button 
                onClick={() => {
                   const link = document.createElement('a');
                   link.href = selectedQR.url;
                   link.download = `${selectedQR.id}_QR.png`;
                   link.click();
                }}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                id="download-qr-btn"
              >
                <Download className="w-5 h-5" />
                Download PNG
              </button>
            </motion.div>
          </div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 z-[100]"
          >
            <div className="p-1 bg-white/20 rounded-full">
              <Check className="w-4 h-4" strokeWidth={4} />
            </div>
            Registration Successful!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const colors = {
    available: 'bg-emerald-500',
    dispatched: 'bg-orange-500',
    delivered: 'bg-blue-500',
    returned: 'bg-purple-500',
  } as any;

  return (
    <div className={`w-3 h-3 rounded-full ${colors[status] || 'bg-gray-300'} shadow-sm`} />
  );
}
