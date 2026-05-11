import React, { useState } from 'react';
import { useStock, VALID_WEIGHTS } from '../hooks/useFirebaseData';
import { motion, AnimatePresence } from 'motion/react';
import { Package, TrendingUp, Info, Plus, X, Loader2, Save } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StockItem } from '../types';

export default function StockOverview() {
  const { data: stock, loading } = useStock();
  const [showEditModal, setShowEditModal] = useState(false);

  if (loading) return <div className="p-8 text-gray-400 font-bold">Checking inventory...</div>;

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Stock Analysis</h1>
          <p className="text-gray-500 font-medium tracking-tight whitespace-nowrap">LPG Cylinder inventory grouped by weight.</p>
        </div>
        <button 
          onClick={() => setShowEditModal(true)}
          className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl hover:bg-black transition-all active:scale-[0.98] w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Update Inventory
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {stock?.items.map((item, i) => (
          <motion.div
            key={item.weight}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`glass-card p-6 rounded-[32px] border-2 transition-all relative overflow-hidden group ${
              item.available < 10 ? 'border-red-100 bg-red-50/20' : 'border-transparent hover:border-blue-100'
            }`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50">
                <Package className={`w-5 h-5 ${item.available < 10 ? 'text-red-500' : 'text-blue-600'}`} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">Format</span>
                <span className="text-lg font-black text-gray-900">{item.weight}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available</p>
                  <p className={`text-3xl font-black ${item.available < 10 ? 'text-red-600' : 'text-gray-900'}`}>{item.available}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Capacity</p>
                  <p className="text-sm font-bold text-gray-500">{item.total}</p>
                </div>
              </div>

              <div className="h-2 bg-gray-100/50 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.available / Math.max(1, item.total)) * 100}%` }}
                  className={`h-full rounded-full transition-all ${
                    item.available < 10 ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                />
              </div>

              {item.available < 10 && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-red-500 animate-pulse bg-red-50 py-1.5 px-3 rounded-full justify-center">
                  <Info className="w-3 h-3" /> CRITICAL STOCK LEVEL
                </div>
              )}
            </div>

            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <TrendingUp className="w-4 h-4 text-gray-200" />
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showEditModal && stock && (
          <InventoryUpdateModal 
            initialItems={stock.items}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </AnimatePresence>

      <div className="bg-gray-900 text-white p-10 rounded-[48px] shadow-2xl relative overflow-hidden mt-8">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-black mb-2">Inventory Management Tip</h2>
            <p className="text-gray-400 font-medium max-w-md">
              Maintain a steady supply of 14kg and 19kg variants as they represent over 80% of your daily distribution volume.
            </p>
          </div>
          <button 
            onClick={() => setShowEditModal(true)}
            className="bg-white text-gray-900 px-8 py-4 rounded-3xl font-bold shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            Update Stock Plan
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 -mr-20 -mt-20"></div>
      </div>
    </div>
  );
}

function InventoryUpdateModal({ initialItems, onClose }: { initialItems: StockItem[], onClose: () => void }) {
  const [items, setItems] = useState<StockItem[]>(JSON.parse(JSON.stringify(initialItems)));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'stock', 'summary'), {
        items,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to update inventory.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateItem = (weight: string, field: 'available' | 'total', value: number) => {
    setItems(prev => prev.map(item => 
      item.weight === weight ? { ...item, [field]: Math.max(0, value) } : item
    ));
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
        className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-10 max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-black text-gray-900 mb-2">Update Inventory</h2>
        <p className="text-gray-400 font-bold text-sm mb-8">Manually adjust available and total cylinder capacity.</p>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <span>Weight</span>
            <span className="text-center">Available</span>
            <span className="text-center">Total Capacity</span>
          </div>
          {items.map((item) => (
            <div key={item.weight} className="grid grid-cols-3 gap-4 items-center bg-gray-50 p-4 rounded-2xl group transition-all hover:bg-gray-100/50">
              <span className="font-black text-gray-900">{item.weight}</span>
              <div className="flex justify-center">
                <input 
                  type="number"
                  className="w-20 bg-white border border-gray-100 rounded-xl px-2 py-2 text-center font-bold text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  value={item.available}
                  onChange={(e) => updateItem(item.weight, 'available', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex justify-center">
                <input 
                  type="number"
                  className="w-20 bg-white border border-gray-100 rounded-xl px-2 py-2 text-center font-bold text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  value={item.total}
                  onChange={(e) => updateItem(item.weight, 'total', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
