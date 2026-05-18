"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface Order {
  id: string;
  order_number: string;
  table_number: string;
  total_amount: number;
  payment_method: string;
  closed_at: string;
}

export default function SalesReportPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Filter ค้นหา
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, table_number, total_amount, payment_method, closed_at")
      .eq("status", "PAID")
      .order("closed_at", { ascending: false }); // ใหม่สุดขึ้นก่อน

    if (data) setAllOrders(data);
    if (error) console.error("Error fetching orders:", error);
    setLoading(false);
  };

  // 🔍 ลอจิกการกรองข้อมูล (Filter)
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      // 1. ค้นหาจากเลขบิล หรือ ชื่อโต๊ะ
      const matchSearch = 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.table_number.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. กรองจากช่วงวันที่
      let matchDate = true;
      const orderDate = new Date(order.closed_at).getTime();

      if (startDate) {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        if (orderDate < start) matchDate = false;
      }
      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        if (orderDate > end) matchDate = false;
      }

      return matchSearch && matchDate;
    });
  }, [allOrders, searchTerm, startDate, endDate]);

  // 🧮 คำนวณสรุปยอดจากรายการที่ค้นหาเจอ
  const summary = useMemo(() => {
    let totalSales = 0;
    let cashSales = 0;
    let transferSales = 0;

    filteredOrders.forEach(order => {
      totalSales += order.total_amount;
      if (order.payment_method === 'CASH') cashSales += order.total_amount;
      if (order.payment_method === 'TRANSFER') transferSales += order.total_amount;
    });

    return { totalSales, cashSales, transferSales, billCount: filteredOrders.length };
  }, [filteredOrders]);

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("th-TH", { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const handleClearFilter = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  };

  if (loading) return <div className="p-8 text-pos-text-muted">กำลังโหลดข้อมูลประวัติการขาย...</div>;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold text-pos-brand mb-1">รายงานยอดขาย</h1>
          <p className="text-pos-text-muted">ดูประวัติบิลทั้งหมด ค้นหา และสรุปยอดตามช่วงเวลา</p>
        </div>
      </div>

      {/* 🔍 แถบค้นหาและตัวกรอง */}
      <div className="bg-pos-card p-4 rounded-2xl border border-pos-border shadow-md mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm text-pos-text-muted mb-1">ค้นหาเลขบิล / โต๊ะ</label>
          <input 
            type="text" 
            placeholder="เช่น INV-123 หรือ โต๊ะ 3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-pos-bg border border-pos-border rounded-xl p-3 focus:outline-none focus:border-pos-brand text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-pos-text-muted mb-1">ตั้งแต่วันที่</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-pos-bg border border-pos-border rounded-xl p-3 focus:outline-none focus:border-pos-brand text-white color-scheme-dark"
          />
        </div>
        <div>
          <label className="block text-sm text-pos-text-muted mb-1">ถึงวันที่</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-pos-bg border border-pos-border rounded-xl p-3 focus:outline-none focus:border-pos-brand text-white color-scheme-dark"
          />
        </div>
        <button 
          onClick={handleClearFilter}
          className="px-6 py-3 bg-pos-border text-white rounded-xl hover:bg-gray-600 transition-all font-medium h-[50px]"
        >
          ล้างค่า
        </button>
      </div>

      {/* 📊 สรุปยอดจากผลการค้นหา */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-pos-brand/10 border border-pos-brand/30 p-4 rounded-2xl">
          <p className="text-sm text-pos-text-muted mb-1">ยอดขายรวม (ตามที่ค้นหา)</p>
          <h3 className="text-2xl font-bold text-pos-brand">฿{summary.totalSales.toLocaleString()}</h3>
        </div>
        <div className="bg-pos-card border border-pos-border p-4 rounded-2xl">
          <p className="text-sm text-pos-text-muted mb-1">รับเงินสด</p>
          <h3 className="text-2xl font-bold text-white">฿{summary.cashSales.toLocaleString()}</h3>
        </div>
        <div className="bg-pos-card border border-pos-border p-4 rounded-2xl">
          <p className="text-sm text-pos-text-muted mb-1">รับโอนเงิน</p>
          <h3 className="text-2xl font-bold text-white">฿{summary.transferSales.toLocaleString()}</h3>
        </div>
        <div className="bg-pos-card border border-pos-border p-4 rounded-2xl">
          <p className="text-sm text-pos-text-muted mb-1">จำนวนบิล</p>
          <h3 className="text-2xl font-bold text-white">{summary.billCount} <span className="text-sm font-normal text-pos-text-muted">บิล</span></h3>
        </div>
      </div>

      {/* 📋 ตารางประวัติบิลทั้งหมด */}
      <div className="bg-pos-card rounded-2xl border border-pos-border shadow-lg overflow-hidden">
        <div className="overflow-x-auto h-[500px] overflow-y-auto">
          <table className="w-full text-left relative">
            <thead className="bg-pos-bg text-pos-text-muted text-sm border-b border-pos-border sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-medium">วัน-เวลา</th>
                <th className="p-4 font-medium">เลขที่บิล</th>
                <th className="p-4 font-medium">โต๊ะ/ออเดอร์</th>
                <th className="p-4 font-medium">ช่องทางชำระ</th>
                <th className="p-4 font-medium text-right">ยอดรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-pos-text-muted">ไม่พบข้อมูลบิลที่ค้นหา</td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-pos-bg/50 transition-colors">
                    <td className="p-4 text-pos-text-muted text-sm">{formatDateTime(order.closed_at)}</td>
                    <td className="p-4 font-medium text-pos-brand">{order.order_number}</td>
                    <td className="p-4">{order.table_number}</td>
                    <td className="p-4">
                      {order.payment_method === 'CASH' ? (
                        <span className="px-2 py-1 bg-pos-brand/10 text-pos-brand rounded-md text-xs font-semibold border border-pos-brand/20">💵 เงินสด</span>
                      ) : (
                        <span className="px-2 py-1 bg-pos-success/10 text-pos-success rounded-md text-xs font-semibold border border-pos-success/20">📱 โอนเงิน</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold text-lg text-white">฿{order.total_amount}</td>
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