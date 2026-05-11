import React, { useState } from 'react';
import { useCustomers } from '../hooks/useFirebaseData';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Search, Trash2, Edit2, MapPin, IndianRupee, X, Check, Loader2, FileText } from 'lucide-react';
import InvoiceGenerator from './InvoiceGenerator';

export default function CustomersSection() {
  const { data: customers, loading } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', rate: '' });
  const [saving, setSaving] = useState(false);
  const [selectedInvoiceCustomer, setSelectedInvoiceCustomer] = useState<any>(null);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'customers', editingId), {
          ...formData,
          rate: Number(formData.rate)
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          rate: Number(formData.rate),
          createdAt: new Date().toISOString()
        });
      }
      setShowAddModal(false);
      setEditingId(null);
      setFormData({ name: '', address: '', rate: '' });
    } catch (error) {
      console.error("Error saving customer", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (customer: any) => {
    setEditingId(customer.id);
    setFormData({ name: customer.name, address: customer.address, rate: customer.rate.toString() });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      await deleteDoc(doc(db, 'customers', id));
    }
  };

  return (
    <div className="p-8 space-y-8 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Customers</h1>
          <p className="text-gray-500 font-medium tracking-tight">Manage customer database and fixed rates.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Search by name or address..."
          className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-[40px] border border-gray-100 shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center h-64">
             <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Address</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCustomers.map((customer, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={customer.id} 
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-8 py-6">
                      <p className="font-bold text-gray-900">{customer.name}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-gray-500">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <p className="text-sm font-medium">{customer.address}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-1 text-emerald-600 font-black">
                        <IndianRupee className="w-4 h-4" />
                        {customer.rate}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 text-right">
                        <button 
                          onClick={() => setSelectedInvoiceCustomer(customer)}
                          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-sm"
                        >
                           <FileText className="w-3 h-3" />
                           Invoice
                        </button>
                        <button 
                          onClick={() => handleEdit(customer)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredCustomers.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-gray-400 font-bold tracking-tight">No customers found.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedInvoiceCustomer && (
          <InvoiceGenerator 
             customer={selectedInvoiceCustomer}
             onClose={() => setSelectedInvoiceCustomer(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => { setShowAddModal(false); setEditingId(null); }}
               className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
            />
            <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="relative bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                  {editingId ? 'Edit Customer' : 'Add Customer'}
                </h3>
                <button 
                  onClick={() => { setShowAddModal(false); setEditingId(null); }}
                  className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Customer Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Enter full name"
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Address</label>
                  <textarea 
                    required
                    placeholder="Enter delivery address"
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none h-24 resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Base Rate (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input 
                      required
                      type="number" 
                      placeholder="500"
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                      value={formData.rate}
                      onChange={(e) => setFormData({...formData, rate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                   <button 
                    type="button"
                    onClick={() => { setShowAddModal(false); setEditingId(null); }}
                    className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition-all uppercase text-[10px] tracking-widest"
                   >
                    Cancel
                   </button>
                   <button 
                    type="submit"
                    disabled={saving}
                    className="flex-2 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                   >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editingId ? 'Update Customer' : 'Save Customer'}
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
