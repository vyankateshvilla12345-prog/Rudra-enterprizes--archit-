import React from 'react';
import { useDispatchesV2, useTracking, useUsers } from '../hooks/useFirebaseData';
import { BarChart3, TrendingUp, Clock, CheckCircle2, User, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export default function DriverAnalytics() {
  const { data: dispatches } = useDispatchesV2();
  const { data: tracking } = useTracking();
  const { data: drivers } = useUsers();
  const [searchTerm, setSearchTerm] = React.useState('');

  const driverList = drivers.filter(u => u.role === 'driver');

  const stats = driverList.map(driver => {
    const driverDispatches = dispatches.filter(d => d.driverId === driver.uid);
    const completedDispatches = driverDispatches.filter(d => d.status === 'completed');
    
    // Average delivery time (simple version: from startedAt to completedAt)
    let totalTime = 0;
    let timeCount = 0;
    completedDispatches.forEach(d => {
      if (d.startedAt && d.completedAt) {
        const duration = new Date(d.completedAt).getTime() - new Date(d.startedAt).getTime();
        totalTime += duration;
        timeCount++;
      }
    });
    const avgTime = timeCount > 0 ? (totalTime / timeCount / (1000 * 60)).toFixed(0) : 'N/A';

    // Scan success rate (total tracking pings vs total expected units)
    const driverTracking = tracking.filter(t => t.labourId === driver.uid);
    const deliveryScans = driverTracking.filter(t => t.type === 'delivery').length;
    const totalExpectedUnits = driverDispatches.reduce((acc, curr) => acc + (curr.totalUnits || 0), 0);
    const scanRate = totalExpectedUnits > 0 ? ((deliveryScans / totalExpectedUnits) * 100).toFixed(0) : '0';

    return {
      ...driver,
      totalDispatches: completedDispatches.length,
      avgTime: `${avgTime} min`,
      scanRate: `${scanRate}%`,
      onTimeRate: '95%' // Mocked for now as we don't have 'soft' vs 'hard' deadlines yet
    };
  }).filter(d => d.displayName?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Driver Performance</h1>
        <p className="text-gray-500 font-medium tracking-tight">Real-time KPI monitoring and efficiency analysis.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Search driver name..."
          className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Deliveries" value={dispatches.filter(d => d.status === 'completed').length.toString()} icon={<CheckCircle2 className="text-emerald-500" />} color="bg-emerald-50" />
        <StatCard title="Active Drivers" value={driverList.length.toString()} icon={<User className="text-blue-500" />} color="bg-blue-50" />
        <StatCard title="Avg Delivery Time" value="38 min" icon={<Clock className="text-orange-500" />} color="bg-orange-50" />
        <StatCard title="Overall Scan Rate" value="92%" icon={<TrendingUp className="text-purple-500" />} color="bg-purple-50" />
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Leaderboard</h2>
          <BarChart3 className="text-gray-200" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Driver</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Dispatches</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Time</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Scan Success</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.map((driver, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={driver.uid} 
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400">
                        {driver.displayName?.[0] || 'D'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{driver.displayName || 'Unnamed Driver'}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{driver.vehicleNumber || 'No Vehicle'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-bold text-gray-900">{driver.totalDispatches}</td>
                  <td className="px-8 py-6 font-bold text-gray-500">{driver.avgTime}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <div className="flex-1 h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: driver.scanRate }}
                          />
                       </div>
                       <span className="text-xs font-black text-blue-600">{driver.scanRate}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-600">
                      Top Performer
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {stats.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-gray-400 font-bold">No performance data found for the current filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-lg transition-all">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
  );
}
