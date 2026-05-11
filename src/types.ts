export type UserRole = 'admin' | 'driver' | 'accountant';

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  phoneNumber: string;
  displayName: string;
  role: UserRole;
  vehicleNumber?: string;
  activeDispatchId?: string;
  lastPing?: string;
  lastLocation?: {
    lat: number;
    lng: number;
  };
  createdAt: string;
}

export type CylinderWeight = '2kg' | '4kg' | '12kg' | '14kg' | '17kg' | '19kg' | '21kg' | '33kg' | '50kg';

export interface StockItem {
  weight: CylinderWeight;
  available: number;
  total: number;
}

export interface StockSummary {
  items: StockItem[];
  updatedAt: string;
}

export type DispatchStatus = 'pending' | 'picked_up' | 'delivered' | 'expired';

export interface Dispatch {
  id: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  quantity: number;
  destination: 'Godown' | 'Office';
  status: DispatchStatus;
  expiryTime: string;
  createdAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  qrCodeData: string;
}

export type OrderStatus = 'pending' | 'assigned' | 'delivered' | 'expired';

export interface Order {
  id: string;
  cylinderWeight: CylinderWeight;
  quantity: number;
  customerName: string;
  driverId: string;
  driverName: string;
  status: OrderStatus;
  location: string;
  notes?: string;
  createdAt: string;
  expiryTime: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  dispatchId: string;
  customerId: string;
  customerName: string;
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  status: 'draft' | 'issued' | 'paid';
}

export interface BusinessSettings {
  businessName: string;
  address: string;
  phone: string;
  gstin: string;
  logoUrl: string;
  invoicePrefix: string;
  defaultTaxRate: number;
  footerText: string;
  themeColor: string;
  lastInvoiceNumber: number;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  rate: number;
  createdAt: string;
}

export type QRStatus = 'pending' | 'dispatched' | 'delivered' | 'returned';

export interface Cylinder {
  id: string; // This will be the cylinderId
  weight: CylinderWeight;
  type: 'LPG';
  status: 'available' | 'dispatched' | 'delivered' | 'returned';
  location: string;
  qrToken: string;
  createdAt: string;
}

export interface QRCodeData {
  id: string;
  orderId: string;
  cylinderIndex: number;
  token: string;
  status: QRStatus;
  expiryTime: string;
  scannedAt?: string;
  labourId: string;
  dispatchId?: string;
  scanCount: number;
  deliveryScan?: {
    status: boolean;
    time: string;
    lat: number;
    lng: number;
  };
  pickupScan?: {
    status: boolean;
    time: string;
    lat: number;
    lng: number;
  };
}

export interface DispatchV2 {
  id: string;
  cylinders: string[];
  labourId: string;
  labourName: string;
  handoverTo: string;
  deliveryTimeLimit: string;
  pickupTimeLimit: string;
  createdAt: string;
  customerId?: string;
  customerName?: string;
  status?: 'pending' | 'assigned' | 'completed';
}

export type TrackingType = 'pickup' | 'delivery' | 'ping';

export interface TrackingPing {
  id: string;
  orderId: string;
  qrId?: string;
  labourId: string;
  lat: number;
  lng: number;
  timestamp: string;
  type: TrackingType;
}

export type AlertType = 'expiry' | 'unauthorized' | 'missing_scan' | 'limit_exceeded';

export interface Alert {
  id: string;
  type: AlertType;
  dispatchId?: string;
  orderId?: string;
  message: string;
  createdAt: string;
  resolved: boolean;
  lat?: number;
  lng?: number;
  scanTime?: string;
}
