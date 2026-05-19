"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  TrendingUp, Wallet, Receipt, RefreshCcw, FileText, 
  LayoutGrid, Clock, HandCoins, Smartphone, AlertCircle,
  Calendar, Flame, LineChart, ArrowUpDown, ChevronRight
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

interface Order {
  id: string;
  order_number: string;
  table_number: string;
  total_amount: number;
  payment_method: string;
  closed_at: string;
}

interface PopularMenu {
  id: string;
  name: string;
  image_url: string;
  total_quantity: number;
  total_revenue: number;
}

type TimeFrame = 'daily' | 'monthly' | 'yearly' | 'all';

export default function DashboardPage() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('monthly');
  const [salesResult, setSalesResult] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalBills: 0,
  });
  const [projection, setProjection] = useState<number | null>(null);
  const [popularMenus, setPopularMenus] = useState<PopularMenu[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sorting state for table
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order, direction: 'asc' | 'desc' } | null>({ key: "closed_at", direction: "desc" });

  useEffect(() => {
    fetchDashboardData();
  }, [timeFrame]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);

      const now = new Date();
      let startDateStr, endDateStr;

      if (timeFrame === 'daily') {
        startDateStr = startOfDay(now).toISOString();
        endDateStr = endOfDay(now).toISOString();
      } else if (timeFrame === 'monthly') {
        startDateStr = startOfMonth(now).toISOString();
        endDateStr = endOfMonth(now).toISOString();
      } else if (timeFrame === 'yearly') {
        startDateStr = startOfYear(now).toISOString();
        endDateStr = endOfYear(now).toISOString();
      }

      // 1. ดึงบิลทั้งหมดที่สถานะเป็น 'PAID' (จ่ายแล้ว) ตามกรอบเวลา
      let query = supabase.from("orders").select("id, order_number, table_number, total_amount, payment_method, closed_at").eq("status", "PAID");
      if (startDateStr) query = query.gte("closed_at", startDateStr);
      if (endDateStr) query = query.lte("closed_at", endDateStr);

      const { data: orders, error: orderError } = await query;
      if (orderError) throw orderError;

      const orderIds = orders?.map(o => o.id) || [];

      // 2. ดึงรายการอาหารทั้งหมดที่อยู่ในบิลเหล่านั้น เพื่อหา Top Menus และ ต้นทุน
      let orderItems: any[] = [];
      if (orderIds.length > 0) {
        // จำกัดการ in clause ถ้ายาวไปอาจต้อง chunk แต่เคสนี้ POS ธรรมดาน่าจะรับไหว
        const { data: itemsData, error: itemError } = await supabase
          .from("order_items")
          .select("order_id, menu_item_id, quantity, cost_at_time, price_at_time, menu_items(name, image_url)")
          .in("order_id", orderIds);
        
        if (itemError) throw itemError;
        orderItems = itemsData || [];
      }

      // --- 📊 คำนวณยอดรวม ---
      const totalSales = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const totalCost = orderItems.reduce((sum, item) => sum + ((item.cost_at_time || 0) * item.quantity), 0);
      const totalProfit = totalSales - totalCost;

      setSalesResult({
        totalSales,
        totalProfit,
        totalBills: orders?.length || 0,
      });

      // --- 📈 คาดการณ์ยอดขาย (Forecasting) ---
      let projectedSales = null;
      if (timeFrame !== 'all' && totalSales > 0) {
        if (timeFrame === 'daily') {
          const hoursPassed = now.getHours() + (now.getMinutes() / 60) || 1;
          projectedSales = (totalSales / hoursPassed) * 24;
        } else if (timeFrame === 'monthly') {
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const daysPassed = now.getDate();
          projectedSales = (totalSales / daysPassed) * daysInMonth;
        } else if (timeFrame === 'yearly') {
          const monthsPassed = now.getMonth() + 1;
          projectedSales = (totalSales / monthsPassed) * 12;
        }
      }
      setProjection(projectedSales);

      // --- 🔥 เมนูยอดฮิต (Popular Menus) ---
      const menuMap: Record<string, PopularMenu> = {};
      orderItems.forEach(item => {
        if (!item.menu_item_id) return;
        if (!menuMap[item.menu_item_id]) {
          menuMap[item.menu_item_id] = {
            id: item.menu_item_id,
            name: item.menu_items?.name || "ไม่ระบุชื่อเมนู",
            image_url: item.menu_items?.image_url || "",
            total_quantity: 0,
            total_revenue: 0
          };
        }
        menuMap[item.menu_item_id].total_quantity += item.quantity;
        menuMap[item.menu_item_id].total_revenue += (item.quantity * item.price_at_time);
      });

      const sortedMenus = Object.values(menuMap)
        .sort((a, b) => b.total_quantity - a.total_quantity) // เรียงตามจำนวนที่ขายได้
        .slice(0, 5); // เอา Top 5
      
      setPopularMenus(sortedMenus);
      setRecentOrders(orders || []);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500); 
    }
  };

  const handleSort = (key: keyof Order) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedOrders = useMemo(() => {
    let sortable = [...recentOrders];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let aVal: any = a[sortConfig.key];
        let bVal: any = b[sortConfig.key];
        
        if (sortConfig.key === 'closed_at') {
          aVal = new Date(a.closed_at).getTime();
          bVal = new Date(b.closed_at).getTime();
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [recentOrders, sortConfig]);

  if (loading && recentOrders.length === 0) return (
    <div className="flex justify-center items-center h-48">
      <div className="w-8 h-8 border-4 border-[#ff5722]/20 border-t-[#ff5722] rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300 w-full pb-10">
      
      {/* 🟢 Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">ภาพรวมยอดขาย</h1>
          <p className="text-slate-500 font-medium">ข้อมูลสรุป ยอดขาย คาดการณ์ และเมนูยอดฮิต</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filters */}
          <div className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm flex font-medium text-sm">
            {[ 
              { key: 'daily', label: 'รายวัน' }, 
              { key: 'monthly', label: 'รายเดือน' }, 
              { key: 'yearly', label: 'รายปี' }, 
              { key: 'all', label: 'ทั้งหมด' } 
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTimeFrame(t.key as TimeFrame)}
                className={`px-4 py-2 rounded-lg transition-all ${timeFrame === t.key ? 'bg-[#ff5722] text-white font-bold shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button 
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all font-bold flex items-center gap-2 active:scale-95 disabled:opacity-70 h-[42px]"
          >
            <RefreshCcw size={18} className={isRefreshing ? "animate-spin text-[#ff5722]" : "text-slate-400"} /> 
            {isRefreshing ? "กำลังอัปเดต..." : "อัปเดต"}
          </button>
        </div>
      </div>
      
      {/* 📊 การ์ดสรุปยอด & พยากรณ์ (Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        
        {/* การ์ดยอดขาย (กินพื้นที่ 2 คอลัมน์ตอนจอใหญ่) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#ff5722] to-[#ff8a50] p-6 text-white rounded-2xl shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="font-semibold text-white/90">
                ยอดขายรวม ({timeFrame === 'daily' ? 'วันนี้' : timeFrame === 'monthly' ? 'เดือนนี้' : timeFrame === 'yearly' ? 'ปีนี้' : 'ทั้งหมด'})
              </p>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Wallet size={20} className="text-white" />
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              <span className="text-2xl md:text-3xl opacity-80 mr-1">฿</span>
              {salesResult.totalSales.toLocaleString()}
            </h2>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-[0.15] group-hover:scale-110 transition-transform duration-500">
            <Wallet size={120} />
          </div>
          
          {/* ส่วนคาดการณ์ยอดขาย แสดงแค่ถ้าเป็นช่วงเวลา ไม่ใช่ ทั้งหมด */}
          {projection !== null && (
            <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/90">
                <LineChart size={18} />
                <span className="font-medium text-sm">คาดการณ์ยอดสิ้นสุด{timeFrame === 'daily' ? 'วัน' : timeFrame === 'monthly' ? 'เดือน' : 'ปี'}นี้</span>
              </div>
              <span className="font-bold">~ ฿{Math.round(projection).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* กล่องกำไรเบื้องต้น */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="font-bold text-slate-500">กำไรเบื้องต้น</p>
              <div className="w-10 h-10 rounded-full bg-[#10b981]/10 flex items-center justify-center">
                <TrendingUp size={20} className="text-[#10b981]" />
              </div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              <span className="text-xl text-slate-400 mr-1">฿</span>
              {salesResult.totalProfit.toLocaleString()}
            </h2>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <TrendingUp size={90} />
          </div>
        </div>

        {/* กล่องจำนวนบิล */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="font-bold text-slate-500">บิลชำระแล้ว</p>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Receipt size={20} className="text-blue-500" />
              </div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-2">
              {salesResult.totalBills} <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">บิล</span>
            </h2>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <Receipt size={90} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* 🔥 เมนูยอดฮิต (กิน 1 คอลัมน์) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-6">
            <Flame className="text-[#ef4444] animate-pulse" size={24} />
            เมนูยอดฮิต Top 5
          </h3>
          
          <div className="space-y-4">
            {popularMenus.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <AlertCircle size={36} className="mx-auto mb-3 opacity-50" />
                <p>ยังไม่มีข้อมูลการขายในหมวดเวลานี้</p>
              </div>
            ) : (
              popularMenus.map((menu, idx) => (
                <div key={menu.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{menu.name}</p>
                    <p className="text-sm text-slate-500 font-medium">{menu.total_quantity} เสิร์ฟ</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-[#ff5722]">฿{menu.total_revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 📋 ตารางประวัติบิล (กิน 2 คอลัมน์) */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
             <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="text-[#ff5722]" size={24} />
              รายการออเดอร์
              <span className="text-sm font-semibold text-slate-400 ml-2 hidden sm:inline-block">({recentOrders.length} รายการ)</span>
            </h3>
          </div>
          
          <div className="overflow-x-auto no-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("order_number")}>
                    <div className="flex items-center gap-1">เลขที่บิล <ArrowUpDown size={14}/></div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("table_number")}>
                    <div className="flex items-center gap-1">โต๊ะ <ArrowUpDown size={14}/></div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("closed_at")}>
                    <div className="flex items-center gap-1">วัน/เวลา <ArrowUpDown size={14}/></div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("payment_method")}>
                    <div className="flex items-center justify-center gap-1">ช่องทาง <ArrowUpDown size={14}/></div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right cursor-pointer hover:bg-slate-100 transition-colors w-32" onClick={() => handleSort("total_amount")}>
                    <div className="flex items-center justify-end gap-1">ยอดรวม <ArrowUpDown size={14}/></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                      <AlertCircle size={48} className="mx-auto text-slate-200 mb-4" strokeWidth={1.5} />
                      <p className="text-lg font-semibold text-slate-500">ไม่พบข้อมูลในกรอบเวลานี้</p>
                    </td>
                  </tr>
                ) : (
                  sortedOrders.slice(0, 50).map((order) => ( // โชว์แค่ 50 รายการแรกกันเครื่องหน่วงถ้าเลือก All
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-[#ff5722] opacity-70 group-hover:opacity-100 transition-opacity" />
                          <span className="font-bold text-[#ff5722]">{order.order_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <LayoutGrid size={16} className="text-slate-400" />
                          <span className="font-semibold text-slate-700 px-2.5 py-1 bg-slate-100 rounded-lg">{order.table_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm font-medium whitespace-nowrap">
                         {format(new Date(order.closed_at), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {order.payment_method === 'CASH' ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981]/10 text-[#10b981] rounded-lg text-xs font-bold ring-1 ring-[#10b981]/20">
                            <HandCoins size={14} strokeWidth={2.5} />
                            <span>เงินสด</span>
                          </div>
                        ) : order.payment_method === 'TRANSFER' ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3b82f6]/10 text-[#3b82f6] rounded-lg text-xs font-bold ring-1 ring-[#3b82f6]/20">
                            <Smartphone size={14} strokeWidth={2.5} />
                            <span>โอนเงิน</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-base whitespace-nowrap">
                        ฿{order.total_amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {sortedOrders.length > 50 && (
             <div className="p-3 bg-slate-50 text-center border-t border-slate-100 text-sm text-slate-500 font-medium flex justify-center items-center gap-2 cursor-pointer hover:text-[#ff5722] transition-colors"
                  onClick={() => window.location.href = '/sales-report'}>
                ดูรายการทั้งหมดในหน้ารายงาน <ChevronRight size={16}/>
             </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
