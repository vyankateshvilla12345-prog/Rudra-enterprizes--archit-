import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTracking, useOrders, useDrivers } from '../hooks/useFirebaseData';
import { Truck, MapPin, Navigation, User, Clock } from 'lucide-react';
import { formatDate } from '../lib/utils';

const DriverIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white transform -rotate-45">
            <div class="transform rotate-45">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-2.035-2.607A1 1 0 0 0 17.18 9H15"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
            </div>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40]
});

const DeliveryIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [35, 35],
    iconAnchor: [17, 35]
});

const PickupIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    className: 'hue-rotate-[240deg]' // Blueish
});

export default function LiveTracking() {
  const { data: pings } = useTracking();
  const { data: orders } = useOrders();
  const { data: drivers } = useDrivers();

  // Group paths by labourId and orderId
  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'pending');
  
  const currentRoutes = activeOrders.map(order => ({
    order,
    positions: pings
      .filter(p => p.orderId === order.id && p.labourId === order.driverId)
      .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(p => [p.lat, p.lng] as [number, number])
  }));

  const activeDrivers = drivers.filter(d => d.lastLocation);

  return (
    <div className="p-8 h-full space-y-6 flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Fleet Intelligence</h1>
          <p className="text-gray-500 font-bold tracking-tight">Satellite view of all active personnel and delivery routes.</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 h-[calc(100vh-250px)] rounded-[40px] overflow-hidden border border-gray-100 shadow-xl relative">
          <MapContainer center={[6.5244, 3.3792]} zoom={12} className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {/* Direct Driver Markers */}
            {activeDrivers.map(driver => (
              <Marker 
                key={driver.uid} 
                position={[driver.lastLocation!.lat, driver.lastLocation!.lng]}
                icon={DriverIcon}
              >
                <Popup className="custom-popup">
                   <div className="p-3 min-w-[180px]">
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black">
                          {driver.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 leading-none mb-1">{driver.displayName}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{driver.vehicleNumber}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Navigation className="w-3 h-3 text-blue-500" />
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            {driver.activeDispatchId ? 'Status: IN-TRANSIT' : 'Status: STANDBY'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-gray-300" />
                          <span className="text-[10px] font-bold text-gray-400">Last Ping: {formatDate(driver.lastPing!)}</span>
                        </div>
                      </div>
                   </div>
                </Popup>
              </Marker>
            ))}

            {currentRoutes.map((route, i) => (
              <React.Fragment key={route.order.id}>
                {route.positions.length > 1 && (
                  <Polyline positions={route.positions} pathOptions={{ color: i % 2 === 0 ? '#3b82f6' : '#8b5cf6', weight: 4, opacity: 0.4, dashArray: '10, 10' }} />
                )}
              </React.Fragment>
            ))}
          </MapContainer>
        </div>

        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-250px)] pr-2">
           <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight px-2">Personnel Feed</h2>
           <div className="space-y-4">
              {drivers.map(driver => {
                 const isOnline = driver.lastPing && (Date.now() - new Date(driver.lastPing).getTime() < 1000 * 60 * 15);
                 return (
                   <div key={driver.uid} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm transition-all hover:shadow-md cursor-pointer group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all ${isOnline ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                             {driver.displayName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors">{driver.displayName}</p>
                            <p className="text-[10px] font-bold text-gray-400">{driver.vehicleNumber}</p>
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-200'}`} />
                      </div>
                      
                      <div className="space-y-3 pt-4 border-t border-gray-50">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Dispatch</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${driver.activeDispatchId ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
                               {driver.activeDispatchId ? driver.activeDispatchId.slice(-6) : 'NONE'}
                            </span>
                         </div>
                         {driver.lastLocation && (
                           <div className="flex items-center gap-2 text-gray-400">
                              <MapPin className="w-3 h-3 text-blue-500" />
                              <span className="text-[10px] font-bold truncate">Located in Regional Grid</span>
                           </div>
                         )}
                      </div>
                   </div>
                 );
              })}
           </div>
        </div>
      </div>
    </div>
  );
}
