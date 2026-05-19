"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// สมมติว่าร้านมีโต๊ะประจำ 10 โต๊ะ
const FIXED_TABLES = Array.from({ length: 10 }, (_, i) => `โต๊ะ ${i + 1}`);

interface Order {
  id: string;
  order_number: string;
  table_number: string;
  status: string;
  total_amount: number;
}

export default function TablesPage() {
  const router = useRouter();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // สร้างตัวแปรเก็บชื่อพนักงานที่ล็อกอินอยู่
  const staffName = typeof window !== 'undefined' ? localStorage.getItem("currentStaffName") : "";
  const staffId = typeof window !== 'undefined' ? localStorage.getItem("currentStaffId") : "";

  useEffect(() => {
    fetchActiveOrders();
  }, []);

  const fetchActiveOrders = async () => {
    // ดึงเฉพาะบิลที่สถานะ 'OPEN' (ยังกินไม่เสร็จ)
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "OPEN");

    if (data) setActiveOrders(data);
    if (error) console.error("Error fetching orders:", error);
    setLoading(false);
  };

  // ฟังก์ชันหาว่าโต๊ะนี้มีบิลเปิดอยู่ไหม
  const getOrderForTable = (tableName: string) => {
    return activeOrders.find(order => order.table_number === tableName);
  };

  // ฟังก์ชันเปิดบิลใหม่
  const handleOpenTable = async (tableName: string) => {
    const existingOrder = getOrderForTable(tableName);
    
    // ถ้ามีบิลอยู่แล้ว ให้พุ่งไปหน้าสั่งอาหารของบิลนั้นเลย
    if (existingOrder) {
      router.push(`/order/${existingOrder.id}`);
      return;
    }

    // ถ้าเป็นโต๊ะว่าง ให้ส่งไปหน้าสั่งอาหารแบบ draft (new)
    router.push(`/order/new?table=${encodeURIComponent(tableName)}`);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-pos-text-muted text-lg">กำลังโหลดข้อมูลโต๊ะ...</div>;

  return (
    <div className="p-4 md:p-8 pb-32 min-h-screen overflow-y-auto safe-area-bottom">
      {/* Header (Sticky-like feel at top) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4 pt-safe">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-pos-brand drop-shadow-sm">แผนผังโต๊ะ</h1>
          <p className="text-pos-text-muted text-lg">เลือกโต๊ะเพื่อเปิดบิล หรือสั่งอาหารเพิ่ม</p>
        </div>
        <div className="flex w-full md:w-auto gap-4 items-center">
          <div className="flex-1 md:flex-none flex items-center bg-pos-card px-5 py-3 rounded-2xl border border-pos-border shadow-sm min-h-[44px]">
            <span className="text-pos-text-muted mr-2">พนักงาน:</span>
            <span className="font-semibold text-pos-success truncate">{staffName}</span>
          </div>
        </div>
      </div>

      {/* Grid โต๊ะ (Fluid Layout: 2 -> 3 -> 4 -> 5 cols) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {FIXED_TABLES.map((tableName) => {
          const activeOrder = getOrderForTable(tableName);
          const isOccupied = !!activeOrder;

          return (
            <button
              key={tableName}
              onClick={() => handleOpenTable(tableName)}
              className={`relative h-32 md:h-40 rounded-3xl flex flex-col items-center justify-center transition-all shadow-sm active:scale-95 border-2 min-h-[44px] touch-manipulation ${
                isOccupied 
                  ? "bg-pos-brand/10 border-pos-brand text-pos-brand shadow-pos-brand/10" // โต๊ะไม่ว่าง (สีแบรนด์)
                  : "bg-pos-card border-pos-border hover:border-pos-brand/30 hover:shadow-md text-pos-text" // โต๊ะว่าง
              }`}
            >
              <h2 className="text-2xl md:text-3xl font-bold">{tableName}</h2>
              {isOccupied ? (
                <div className="mt-2 text-md md:text-lg font-medium bg-pos-brand text-white px-4 py-1.5 rounded-full shadow-sm">
                  ฿{activeOrder.total_amount?.toLocaleString() || 0}
                </div>
              ) : (
                <div className="mt-2 text-md md:text-lg text-pos-text-muted">โต๊ะว่าง</div>
              )}
            </button>
          );
        })}

        {/* ปุ่มสร้างโต๊ะพิเศษ (สั่งกลับบ้าน / โต๊ะเสริม) */}
        {/* <button
          className="h-32 md:h-40 rounded-3xl flex flex-col items-center justify-center bg-transparent border-2 border-dashed border-pos-text-muted/50 hover:border-pos-brand hover:bg-pos-brand/5 text-pos-text-muted hover:text-pos-brand transition-all active:scale-95 min-h-[44px]"
          onClick={() => {
            const customName = prompt("ใส่ชื่อโต๊ะเสริม หรือ สั่งกลับบ้าน:");
            if (customName) handleOpenTable(customName);
          }}
        >
          <div className="text-4xl mb-1">+</div>
          <h2 className="text-lg md:text-xl font-medium">โต๊ะเสริม/กลับบ้าน</h2>
        </button> */}
      </div>
    </div>
  );
}