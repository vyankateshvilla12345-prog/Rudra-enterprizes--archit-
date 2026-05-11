import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Dispatch, StockSummary, Alert, TrackingPing, UserProfile, Order, StockItem, QRCodeData, DispatchV2, Cylinder, Customer, Invoice, BusinessSettings } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const VALID_WEIGHTS = ['2kg', '4kg', '12kg', '14kg', '17kg', '19kg', '21kg', '33kg', '50kg'] as const;

export function useUsers() {
  const [data, setData] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'users';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    }, (error) => {
      console.error("Users list error:", error);
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for users list. This is expected if you haven't linked your account yet.");
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { data, loading };
}

export function useCylinders() {
  const [data, setData] = useState<Cylinder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'cylinders';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cylinder)));
      setLoading(false);
    }, (error) => {
      console.error("Cylinders list error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { data, loading };
}

export function useQRCodes() {
  const [data, setData] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'qrCodes'), orderBy('expiryTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QRCodeData)));
      setLoading(false);
    }, (error) => {
      console.error("QR list error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { data, loading };
}

export function useDispatchesV2() {
  const [data, setData] = useState<DispatchV2[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'dispatchesV2'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DispatchV2)));
      setLoading(false);
    }, (error) => {
      console.error("DispatchesV2 list error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { data, loading };
}

export function useDispatches() {
  const [data, setData] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'dispatches'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dispatch)));
      setLoading(false);
    }, (error) => {
      console.error("Dispatches list error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { data, loading };
}

export function useOrders() {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (error) => {
      console.error("Orders list error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { data, loading };
}

export function useStock() {
  const [data, setData] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'stock', 'summary');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.data() as StockSummary);
      } else {
        // Initialize default stock if document doesn't exist
        const initialItems: StockItem[] = VALID_WEIGHTS.map(weight => ({
          weight: weight as any,
          available: 100,
          total: 100,
        }));
        setData({ items: initialItems, updatedAt: new Date().toISOString() });
      }
      setLoading(false);
    }, (error) => {
      console.error("Stock snapshot error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { data, loading };
}

export function useDrivers() {
  const [data, setData] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('role'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setData(users.filter(u => u.role === 'driver'));
      setLoading(false);
    }, (error) => {
      console.error("Drivers list error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { data, loading };
}

export function useAlerts() {
  const [data, setData] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert)));
      setLoading(false);
    }, (error) => {
      console.error("Alerts snapshot error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { data, loading };
}

export function useTracking() {
  const [data, setData] = useState<TrackingPing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'tracking'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrackingPing)));
      setLoading(false);
    }, (error) => {
      console.error("Tracking error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { data, loading };
}

export function useCustomers() {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
      setLoading(false);
    }, (error) => {
      console.error("Customers list error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { data, loading };
}

export function useInvoices() {
  const [data, setData] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { data, loading };
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'business'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as BusinessSettings);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { settings, loading };
}
