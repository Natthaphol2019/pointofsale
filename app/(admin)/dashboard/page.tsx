"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Order {
  id: string;
  order_number: string;
  table_number: string;
  total_amount: number;
  payment_method: string;
  closed_at: string;
}

export default function DashboardPage() {
  const [salesResult, setSalesResult] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalBills: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. ดึงบิลทั้งหมดที่สถานะเป็น 'PAID' (จ่ายแล้ว)
      const { data: orders, error: orderError } = await supabase
        .from("orders")
        .select("id, order_number, table_number, total_amount, payment_method, closed_at")
        .eq("status", "PAID")
        .order("closed_at", { ascending: false }); // เรียงจากบิลล่าสุดขึ้นก่อน

      if (orderError) throw orderError;

      // 2. ดึงรายการอาหารทั้งหมดที่อยู่ในบิลเหล่านั้น เพื่อเอามาคำนวณ "ต้นทุน (Cost)"
      const { data: orderItems, error: itemError } = await supabase
        .from("order_items")
        .select("order_id, quantity, cost_at_time, price_at_time");

      if (itemError) throw itemError;

      if (orders && orderItems) {
        // --- 📊 คำนวณตัวเลขสำหรับ Dashboard ---
        const totalSales = orders.reduce((sum, order) => sum + order.total_amount, 0);
        
        // คำนวณต้นทุนรวมจาก order_items เฉพาะบิลที่ PAID
        const paidOrderIds = new Set(orders.map(o => o.id));
        const totalCost = orderItems.reduce((sum, item) => {
          if (paidOrderIds.has(item.order_id)) {
            return sum + (item.cost_at_time * item.quantity);
          }
          return sum;
        }, 0);

        const totalProfit = totalSales - totalCost;

        setSalesResult({
          totalSales,
          totalProfit,
          totalBills: orders.length,
        });

        // ดึง 10 บิลล่าสุดมาโชว์ในตาราง
        setRecentOrders(orders.slice(0, 10));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันแปลงวันที่ให้อ่านง่าย
  const formatTime = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return <div className="p-8 text-pos-text-muted">กำลังคำนวณยอดขาย...</div>;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-pos-brand mb-1">ภาพรวมยอดขาย</h1>
          <p className="text-pos-text-muted">ข้อมูลสรุปยอดขายและกำไรของร้านทั้งหมด</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="bg-pos-card border border-pos-border px-4 py-2 rounded-xl hover:border-pos-brand transition-all text-sm flex items-center gap-2"
        >
          🔄 รีเฟรชข้อมูล
        </button>
      </div>
      
      {/* 📊 การ์ดสรุปยอด (3 กล่อง) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-pos-card p-6 rounded-2xl border border-pos-border shadow-lg relative overflow-hidden group hover:border-pos-brand transition-all">
          <div className="relative z-10">
            <p className="text-pos-text-muted mb-2 font-medium">ยอดขายรวม</p>
            <h2 className="text-4xl font-bold text-white">฿{salesResult.totalSales.toLocaleString()}</h2>
          </div>
          <div className="absolute -right-6 -bottom-6 text-8xl opacity-5 group-hover:scale-110 transition-transform">💰</div>
        </div>

        <div className="bg-pos-card p-6 rounded-2xl border border-pos-border shadow-lg relative overflow-hidden group hover:border-pos-success transition-all">
          <div className="relative z-10">
            <p className="text-pos-text-muted mb-2 font-medium">กำไรเบื้องต้น</p>
            <h2 className="text-4xl font-bold text-pos-success">฿{salesResult.totalProfit.toLocaleString()}</h2>
          </div>
          <div className="absolute -right-6 -bottom-6 text-8xl opacity-5 group-hover:scale-110 transition-transform">📈</div>
        </div>

        <div className="bg-pos-card p-6 rounded-2xl border border-pos-border shadow-lg relative overflow-hidden group hover:border-pos-brand transition-all">
          <div className="relative z-10">
            <p className="text-pos-text-muted mb-2 font-medium">จำนวนบิล (ที่ชำระแล้ว)</p>
            <h2 className="text-4xl font-bold text-white">{salesResult.totalBills} <span className="text-lg text-pos-text-muted font-normal">บิล</span></h2>
          </div>
          <div className="absolute -right-6 -bottom-6 text-8xl opacity-5 group-hover:scale-110 transition-transform">🧾</div>
        </div>
      </div>

      {/* 📋 ตารางประวัติบิลล่าสุด */}
      <div className="bg-pos-card rounded-2xl border border-pos-border shadow-lg overflow-hidden">
        <div className="p-6 border-b border-pos-border bg-pos-card/50">
          <h3 className="text-xl font-bold">รายการชำระเงินล่าสุด (10 บิลล่าสุด)</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-pos-bg text-pos-text-muted text-sm border-b border-pos-border">
              <tr>
                <th className="p-4 font-medium">เลขที่บิล</th>
                <th className="p-4 font-medium">โต๊ะ</th>
                <th className="p-4 font-medium">เวลาเช็คบิล</th>
                <th className="p-4 font-medium">ช่องทาง</th>
                <th className="p-4 font-medium text-right">ยอดรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-pos-text-muted">ยังไม่มีรายการขาย</td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-pos-bg/50 transition-colors">
                    <td className="p-4 font-medium text-pos-brand">{order.order_number}</td>
                    <td className="p-4">{order.table_number}</td>
                    <td className="p-4">{formatTime(order.closed_at)}</td>
                    <td className="p-4">
                      {order.payment_method === 'CASH' ? (
                        <span className="px-3 py-1 bg-pos-brand/10 text-pos-brand rounded-full text-sm font-semibold border border-pos-brand/20">💵 เงินสด</span>
                      ) : order.payment_method === 'TRANSFER' ? (
                        <span className="px-3 py-1 bg-pos-success/10 text-pos-success rounded-full text-sm font-semibold border border-pos-success/20">📱 โอนเงิน</span>
                      ) : (
                        <span className="text-pos-text-muted">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold text-lg">฿{order.total_amount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}