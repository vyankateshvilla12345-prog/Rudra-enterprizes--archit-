import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc, getDocs, query, where, limit, runTransaction, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, MapPin, CheckCircle, LogOut, Loader2, Camera, AlertCircle, ShoppingBag, Clock, ChevronRight, Truck } from 'lucide-react';
import { DispatchV2 } from '../types';

export default function StaffPortal() {
  const { profile, logout } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [message, setMessage] = useState('');
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [myDispatches, setMyDispatches] = useState<DispatchV2[]>([]);
  const [loadingDispatches, setLoadingDispatches] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const locationIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    // Fetch My Dispatches
    const q = query(
      collection(db, 'dispatchesV2'), 
      where('labourId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyDispatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DispatchV2)));
      setLoadingDispatches(false);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  useEffect(() => {
    // Background Ping Service
    const startPing = () => {
      locationIntervalRef.current = setInterval(async () => {
        if (!navigator.geolocation) return;
        
        navigator.geolocation.getCurrentPosition(async (pos) => {
          if (profile?.uid) {
            try {
              await updateDoc(doc(db, 'users', profile.uid), {
                lastPing: new Date().toISOString(),
                lastLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude }
              });
            } catch (e) {
              console.error("Ping failed", e);
            }
          }
        }, (err) => console.error("Geo error", err), { enableHighAccuracy: true });
      }, 1000 * 60 * 5); // 5 minutes
    };

    startPing();
    
    // Check for dispatchId in URL
    const params = new URLSearchParams(window.location.search);
    const dIdFromUrl = params.get('dispatchId');
    if (dIdFromUrl && status === 'idle') {
      processDispatchScan(dIdFromUrl);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [profile?.uid]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (scanning) {
      // Small delay to ensure the DOM element #reader is mounted
      const timer = setTimeout(() => {
        const element = document.getElementById("reader");
        if (element && !scannerRef.current) {
          scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
          );
          scannerRef.current = scanner;
          scanner.render(onScanSuccess, onScanFailure);
        }
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch(error => console.error("Failed to clear scanner", error));
          scannerRef.current = null;
        }
      };
    }
  }, [scanning]);

  async function onScanSuccess(decodedText: string) {
    if (status === 'loading' || confirmationData) return;
    
    try {
      // Show intermediate loading
      setStatus('loading');
      setMessage("Validating scan...");

      // Check if it's a dispatch URL
      if (decodedText.includes('dispatchId=')) {
        const url = new URL(decodedText);
        const dispatchId = url.searchParams.get('dispatchId');
        if (dispatchId) {
          processDispatchScan(dispatchId);
          return;
        }
      }

      let qrPayload;
      try {
        qrPayload = JSON.parse(decodedText);
      } catch (e) {
        if (decodedText.includes('|')) {
           const [id, token] = decodedText.split('|');
           qrPayload = { orderId: 'manual', token, id };
        } else {
           throw new Error("Invalid QR format. Please use the system-generated QR.");
        }
      }

      // FETCH FULL DOCUMENT FOR CONFIRMATION
      let qrDoc;
      let isCylinderHardware = false;

      // 1. Try cylinders collection first (Hardware Units)
      if (qrPayload.id) {
        const cylDocRef = doc(db, 'cylinders', qrPayload.id);
        const cylSnap = await getDoc(cylDocRef);
        if (cylSnap.exists() && cylSnap.data().qrToken === qrPayload.token) {
           qrDoc = cylSnap;
           isCylinderHardware = true;
        }
      }

      // 2. Fallback to qrCodes collection (Order/Dispatch Specific)
      if (!qrDoc) {
        if (qrPayload.id) {
          const qrSnap = await getDocs(query(collection(db, 'qrCodes'), where('id', '==', qrPayload.id), where('token', '==', qrPayload.token), limit(1)));
          if (!qrSnap.empty) qrDoc = qrSnap.docs[0];
        } else if (qrPayload.orderId) {
          const q = query(collection(db, 'qrCodes'), 
            where('orderId', '==', qrPayload.orderId), 
            where('cylinderIndex', '==', qrPayload.index), 
            where('token', '==', qrPayload.token)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) qrDoc = querySnapshot.docs[0];
        }
      }

      if (!qrDoc) throw new Error("Unit record not found or security token mismatch.");

      const fullData = qrDoc.data();
      
      // Get driver name if assigned
      let driverName = 'Unassigned';
      if (fullData.labourId) {
        const driverSnap = await getDoc(doc(db, 'users', fullData.labourId));
        if (driverSnap.exists()) driverName = driverSnap.data().displayName || 'Driver';
      }

      setConfirmationData({
        ...qrPayload,
        dbId: qrDoc.id,
        isCylinder: isCylinderHardware,
        fullData,
        driverName
      });
      
      setScanning(false);
      setStatus('idle');
    } catch (e: any) {
      setScanning(false);
      setStatus('error');
      setMessage(e.message);
    }
  }

  async function processDispatchScan(dispatchId: string) {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const dispatchRef = doc(db, 'dispatchesV2', dispatchId);
      await updateDoc(dispatchRef, {
        status: 'in-transit',
        startedAt: new Date().toISOString()
      });

      setStatus('success');
      setMessage("Trip Started! You can now scan cylinders for this dispatch.");
    } catch (e: any) {
      setStatus('error');
      setMessage("Failed to start trip: " + e.message);
    }
  }

  async function processScan(qrPayload: any) {
    const { dbId, fullData, isCylinder } = qrPayload;
    setConfirmationData(null);
    setStatus('loading');
    
    try {
      // 1. Get high accuracy location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const { latitude: lat, longitude: lng } = position.coords;

      // 3. VALIDATIONS
      // For cylinders, find if it's in an active dispatch for this driver
      let associatedDispatchId = fullData.dispatchId;
      
      if (isCylinder && !associatedDispatchId) {
         // Attempt to find an active dispatch containing this cylinder for this user
         const activeDispatch = myDispatches.find(d => d.status !== 'completed' && d.cylinders.includes(dbId));
         if (activeDispatch) {
            associatedDispatchId = activeDispatch.id;
         }
      }

      const labourId = fullData.labourId || (isCylinder ? '' : ''); // Cylinders might not have labourId until scan

      if (!isCylinder && labourId !== profile?.uid && profile?.role !== 'accountant') {
        const msg = `${profile?.displayName} (driver) attempted to scan a unit allotted to ${qrPayload.driverName || 'another person'}.`;
        await addDoc(collection(db, 'alerts'), {
          type: 'unauthorized',
          message: msg,
          orderId: fullData.orderId || 'manual',
          createdAt: new Date().toISOString(),
          resolved: false,
          lat, lng,
          scanTime: new Date().toISOString()
        });
        throw new Error("UNAUTHORIZED: This unit is assigned to another driver. Alert has been sent to admin.");
      }

      let scanType: 'pickup' | 'delivery' = fullData.status === 'dispatched' ? 'delivery' : 'pickup';

      await runTransaction(db, async (transaction) => {
        const collectionName = isCylinder ? 'cylinders' : 'qrCodes';
        const docRef = doc(db, collectionName, dbId);
        const currentSnap = await transaction.get(docRef);
        
        if (!currentSnap.exists()) throw new Error("Unit record lost.");
        const data = currentSnap.data();

        let updateData: any = {};

        if (data.status === 'available' || data.status === 'pending' || data.status === 'returned') {
          updateData = {
            status: 'dispatched',
            scannedAt: new Date().toISOString(),
            pickupScan: { status: true, time: new Date().toISOString(), lat, lng },
            scanCount: (data.scanCount || 0) + 1,
            labourId: profile?.uid,
            location: 'In Transit'
          };
        } else if (data.status === 'dispatched') {
          updateData = {
            status: 'delivered',
            scannedAt: new Date().toISOString(),
            deliveryScan: { status: true, time: new Date().toISOString(), lat, lng },
            scanCount: (data.scanCount || 0) + 1,
            location: 'Customer Location'
          };
        } else if (data.status === 'delivered') {
          updateData = {
            status: 'returned',
            scannedAt: new Date().toISOString(),
            pickupScan: { status: true, time: new Date().toISOString(), lat, lng },
            scanCount: (data.scanCount || 0) + 1,
            location: 'Godown (Pending Handover)'
          };
        } else {
          throw new Error(`Unit is already ${data.status}`);
        }

        transaction.update(docRef, updateData);

        // Update Order document if linked via qrCodes
        if (!isCylinder && data.orderId && data.orderId !== 'manual') {
          const orderRef = doc(db, 'orders', data.orderId);
          const orderDoc = await transaction.get(orderRef);
          
          if (orderDoc.exists()) {
             const totalQuantity = orderDoc.data().quantity || 1;
             
             if (updateData.status === 'delivered') {
               const currentDelivered = (orderDoc.data().deliveredCount || 0) + 1;
               transaction.update(orderRef, {
                 deliveredCount: currentDelivered,
                 status: currentDelivered >= totalQuantity ? 'delivered' : 'assigned',
                 lastDeliveryAt: new Date().toISOString(),
                 lastDeliveryLocation: { lat, lng }
               });
             } else if (updateData.status === 'dispatched') {
               transaction.update(orderRef, {
                 status: 'assigned',
                 lastPickupAt: new Date().toISOString()
               });
             }
          }
        }
      });
      
      // Update User Profile with last location and ping
      if (profile?.uid) {
        await updateDoc(doc(db, 'users', profile.uid), {
          lastPing: new Date().toISOString(),
          lastLocation: { lat, lng }
        });
      }
      
      // Tracking
      await addDoc(collection(db, 'tracking'), {
        orderId: fullData.orderId || 'manual',
        qrId: dbId,
        labourId: profile.uid,
        lat, lng,
        timestamp: new Date().toISOString(),
        type: scanType
      });

      // Update Dispatch Status if applicable
      const finalDispatchId = associatedDispatchId || fullData.dispatchId;
      if (finalDispatchId && scanType === 'delivery') {
        const dispatchRef = doc(db, 'dispatchesV2', finalDispatchId);
        const dispatchSnap = await getDoc(dispatchRef);
        if (dispatchSnap.exists()) {
           const dispatchData = dispatchSnap.data();
           const cylinders = dispatchData.cylinders as string[];
           
           // Check if all cylinders in this dispatch are delivered
           // This query might need to check both collections or we rely on cylinders collection for V2
           const deliveredCount = await getDocs(query(
             collection(db, isCylinder ? 'cylinders' : 'qrCodes'),
             where('dispatchId', '==', finalDispatchId),
             where('status', '==', 'delivered')
           )).then(s => s.size);

           if (deliveredCount >= cylinders.length) {
              await updateDoc(dispatchRef, {
                status: 'completed',
                completedAt: new Date().toISOString()
              });
           }
        }
      }

      // Show Animation then result
      setShowAnimation(true);
      setTimeout(() => {
        setShowAnimation(false);
        setStatus('success');
        setMessage(scanType === 'delivery' ? "Delivery Confirmed!" : "Pickup Successful!");
      }, 2000);
      
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage(error.message || "Processing failed.");
    }
  }

  function onScanFailure(error: any) {}

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-6">
      <AnimatePresence>
        {confirmationData && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setConfirmationData(null)}
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-sm bg-gray-800 rounded-[40px] p-8 shadow-2xl border border-white/5"
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Confirm Scan</h3>
                  <p className="text-gray-400 text-sm">Verify unit details</p>
                </div>

                <div className="space-y-2">
                  <div className="bg-white/5 p-4 rounded-3xl text-left">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Cylinder Info</p>
                    <p className="text-sm font-bold truncate">{confirmationData.fullData?.id || 'LPG Unit'}</p>
                    <p className="text-[10px] font-bold text-blue-500">{confirmationData.fullData?.weight} • {confirmationData.fullData?.status}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 p-4 rounded-3xl text-left">
                      <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Order ID</p>
                      <p className="text-sm font-bold truncate">#{confirmationData.fullData?.orderId?.slice(0,8) || 'Manual'}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-3xl text-left">
                      <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Driver</p>
                      <p className="text-sm font-bold truncate">{confirmationData.driverName || 'None'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => processScan(confirmationData)}
                    className="w-full bg-blue-600 py-4 rounded-3xl font-bold flex items-center justify-center gap-2"
                  >
                    Confirm Action
                  </button>
                  <button 
                    onClick={() => setConfirmationData(null)}
                    className="w-full bg-white/5 py-4 rounded-3xl font-bold text-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showAnimation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-600">
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: 1 }}
              className="relative"
            >
               <motion.div 
                 initial={{ scale: 0.5, opacity: 0 }}
                 animate={{ scale: 3, opacity: 0 }}
                 transition={{ duration: 1, repeat: Infinity }}
                 className="absolute inset-0 bg-white/30 rounded-full"
               />
               <motion.div 
                 initial={{ scale: 0.5, opacity: 0 }}
                 animate={{ scale: 4, opacity: 0 }}
                 transition={{ duration: 1, delay: 0.3, repeat: Infinity }}
                 className="absolute inset-0 bg-white/20 rounded-full"
               />
               <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl relative z-10">
                 <CheckCircle className="w-20 h-20 text-blue-600" strokeWidth={3} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-xl font-bold">Hello, {profile?.displayName?.split(' ')[0]}</h1>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{profile?.vehicleNumber}</p>
        </div>
        <button onClick={logout} className="p-3 bg-white/5 rounded-2xl text-gray-400">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col pt-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {status === 'idle' && !scanning && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="space-y-8 pb-32"
            >
              {/* Stats & Scan CTA */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 flex flex-col justify-between aspect-square">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Today's Scans</p>
                  <p className="text-3xl font-black">24</p>
                </div>
                <div 
                   onClick={() => setScanning(true)}
                   className="bg-blue-600 p-6 rounded-[32px] flex flex-col justify-between aspect-square cursor-pointer active:scale-95 transition-all shadow-xl shadow-blue-900/20"
                >
                  <Camera className="w-8 h-8" />
                  <p className="font-black text-xl leading-tight">Start<br/>Scanner</p>
                </div>
              </div>

              {/* My Dispatches Section */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                       <button 
                          onClick={() => setActiveTab('active')}
                          className={`text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'text-white' : 'text-gray-600'}`}
                       >
                          Active
                       </button>
                       <button 
                          onClick={() => setActiveTab('completed')}
                          className={`text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'text-white' : 'text-gray-600'}`}
                       >
                          Completed
                       </button>
                    </div>
                    <span className="text-[10px] font-bold bg-white/5 px-3 py-1 rounded-full text-gray-500">
                       {myDispatches.filter(d => activeTab === 'active' ? d.status !== 'completed' : d.status === 'completed').length} {activeTab.toUpperCase()}
                    </span>
                 </div>

                 {loadingDispatches ? (
                   <div className="flex flex-col items-center py-10 gap-2 opacity-50">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <p className="text-xs font-bold uppercase tracking-widest">Loading tasks...</p>
                   </div>
                 ) : myDispatches.filter(d => activeTab === 'active' ? d.status !== 'completed' : d.status === 'completed').length === 0 ? (
                    <div className="bg-white/5 rounded-[40px] p-8 text-center border border-dashed border-white/10">
                       <Truck className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                       <p className="text-sm font-bold text-gray-500 italic">No {activeTab} dispatches found.</p>
                    </div>
                 ) : (
                   <div className="space-y-3">
                      {myDispatches
                        .filter(d => activeTab === 'active' ? d.status !== 'completed' : d.status === 'completed')
                        .map((dispatch, idx) => (
                        <motion.div 
                          key={dispatch.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white/5 p-5 rounded-[32px] border border-white/5 group active:bg-white/10 transition-all text-left"
                        >
                           <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                 <div className={`w-10 h-10 ${dispatch.status === 'completed' ? 'bg-emerald-500/20' : 'bg-blue-500/20'} rounded-2xl flex items-center justify-center`}>
                                    <ShoppingBag className={`w-5 h-5 ${dispatch.status === 'completed' ? 'text-emerald-500' : 'text-blue-500'}`} />
                                 </div>
                                 <div className="max-w-[150px]">
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${dispatch.status === 'completed' ? 'text-emerald-500' : 'text-blue-500'}`}>{dispatch.customerName || 'Manual'}</p>
                                    <p className="font-black text-sm truncate">#{dispatch.id.slice(-6)}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Cylinders</p>
                                 <p className={`font-black ${dispatch.status === 'completed' ? 'text-emerald-500' : 'text-blue-500'}`}>{dispatch.cylinders.length}</p>
                              </div>
                           </div>
                           
                           <div className="flex items-center justify-between pt-4 border-t border-white/5">
                              <div className="flex items-center gap-1.5">
                                 <Clock className="w-3.5 h-3.5 text-gray-500" />
                                 <p className="text-[10px] font-bold text-gray-400">
                                    {dispatch.status === 'completed' ? `Done: ${new Date(dispatch.completedAt || '').toLocaleDateString()}` : `Due: ${new Date(dispatch.deliveryTimeLimit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                 </p>
                              </div>
                              <span className={`text-[10px] font-black ${dispatch.status === 'completed' ? 'text-emerald-500' : 'text-blue-500'} uppercase flex items-center gap-1 group-hover:gap-2 transition-all`}>
                                 {dispatch.status === 'completed' ? 'Details' : 'View Task'} <ChevronRight className="w-3 h-3" />
                              </span>
                           </div>
                        </motion.div>
                      ))}
                   </div>
                 )}
              </div>
            </motion.div>
          )}

          {scanning && (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex-1 flex flex-col items-center justify-center gap-6"
            >
              <div id="reader" className="w-full max-w-sm rounded-[40px] overflow-hidden border-4 border-blue-500 shadow-2xl"></div>
              <button 
                onClick={() => setScanning(false)}
                className="bg-red-500/10 text-red-500 px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs border border-red-500/20"
              >
                Close Scanner
              </button>
            </motion.div>
          )}

          {status === 'loading' && (
            <motion.div 
              key="loading"
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="font-bold">Processing Scan...</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div 
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-900/20">
                <CheckCircle className="w-16 h-16 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-emerald-500">{message}</h2>
                <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-sm">
                  <MapPin className="w-4 h-4" /> Location captured & synced
                </div>
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="w-full bg-emerald-500 py-5 rounded-3xl font-bold text-lg active:scale-95 transition-all"
              >
                Done
              </button>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              key="error"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-32 h-32 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-16 h-16 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-red-500">{message}</h2>
              <button 
                onClick={() => setStatus('idle')}
                className="w-full bg-white/10 py-5 rounded-3xl font-bold text-lg active:scale-95 transition-all"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
