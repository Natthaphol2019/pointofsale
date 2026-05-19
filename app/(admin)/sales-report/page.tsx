"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Calendar, Eraser, Receipt, Smartphone, Banknote, FileText, LayoutGrid, AlertCircle, TrendingUp, HandCoins, ArrowUpDown, FileSpreadsheet, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

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

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order | 'date_only', direction: 'asc' | 'desc' } | null>({ key: "closed_at", direction: "desc" });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, table_number, total_amount, payment_method, closed_at")
      .eq("status", "PAID")
      .order("closed_at", { ascending: false });

    if (data) setAllOrders(data);
    if (error) console.error("Error fetching orders:", error);
    setLoading(false);
  };

  // 🔍 การเรียงข้อมูลและการกรอง
  const filteredAndSortedOrders = useMemo(() => {
    let result = allOrders.filter((order) => {
      // 1. ค้นหา
      const matchSearch = 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.table_number.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. วันที่
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

    // 3. เรียงข้อมูล (Sort)
    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Order];
        let bValue: any = b[sortConfig.key as keyof Order];

        // กรณี Sort ตามวันที่เท่านั้น (เพื่อจัดตารางแสดงยอดเป็นวันเดือนปี)
        if (sortConfig.key === 'date_only') {
           aValue = new Date(a.closed_at).setHours(0,0,0,0);
           bValue = new Date(b.closed_at).setHours(0,0,0,0);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [allOrders, searchTerm, startDate, endDate, sortConfig]);

  // 🧮 คำนวณสรุปยอดจากรายการที่ค้นหาเจอ
  const summary = useMemo(() => {
    let totalSales = 0;
    let cashSales = 0;
    let transferSales = 0;

    filteredAndSortedOrders.forEach(order => {
      totalSales += order.total_amount;
      if (order.payment_method === 'CASH') cashSales += order.total_amount;
      if (order.payment_method === 'TRANSFER') transferSales += order.total_amount;
    });

    return { totalSales, cashSales, transferSales, billCount: filteredAndSortedOrders.length };
  }, [filteredAndSortedOrders]);


  const handleSort = (key: keyof Order | 'date_only') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };


  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd/MM/yyyy HH:mm");
  };

  const handleClearFilter = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setSortConfig({ key: "closed_at", direction: "desc" });
  };
  
  // 📥 Export Excel
  const exportToExcel = () => {
    if (filteredAndSortedOrders.length === 0) return alert("ไม่มีข้อมูลสำหรับส่งออก");

    const exportData = filteredAndSortedOrders.map(order => ({
      "วันเดือนปี": format(new Date(order.closed_at), "dd/MM/yyyy"),
      "เวลา": format(new Date(order.closed_at), "HH:mm"),
      "เลขที่บิล": order.order_number,
      "โต๊ะ/ออเดอร์": order.table_number,
      "ช่องทางชำระ": order.payment_method === 'CASH' ? 'เงินสด' : 'โอนเงิน',
      "ยอดรวม (บาท)": order.total_amount
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales_Report");
    
    // จัดรูปแบบชื่อไฟล์ให้ดีๆ
    const dateRangeStr = (startDate && endDate) ? `_${startDate}_ถึง_${endDate}` : "_ทั้งหมด";
    const fileName = `รายงานยอดขาย_MooPikPOS${dateRangeStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  // 🖨️ Export PDF (Print Mode)
  const exportToPDF = () => {
    window.print();
  };

  if (loading) return (
    <div className="flex justify-center items-center h-48">
      <div className="w-8 h-8 border-4 border-[#ff5722]/20 border-t-[#ff5722] rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300 w-full pb-10 print:m-0 print:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">รายงานยอดขาย</h1>
          <p className="text-slate-500 font-medium">ดูประวัติบิลทั้งหมด ค้นหา สรุปยอดตามช่วงเวลา และออกรายงาน</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={exportToPDF}
            className="flex-1 md:flex-none flex justify-center items-center gap-2 border border-slate-200 bg-white text-slate-700 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <Printer size={18} /> พิมพ์ / PDF
          </button>
          <button 
            onClick={exportToExcel}
            className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-[#10b981] text-white font-bold px-4 py-2.5 rounded-xl hover:bg-[#059669] transition-all shadow-sm active:scale-95"
          >
            <FileSpreadsheet size={18} /> Export Excel
          </button>
        </div>
      </div>

      {/* Print Header (Visible only when printing) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-center mb-2">รายงานยอดขาย MooPik POS</h1>
        <p className="text-center text-sm mb-4">
          ช่วงเวลา: {startDate ? format(new Date(startDate), "dd/MM/yyyy") : "เริ่มต้น"} ถึง {endDate ? format(new Date(endDate), "dd/MM/yyyy") : "ปัจจุบัน"}
        </p>
      </div>

      {/* 📊 สรุปยอดจากผลการค้นหา */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 print:grid-cols-4 print:gap-2">
        <div className="bg-gradient-to-br from-[#ff5722] to-[#ff8a50] p-5 rounded-2xl print:rounded-lg print:border print:border-slate-300 shadow-lg relative overflow-hidden text-white print:text-black print:bg-none print:shadow-none">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 print:hidden">
            <TrendingUp size={100} />
          </div>
          <p className="text-sm font-semibold opacity-90 mb-1 print:opacity-100 print:text-slate-600">ยอดขายรวม</p>
          <h3 className="text-3xl font-extrabold tracking-tight print:text-2xl">฿{summary.totalSales.toLocaleString()}</h3>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl print:rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] print:shadow-none relative overflow-hidden">
          <div className="flex justify-between items-start mb-1">
            <p className="text-sm font-bold text-slate-500">รับเงินสด</p>
            <Banknote size={20} className="text-[#10b981] print:hidden" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 print:text-xl">฿{summary.cashSales.toLocaleString()}</h3>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl print:rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] print:shadow-none relative overflow-hidden">
          <div className="flex justify-between items-start mb-1">
            <p className="text-sm font-bold text-slate-500">รับโอนเงิน</p>
            <Smartphone size={20} className="text-[#3b82f6] print:hidden" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 print:text-xl">฿{summary.transferSales.toLocaleString()}</h3>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl print:rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] print:shadow-none relative overflow-hidden">
          <div className="flex justify-between items-start mb-1">
            <p className="text-sm font-bold text-slate-500">จำนวนบิลทั้งหมด</p>
            <Receipt size={20} className="text-slate-400 print:hidden" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 print:text-xl">{summary.billCount} <span className="text-base font-semibold text-slate-400 uppercase tracking-wide">บิล</span></h3>
        </div>
      </div>

      {/* 🔍 แถบค้นหาและตัวกรอง */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 flex flex-col md:flex-row gap-4 items-end print:hidden">
        <div className="w-full md:flex-1 relative">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">ค้นหาเลขบิล / โต๊ะ</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="เช่น INV-123 หรือ โต๊ะ 3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10 outline-none rounded-xl py-3 pl-10 pr-4 text-slate-700 font-medium transition-all"
            />
          </div>
        </div>

        <div className="w-full md:w-48">
          <label className="block text-sm font-bold text-slate-700 mb-1.5 hidden md:block">ตั้งแต่วันที่</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar size={18} />
            </div>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10 outline-none rounded-xl py-3 pl-10 pr-3 text-slate-700 font-medium transition-all appearance-none"
            />
          </div>
        </div>
        
        <div className="w-full md:w-48">
          <label className="block text-sm font-bold text-slate-700 mb-1.5 hidden md:block">ถึงวันที่</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar size={18} />
            </div>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10 outline-none rounded-xl py-3 pl-10 pr-3 text-slate-700 font-medium transition-all appearance-none"
            />
          </div>
        </div>

        <button 
          onClick={handleClearFilter}
          className="w-full md:w-auto px-6 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 hover:text-slate-800 transition-colors font-bold h-[48px] flex justify-center items-center gap-2 active:scale-95"
        >
          <Eraser size={18} /> ล้างค่า
        </button>
      </div>

      {/* 📋 ตารางประวัติบิลทั้งหมด */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden print:shadow-none print:border-none">
        <div className="overflow-x-auto no-scrollbar max-h-[600px] overflow-y-auto print:max-h-max print:overflow-visible">
          <table className="w-full text-left border-collapse relative">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10 print:bg-transparent">
              <tr>
                <th 
                  className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("closed_at")}
                >
                  <div className="flex items-center gap-1">วัน/เดือน/ปี - เวลาปิดบิล <ArrowUpDown size={14}/></div>
                </th>
                <th 
                  className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("order_number")}
                >
                  <div className="flex items-center gap-1">เลขที่บิล <ArrowUpDown size={14}/></div>
                </th>
                <th 
                  className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("table_number")}
                >
                  <div className="flex items-center gap-1">โต๊ะ/ออเดอร์ <ArrowUpDown size={14}/></div>
                </th>
                <th 
                  className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("payment_method")}
                >
                  <div className="flex items-center justify-center gap-1">ช่องทางชำระ <ArrowUpDown size={14}/></div>
                </th>
                <th 
                  className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap text-right rounded-tr-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("total_amount")}
                >
                   <div className="flex items-center justify-end gap-1">ยอดรวม <ArrowUpDown size={14}/></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <AlertCircle size={48} className="mx-auto text-slate-200 mb-4" strokeWidth={1.5} />
                    <p className="text-lg font-semibold text-slate-500">ไม่พบข้อมูลบิลที่ค้นหา</p>
                    <p className="text-sm">ลองเปลี่ยนเงื่อนไขหรือช่วงเวลาในการค้นหาอีกครั้ง</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group print:text-sm">
                    <td className="px-6 py-4 text-slate-500 text-sm font-medium whitespace-nowrap flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400 print:hidden" />
                      {formatDateTime(order.closed_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[#ff5722] print:hidden" />
                        <span className="font-bold text-[#ff5722] print:text-black">{order.order_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <LayoutGrid size={16} className="text-slate-400 print:hidden" />
                        <span className="font-semibold text-slate-700 px-2.5 py-1 bg-slate-100 rounded-lg print:bg-transparent print:px-0 print:py-0">{order.table_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {order.payment_method === 'CASH' ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981]/10 text-[#10b981] rounded-lg text-xs font-bold ring-1 ring-[#10b981]/20 print:bg-transparent print:ring-0 print:text-black print:px-0">
                          <HandCoins size={14} strokeWidth={2.5} className="print:hidden"/>
                          <span>เงินสด</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3b82f6]/10 text-[#3b82f6] rounded-lg text-xs font-bold ring-1 ring-[#3b82f6]/20 print:bg-transparent print:ring-0 print:text-black print:px-0">
                          <Smartphone size={14} strokeWidth={2.5} className="print:hidden"/>
                          <span>โอนเงิน</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-lg whitespace-nowrap print:text-sm">
                      ฿{order.total_amount.toLocaleString()}
                    </td>
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
