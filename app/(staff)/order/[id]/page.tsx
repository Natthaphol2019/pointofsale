"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Category { id: string; name: string; }
interface MenuItem { id: string; name: string; price: number; category_id: string; image_url?: string; cost?: number; }
interface AddOn { id: string; name: string; price: number; }

// 👇 เพิ่ม addons (JSONB) เข้ามาใน Interface
interface OrderItem { 
  id: string; 
  menu_item_id: string; 
  custom_item_name: string; 
  quantity: number; 
  price_at_time: number; 
  note?: string; 
  addons?: any[]; 
}

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeOrderId, setActiveOrderId] = useState<string>(params.id as string);

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderInfo, setOrderInfo] = useState<any>(null);

  // 🌟 State สำหรับระบบ Add-on (ท็อปปิ้ง)
  const [availableAddons, setAvailableAddons] = useState<AddOn[]>([]);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [menuForAddon, setMenuForAddon] = useState<MenuItem | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<AddOn[]>([]);

  // State สำหรับหน้าต่างเช็คบิล
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [receivedAmount, setReceivedAmount] = useState<number | "">("");
  const [changeAmount, setChangeAmount] = useState<number>(0);

  // Mobile Bottom Sheet state
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    fetchMenuData();
    if (activeOrderId && activeOrderId !== "new") {
      fetchOrderDetails(activeOrderId);
    } else if (activeOrderId === "new") {
      const tableName = searchParams.get("table");
      setOrderInfo({ table_number: tableName || "ไม่ระบุ", order_number: "ยังไม่สร้างบิล" });
    }
  }, [activeOrderId]);

  useEffect(() => {
    const total = orderItems.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);
    if (paymentMethod === "CASH" && typeof receivedAmount === "number") {
      setChangeAmount(Math.max(0, receivedAmount - total));
    } else {
      setChangeAmount(0);
    }
  }, [receivedAmount, paymentMethod, orderItems]);

  const fetchMenuData = async () => {
    // โหลดหมวดหมู่
    const { data: catData } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
    if (catData && catData.length > 0) {
      setCategories(catData);
      setActiveCategory(catData[0].id);
    }
    // โหลดเมนูอาหาร
    const { data: menuData } = await supabase.from("menu_items").select("*").eq("is_active", true);
    if (menuData) setMenuItems(menuData);
    
    // โหลด Add-on ทั้งหมดจาก Master Table
    const { data: addonData } = await supabase.from("add_ons").select("*").eq("is_active", true).order("name");
    if (addonData) setAvailableAddons(addonData);
  };

  const fetchOrderDetails = async (idToFetch: string) => {
    const { data: orderData } = await supabase.from("orders").select("*").eq("id", idToFetch).single();
    if (orderData) setOrderInfo(orderData);
    const { data: itemsData } = await supabase.from("order_items").select("*").eq("order_id", idToFetch).order("id");
    if (itemsData) setOrderItems(itemsData);
  };

  const ensureOrderExists = async (): Promise<string | null> => {
    if (activeOrderId !== "new") return activeOrderId;
    const tableName = searchParams.get("table") || "ไม่ระบุ";
    const staffId = typeof window !== 'undefined' ? localStorage.getItem("currentStaffId") : "";
    const newOrderNumber = `INV-${Date.now()}`;

    const { data, error } = await supabase.from("orders").insert([{
      order_number: newOrderNumber, staff_id: staffId, table_number: tableName, status: "OPEN", total_amount: 0,
    }]).select().single();

    if (error) return null;
    if (data) {
      setActiveOrderId(data.id);
      setOrderInfo(data);
      window.history.replaceState(null, '', `/order/${data.id}`);
      return data.id;
    }
    return null;
  };

  const handleUpdateQuantity = async (itemId: string, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty <= 0) {
      await supabase.from("order_items").delete().eq("id", itemId);
      setOrderItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      const { data } = await supabase.from("order_items").update({ quantity: newQty }).eq("id", itemId).select().single();
      if (data) setOrderItems(prev => prev.map(item => item.id === itemId ? data : item));
    }
    updateTotalAmount();
  };

  const handleUpdateNote = async (itemId: string, note: string) => {
    const { data } = await supabase.from("order_items").update({ note }).eq("id", itemId).select().single();
    if (data) setOrderItems(prev => prev.map(item => item.id === itemId ? data : item));
  };

  // 🌟 เมื่อพนักงานกดที่ปุ่มเมนูอาหาร
  const handleClickMenu = (menu: MenuItem) => {
    // ถ้ามีท็อปปิ้งในระบบ ให้เปิด Modal ก่อน
    if (availableAddons.length > 0) {
      setMenuForAddon(menu);
      setSelectedAddons([]); // ล้างค่าท็อปปิ้งที่เคยเลือก
      setShowAddonModal(true);
    } else {
      // ถ้าไม่มีท็อปปิ้งเลย ให้เพิ่มลงตะกร้าทันที
      handleAddItemToCart(menu, []);
    }
  };

  // 🌟 ฟังก์ชันสลับการเลือกท็อปปิ้งใน Modal
  const toggleAddon = (addon: AddOn) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) return prev.filter(a => a.id !== addon.id); // เอาออก
      return [...prev, addon]; // เพิ่มเข้า
    });
  };

  // 🌟 ฟังก์ชันบันทึกลงตะกร้า (พร้อม Add-on)
  const handleAddItemToCart = async (menu: MenuItem, chosenAddons: AddOn[]) => {
    const targetOrderId = await ensureOrderExists();
    if (!targetOrderId) return;

    // คำนวณราคาสุทธิ (ราคาเมนู + ราคาของท็อปปิ้งทุกอันที่เลือก)
    const totalAddonPrice = chosenAddons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = menu.price + totalAddonPrice;

    // เช็คว่ามีเมนูที่ "เหมือนกันเป๊ะ" อยู่ในตะกร้าไหม (ชื่อเดียวกัน, ราคาเท่ากัน, ไม่มี Note, Add-on เหมือนกัน)
    const existingItem = orderItems.find(item => {
      if (item.menu_item_id !== menu.id) return false;
      if (item.note) return false; 
      if (item.price_at_time !== unitPrice) return false;
      
      const itemAddons = item.addons || [];
      if (itemAddons.length !== chosenAddons.length) return false;
      
      const hasAllAddons = chosenAddons.every(ca => itemAddons.some((ia: any) => ia.id === ca.id));
      return hasAllAddons;
    });

    if (existingItem) {
      // ถ้ามีอันที่เหมือนเป๊ะ ให้บวกจำนวน (Quantity) + 1
      handleUpdateQuantity(existingItem.id, existingItem.quantity, 1);
    } else {
      // ถ้าไม่มี ให้สร้าง Record ใหม่ และยัด addons เป็น JSONB เข้าไป
      const { data } = await supabase
        .from("order_items")
        .insert([{ 
          order_id: targetOrderId, 
          menu_item_id: menu.id, 
          quantity: 1, 
          price_at_time: unitPrice, 
          cost_at_time: menu.cost || 0,
          addons: chosenAddons // 👈 ใส่ JSONB ตรงนี้เลย
        }])
        .select().single();
      if (data) setOrderItems(prev => [...prev, data]);
      updateTotalAmount(targetOrderId);
    }
    
    // ปิด Modal
    setShowAddonModal(false);
    setMenuForAddon(null);
  };

  const handleSplitItem = async (item: OrderItem) => {
    if (item.quantity <= 1) return;
    
    // ลดจำนวนเดิมลง 1
    const { data: updatedItem } = await supabase.from("order_items").update({ quantity: item.quantity - 1 }).eq("id", item.id).select().single();
    if (updatedItem) setOrderItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
    
    // เพิ่ม item ใหม่แยก 1 จาน
    const { data: newItem } = await supabase
      .from("order_items")
      .insert([{ 
        order_id: activeOrderId, 
        menu_item_id: item.menu_item_id, 
        quantity: 1, 
        price_at_time: item.price_at_time,
        note: item.note || "",
        addons: item.addons || []
      }])
      .select().single();
      
    if (newItem) setOrderItems(prev => [...prev, newItem]);
    updateTotalAmount();
  };

  const handleCustomAddon = async (item: OrderItem) => {
    const note = prompt("ระบุรายละเอียดเพิ่มเติม (เช่น เปลี่ยนเส้น, ไม่เผ็ด):");
    if (!note) return;
    const priceStr = prompt("ยอดเงินที่ต้องบวกเพิ่ม (ใส่ 0 หากไม่เพิ่มราคา):", "0");
    const addPrice = parseInt(priceStr || "0", 10) || 0;
    
    // สร้าง Dummy addon obj สำหรับ custom
    const customAddon = { id: `custom-${Date.now()}`, name: note, price: addPrice };
    await applyPreset(item, customAddon as any);
  };

  const applyPreset = async (item: OrderItem, addon: AddOn) => {
    const currentAddons = item.addons || [];
    if (currentAddons.find(a => a.id === addon.id)) return; // ไม่ให้ใส่ซ้ำ

    const newAddons = [...currentAddons, addon];
    const newPrice = item.price_at_time + addon.price;

    const { data } = await supabase.from("order_items").update({ 
      addons: newAddons, 
      price_at_time: newPrice 
    }).eq("id", item.id).select().single();
    
    if (data) setOrderItems(prev => prev.map(i => i.id === item.id ? data : i));
    updateTotalAmount();
  };

  const removePreset = async (item: OrderItem, addonId: string) => {
    const currentAddons = item.addons || [];
    const addonToRemove = currentAddons.find(a => a.id === addonId);
    if (!addonToRemove) return;

    const newAddons = currentAddons.filter(a => a.id !== addonId);
    const newPrice = item.price_at_time - addonToRemove.price;

    const { data } = await supabase.from("order_items").update({ 
      addons: newAddons.length > 0 ? newAddons : null, 
      price_at_time: newPrice 
    }).eq("id", item.id).select().single();
    
    if (data) setOrderItems(prev => prev.map(i => i.id === item.id ? data : i));
    updateTotalAmount();
  };

  const updateTotalAmount = async (targetId: string = activeOrderId) => {
    if (targetId === "new") return;
    const { data: currentItems } = await supabase.from("order_items").select("price_at_time, quantity").eq("order_id", targetId);
    if (currentItems) {
      const newTotal = currentItems.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);
      await supabase.from("orders").update({ total_amount: newTotal }).eq("id", targetId);
      setOrderInfo((prev: any) => ({ ...prev, total_amount: newTotal }));
    }
  };

  const handleConfirmPayment = async () => {
    if (activeOrderId === "new") return;
    const total = orderItems.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);
    
    if (paymentMethod === "CASH" && (receivedAmount === "" || receivedAmount < total)) {
      alert("จำนวนเงินที่รับมาไม่ถูกต้อง หรือ น้อยกว่ายอดบิล!");
      return;
    }

    const { error } = await supabase.from("orders").update({
      status: "PAID", payment_method: paymentMethod, 
      received_amount: paymentMethod === "CASH" ? receivedAmount : total,
      change_amount: paymentMethod === "CASH" ? changeAmount : 0, closed_at: new Date().toISOString()
    }).eq("id", activeOrderId);

    if (!error) {
      alert("เช็คบิลสำเร็จ! กำลังกลับหน้าแผนผังโต๊ะ");
      router.push("/tables");
    }
  };

  const handleVoidOrder = async () => {
    const isConfirm = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกบิลนี้?\nข้อมูลรายการอาหารทั้งหมดในบิลนี้จะถูกลบทิ้ง!");
    if (!isConfirm) return;

    if (activeOrderId !== "new") {
      // ลบรายการ order_items ก่อน
      await supabase.from("order_items").delete().eq("order_id", activeOrderId);
      // ตามด้วย order หลัก
      await supabase.from("orders").delete().eq("id", activeOrderId);
    }
    
    alert("ยกเลิกบิลเรียบร้อยแล้ว");
    router.push("/tables");
  };

  const displayMenus = menuItems.filter(item => item.category_id === activeCategory);
  const cartTotal = orderItems.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-pos-bg overflow-hidden text-pos-text pb-safe pt-safe">
      
      {/* 🔴 ฝั่งซ้าย: เลือกเมนูอาหาร */}
      <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col h-full border-r border-pos-border relative pb-24 md:pb-0">
        {/* Header - Sticky */}
        <div className="p-4 border-b border-pos-border bg-pos-card flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/tables")} className="bg-pos-bg border border-pos-border rounded-2xl hover:bg-pos-brand/10 hover:border-pos-brand flex items-center justify-center w-12 h-12 min-w-[44px] min-h-[44px] active:scale-95 transition-all text-pos-text-muted">
              <span className="text-xl">⬅️</span>
            </button>
            <div>
              <h1 className="font-bold text-xl md:text-2xl text-pos-brand leading-tight">โต๊ะ {orderInfo?.table_number || "..."}</h1>
              <p className="text-sm text-pos-text-muted mt-0.5">บิล: {orderInfo?.order_number || "..."}</p>
            </div>
          </div>
          {/* ปุ่มยกเลิกบิล อยู่มุมขวาบน */}
          <button 
            onClick={handleVoidOrder}
            className="px-4 py-2 bg-pos-danger/10 text-pos-danger hover:bg-pos-danger hover:text-white rounded-2xl text-sm font-medium transition-all active:scale-95 flex items-center gap-2 min-h-[44px]"
          >
            <span className="text-lg">🗑️</span>
            <span className="hidden sm:inline">ยกเลิกบิล</span>
          </button>
        </div>

        {/* หมวดหมู่เมนู (Horizontal Scroll) */}
        <div className="p-3 border-b border-pos-border bg-pos-bg flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth shrink-0 touch-pan-x">
          {categories.map(cat => (
            <button
              key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-6 py-3 rounded-full font-medium transition-all text-sm md:text-base min-h-[44px] ${activeCategory === cat.id ? "bg-pos-brand text-white shadow-md" : "bg-pos-card border border-pos-border hover:border-pos-brand/50 text-pos-text-muted active:scale-95"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grid อาหาร */}
        <div className="flex-1 p-4 overflow-y-auto overscroll-none scroll-smooth">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
            {displayMenus.map(menu => {
              const qtyInCart = orderItems.filter(item => item.menu_item_id === menu.id).reduce((sum, item) => sum + item.quantity, 0);
              return (
                <button
                  key={menu.id}
                  onClick={() => handleClickMenu(menu)}
                  className="bg-pos-card border-2 border-pos-border rounded-3xl flex flex-col hover:border-pos-brand/50 hover:shadow-lg active:scale-95 active:border-pos-brand transition-all text-left relative overflow-hidden h-56 group touch-manipulation"
                >
                  {qtyInCart > 0 && (
                    <div className="absolute top-0 right-0 bg-pos-brand text-white w-10 h-10 flex items-center justify-center rounded-bl-2xl font-bold text-lg shadow-md z-10">
                      {qtyInCart}
                    </div>
                  )}
                  <div className="w-full h-32 bg-pos-border shrink-0 relative bg-pos-bg overflow-hidden border-b border-pos-border">
                    {menu.image_url ? (
                      <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-pos-text-muted text-4xl opacity-40">🍽️</div>
                    )}
                  </div>
                  <div className="p-3 md:p-4 flex flex-col justify-between flex-1 w-full bg-pos-card">
                    <h3 className="font-semibold text-base md:text-lg line-clamp-2 leading-snug">{menu.name}</h3>
                    <div className="flex justify-between items-end mt-1">
                      <p className="text-pos-brand font-bold text-lg">฿{menu.price}</p>
                      <div className="w-8 h-8 rounded-full bg-pos-brand/10 flex items-center justify-center text-pos-brand font-bold text-lg group-active:bg-pos-brand group-active:text-white transition-colors">+</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🟢 Mobile Bottom Bar (เปิดตะกร้าในมือถือ) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-pos-card border-t border-pos-border p-4 px-4 pb-safe z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <button 
          onClick={() => setIsCartOpen(true)}
          className="w-full bg-pos-brand text-white rounded-2xl p-4 md:p-5 flex justify-between items-center shadow-lg active:scale-95 transition-all min-h-[60px] touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
              {orderItems.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <span className="font-semibold text-lg md:text-xl">ดูตะกร้าอาหาร</span>
          </div>
          <span className="font-bold text-2xl drop-shadow-sm">฿{cartTotal.toLocaleString()}</span>
        </button>
      </div>

      {/* 🔵 ฝั่งขวา: ตะกร้าสรุปบิล (Desktop: 1/3, Mobile: Bottom Sheet) */}
      <div className={`
        fixed inset-0 z-30 bg-pos-bg flex flex-col transition-transform duration-300
        md:relative md:w-1/3 lg:w-1/4 md:translate-y-0 md:bg-pos-card md:border-l md:border-pos-border md:z-0
        ${isCartOpen ? "translate-y-0" : "translate-y-full"}
      `}>
        {/* Mobile Header (Bottom Sheet Drag Handle) */}
        <div className="md:hidden pt-safe p-4 border-b border-pos-border flex flex-col gap-3 bg-pos-card sticky top-0 z-10 rounded-t-3xl mt-safe">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-pos-brand">ตะกร้าอาหาร</h2>
            <button onClick={() => setIsCartOpen(false)} className="w-12 h-12 bg-pos-bg border border-pos-border rounded-full font-bold text-pos-text-muted active:scale-95 flex items-center justify-center text-xl">✕</button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex p-6 border-b border-pos-border bg-pos-card/50 flex-col gap-1 sticky top-0 shrink-0">
          <h2 className="text-2xl font-bold text-pos-brand">ตะกร้าอาหาร</h2>
          <p className="text-pos-text-muted font-medium">{orderItems.reduce((sum, item) => sum + item.quantity, 0)} รายการ</p>
        </div>

        {/* รายการอาหารในตะกร้า */}
        <div className="flex-1 p-3 md:p-4 overflow-y-auto space-y-4 pb-32 md:pb-32 bg-pos-bg md:bg-transparent overscroll-none touch-pan-y">
          {orderItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-pos-text-muted gap-4 opacity-70">
              <span className="text-6xl drop-shadow-sm">🛒</span>
              <p className="text-xl font-medium">ยังไม่มีรายการอาหาร</p>
            </div>
          ) : (
            orderItems.map((item) => {
              const menuName = menuItems.find(m => m.id === item.menu_item_id)?.name || item.custom_item_name;
              return (
                <div key={item.id} className="flex flex-col bg-pos-card p-4 rounded-3xl border-2 border-pos-border shadow-sm animate-in fade-in duration-150 relative">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-lg leading-tight">{menuName}</p>
                      
                      {/* 👇 ส่วนแสดงผล Add-on ใต้ชื่ออาหาร */}
                      {item.addons && item.addons.length > 0 && (
                        <p className="text-sm md:text-base text-pos-brand mt-1 font-medium bg-pos-brand/10 inline-block px-2 py-0.5 rounded-lg flex-wrap gap-1">
                          + {item.addons.map(a => a.name).join(", ")}
                        </p>
                      )}
                      
                      <p className="text-pos-brand font-bold mt-2 text-xl">฿{(item.price_at_time * item.quantity).toLocaleString()}</p>
                    </div>
                    
                    <div className="flex flex-col gap-2 items-end shrink-0">
                      <div className="flex items-center gap-1 bg-pos-bg rounded-2xl p-1.5 border border-pos-border shadow-inner">
                        <button onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)} className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-pos-card hover:bg-pos-danger/20 hover:text-pos-danger rounded-xl font-bold text-2xl active:scale-90 transition-transform touch-manipulation shadow-sm select-none">-</button>
                        <span className="w-8 md:w-10 text-center font-bold text-xl">{item.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)} className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-pos-brand text-white rounded-xl font-bold text-2xl active:scale-90 transition-transform touch-manipulation shadow-sm select-none">+</button>
                      </div>
                    </div>
                  </div>
                  
                  {/* ช่อง Note */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl opacity-50">📝</span>
                    <input
                      type="text"
                      inputMode="text"
                      placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                      defaultValue={item.note || ""}
                      onBlur={(e) => { if (e.target.value !== (item.note || "")) handleUpdateNote(item.id, e.target.value); }}
                      className="flex-1 bg-pos-bg border-2 border-pos-border rounded-xl px-4 py-3 text-base focus:outline-none focus:border-pos-brand transition-all text-pos-text h-12"
                    />
                    <button onClick={() => handleUpdateQuantity(item.id, item.quantity, -item.quantity)} className="w-12 h-12 flex items-center justify-center bg-pos-danger/10 text-pos-danger rounded-xl shrink-0 active:scale-95 transition-transform touch-manipulation hover:bg-pos-danger hover:text-white">
                      <span className="text-xl">🗑️</span>
                    </button>
                  </div>

                  {/* ปุ่มจิ้มด่วน Add-ons ที่ดึงมาจากตาราง add_ons */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t-2 border-pos-border/50">
                      {item.quantity > 1 && (
                        <button 
                          onClick={() => handleSplitItem(item)}
                          className="px-4 py-2 min-h-[44px] bg-pos-bg border-2 border-pos-border rounded-full hover:border-pos-brand text-sm font-medium text-pos-text hover:text-pos-brand active:scale-95 transition-all flex items-center gap-1.5 touch-manipulation"
                        >
                          <span className="text-base">🪚</span> แยก 1 จาน
                        </button>
                      )}
                      
                      {availableAddons.map(addon => {
                        const isAdded = item.addons?.some(a => a.id === addon.id);
                        return (
                          <button 
                            key={addon.id}
                            onClick={() => isAdded ? removePreset(item, addon.id) : applyPreset(item, addon)}
                            className={`px-4 py-2 min-h-[44px] rounded-full text-sm font-bold transition-all active:scale-95 touch-manipulation ${
                              isAdded 
                                ? "bg-pos-brand text-white shadow-md border-2 border-pos-brand" 
                                : "bg-pos-bg border-2 border-pos-border hover:border-pos-brand text-pos-text-muted hover:text-pos-brand"
                            }`}
                          >
                            {isAdded ? "✓ " : "+"}{addon.name} {addon.price > 0 ? `(${addon.price}.-)` : ''}
                          </button>
                        );
                      })}

                      {/* ปุ่มพิมพ์ Custom เอง เผื่อกรณีลูกค้าสั่งแปลกๆ นอกตาราง */}
                      <button 
                        onClick={() => handleCustomAddon(item)}
                        className="px-4 py-2 min-h-[44px] bg-pos-brand/10 border-2 border-pos-brand/30 text-pos-brand rounded-full hover:bg-pos-brand hover:text-white text-sm font-bold transition-all touch-manipulation"
                      >
                        +พิมพ์เพิ่มเติม...
                      </button>

                      {/* ปุ่มเคลียร์ Addons (จะโผล่เมื่อมีการแอดไปแล้ว) */}
                      {item.addons && item.addons.length > 0 && (
                        <button 
                          onClick={async () => {
                            const originalPrice = item.menu_item_id ? (menuItems.find(m => m.id === item.menu_item_id)?.price || 0) : item.price_at_time;
                            const { data } = await supabase.from("order_items").update({ addons: null, price_at_time: originalPrice }).eq("id", item.id).select().single();
                            if (data) setOrderItems(prev => prev.map(i => i.id === item.id ? data : i));
                            updateTotalAmount();
                          }}
                          className="text-xs font-medium text-pos-danger bg-pos-danger/10 px-3 py-1.5 rounded-full ml-auto hover:bg-pos-danger hover:text-white transition-all"
                        >
                          ล้างค่า
                        </button>
                      )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ปุ่ม Checkout */}
        <div className="p-4 md:p-6 bg-pos-card border-t border-pos-border mt-auto shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-base md:text-lg text-pos-text-muted">ยอดรวมทั้งสิ้น</span>
            <span className="text-3xl md:text-4xl font-bold text-pos-brand">฿{cartTotal}</span>
          </div>
          <button 
            disabled={orderItems.length === 0}
            onClick={() => setShowCheckoutModal(true)}
            className="w-full py-4 bg-pos-success text-white rounded-2xl text-xl font-bold active:scale-95 disabled:opacity-50"
          >
            💰 ชำระเงิน / ปิดบิล
          </button>
        </div>
      </div>

      {/* 🚀 Modal ให้เลือก Add-on (เด้งตอนกดเมนู) */}
      {showAddonModal && menuForAddon && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center z-[60] p-4">
           <div className="bg-pos-card w-full max-w-lg rounded-3xl p-6 animate-in slide-in-from-bottom-10 md:zoom-in duration-200 shadow-2xl border border-pos-border">
              <h2 className="text-2xl font-bold mb-2 text-pos-brand">{menuForAddon.name}</h2>
              <p className="text-pos-text-muted mb-6">เลือกท็อปปิ้ง / ส่วนเสริม (ถ้ามี)</p>
              
              <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-6 pr-2 no-scrollbar">
                {availableAddons.map(addon => {
                   const isSelected = selectedAddons.some(a => a.id === addon.id);
                   return (
                     <button 
                       key={addon.id}
                       onClick={() => toggleAddon(addon)}
                       className={`w-full flex justify-between items-center p-4 rounded-xl border-2 transition-all active:scale-95 ${
                         isSelected 
                          ? 'border-pos-brand bg-pos-brand/10 shadow-md' 
                          : 'border-pos-border bg-pos-bg hover:border-pos-text-muted'
                       }`}
                     >
                       <div className="flex items-center gap-3">
                         <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${isSelected ? 'border-pos-brand bg-pos-brand text-white' : 'border-pos-text-muted bg-transparent'}`}>
                           {isSelected && "✓"}
                         </div>
                         <span className={`font-medium text-lg ${isSelected ? 'text-white' : 'text-pos-text-muted'}`}>{addon.name}</span>
                       </div>
                       <span className={`font-bold ${isSelected ? 'text-pos-brand' : 'text-pos-text-muted'}`}>
                         {addon.price > 0 ? `+฿${addon.price}` : 'ฟรี'}
                       </span>
                     </button>
                   )
                })}
              </div>

              <div className="flex gap-3 pt-4 border-t border-pos-border">
                <button onClick={() => { setShowAddonModal(false); setMenuForAddon(null); }} className="px-6 py-4 bg-pos-border rounded-2xl font-bold text-pos-text-muted hover:text-white">ยกเลิก</button>
                <button 
                  onClick={() => handleAddItemToCart(menuForAddon, selectedAddons)} 
                  className="flex-1 py-4 bg-pos-brand text-white rounded-2xl font-bold shadow-lg text-lg flex justify-between items-center px-6"
                >
                  <span>เพิ่มลงตะกร้า</span>
                  <span>฿{menuForAddon.price + selectedAddons.reduce((sum, a) => sum + a.price, 0)}</span>
                </button>
              </div>
           </div>
        </div>
      )}

      {/* 🧾 Modal คิดเงิน (โฉมใหม่ระบบสแกน & เงินสด) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center z-[70] p-0 md:p-4">
          <div className="bg-pos-card w-full max-w-md md:rounded-3xl rounded-t-3xl p-6 md:p-8 flex flex-col animate-in slide-in-from-bottom-10 md:zoom-in duration-200 shadow-2xl border-t md:border border-pos-border max-h-[95vh] overflow-y-auto pb-safe">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-pos-brand">ชำระเงิน</h2>
              <button onClick={() => setShowCheckoutModal(false)} className="w-10 h-10 bg-pos-bg border border-pos-border rounded-full flex items-center justify-center text-pos-text-muted active:scale-95 text-xl font-bold touch-manipulation">✕</button>
            </div>

            {/* ยอดรวม */}
            <div className="bg-pos-bg p-5 rounded-3xl border-2 border-pos-border text-center mb-6 shadow-inner">
              <p className="text-pos-text-muted font-medium mb-1">ยอดรวมที่ต้องชำระ (บาท)</p>
              <h3 className="text-5xl md:text-6xl font-black text-pos-brand drop-shadow-sm">{cartTotal.toLocaleString()}</h3>
            </div>

            {/* เลือกประเภทการชำระเงิน */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                type="button" 
                onClick={() => { setPaymentMethod("TRANSFER"); setReceivedAmount(cartTotal); }} 
                className={`py-4 px-2 rounded-2xl font-bold text-lg border-2 flex flex-col items-center gap-2 transition-all active:scale-95 touch-manipulation ${
                  paymentMethod === "TRANSFER" ? "bg-pos-brand/10 border-pos-brand text-pos-brand shadow-sm" : "bg-pos-card border-pos-border text-pos-text-muted hover:border-pos-brand/50"
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${paymentMethod === "TRANSFER" ? "bg-pos-brand text-white shadow-md relative" : "bg-pos-bg text-3xl pb-1"}`}>
                  {paymentMethod === "TRANSFER" ? "✓" : "📱"}
                </div>
                <span>สแกน QR จ่าย</span>
              </button>
              <button 
                type="button" 
                onClick={() => { setPaymentMethod("CASH"); setReceivedAmount(""); }} 
                className={`py-4 px-2 rounded-2xl font-bold text-lg border-2 flex flex-col items-center gap-2 transition-all active:scale-95 touch-manipulation ${
                  paymentMethod === "CASH" ? "bg-pos-brand/10 border-pos-brand text-pos-brand shadow-sm" : "bg-pos-card border-pos-border text-pos-text-muted hover:border-pos-brand/50"
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${paymentMethod === "CASH" ? "bg-pos-brand text-white shadow-md relative" : "bg-pos-bg text-3xl pb-1"}`}>
                  {paymentMethod === "CASH" ? "✓" : "💵"}
                </div>
                <span>เงินสด</span>
              </button>
            </div>

            {/* 🔽 กรณีเลือก สแกนจ่าย (TRANSFER) 🔽 */}
            {paymentMethod === "TRANSFER" && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-300 mb-6">
                <div className="bg-white p-4 rounded-3xl shadow-sm border-2 border-pos-border mb-4 w-56 h-56 flex flex-col items-center justify-center relative overflow-hidden">
                  {/* 👇 ใส่เบอร์โทรศัพท์มือถือ หรือ เลขบัตรประชาชนที่ผูกพร้อมเพย์ แทน 0800000000 ได้เลยครับ */}
                  <img src={`https://promptpay.io/0643086816/${cartTotal}.png`} alt="PromptPay QR" className="w-full h-full object-contain mix-blend-multiply" />
                  <div className="absolute inset-0 border-4 border-pos-brand/80 rounded-3xl pointer-events-none"></div>
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-pos-brand animate-[bounce_2s_infinite] shadow-[0_0_8px_rgba(249,115,22,1)]" style={{ transform: "translateY(-50%)" }}></div>
                </div>
                <p className="text-pos-text-muted font-medium text-center text-sm md:text-base">
                  ให้ลูกค้าสแกนคิวอาร์โค้ดด้านบน<br/>(ระบบสร้างยอดชำระ <b className="text-pos-brand">{cartTotal}</b> บาท อัตโนมัติ)
                </p>
              </div>
            )}

            {/* 🔽 กรณีเลือก เงินสด (CASH) 🔽 */}
            {paymentMethod === "CASH" && (
              <div className="space-y-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                {/* 1. ปุ่ม Quick Cash */}
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => setReceivedAmount(cartTotal)} className="py-3 bg-pos-card border-2 border-pos-border rounded-xl font-bold text-pos-brand hover:border-pos-brand active:scale-95 touch-manipulation">พอดี</button>
                  {[100, 500, 1000].map(amt => (
                    <button key={amt} onClick={() => setReceivedAmount(amt)} className="py-3 bg-pos-card border-2 border-pos-border rounded-xl font-bold text-pos-text hover:border-pos-brand hover:text-pos-brand active:scale-95 touch-manipulation">
                      {amt}
                    </button>
                  ))}
                </div>

                {/* 2. ช่องกรอกเงินสด */}
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl text-pos-text-muted font-bold">฿</span>
                  <input 
                    type="number" 
                    inputMode="numeric" 
                    pattern="[0-9]*"
                    placeholder="รับเงินสดมา..." 
                    value={receivedAmount} 
                    onChange={(e) => setReceivedAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                    className="w-full bg-pos-bg border-2 border-pos-border rounded-2xl pl-12 pr-12 py-4 text-3xl font-bold text-pos-text focus:outline-none focus:border-pos-brand focus:bg-pos-card transition-all placeholder:text-2xl placeholder:opacity-40" 
                  />
                  {receivedAmount !== "" && (
                    <button onClick={() => setReceivedAmount("")} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-pos-text-muted/20 rounded-full flex items-center justify-center text-pos-text-muted active:scale-90 font-bold touch-manipulation">✕</button>
                  )}
                </div>

                {/* 3. กล่องเงินทอน */}
                <div className={`flex justify-between items-center p-5 rounded-2xl border-2 transition-all ${
                  typeof receivedAmount === "number" && receivedAmount >= cartTotal 
                    ? "bg-pos-success/10 border-pos-success" 
                    : "bg-pos-bg border-pos-border opacity-60"
                }`}>
                  <span className="text-lg font-bold text-pos-text-muted">เงินทอน :</span>
                  <span className={`text-4xl md:text-5xl font-black ${
                     typeof receivedAmount === "number" && receivedAmount >= cartTotal ? "text-pos-success drop-shadow-sm" : "text-pos-text-muted"
                  }`}>
                    {typeof receivedAmount === "number" && receivedAmount >= cartTotal ? `฿${changeAmount.toLocaleString()}` : "฿0"}
                  </span>
                </div>
              </div>
            )}

            {/* ปุ่มกดยืนยันชำระ */}
            <div className="mt-auto pt-4 md:pt-6">
              <button 
                type="button" 
                disabled={paymentMethod === "CASH" && (receivedAmount === "" || receivedAmount < cartTotal)}
                onClick={handleConfirmPayment} 
                className="w-full py-5 bg-pos-success text-white font-bold text-2xl rounded-2xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all touch-manipulation shadow-lg border-b-4 border-black/20 active:border-b-0 active:translate-y-1 flex items-center justify-center gap-3 min-h-[70px]"
              >
                <span>{paymentMethod === "TRANSFER" ? "✓ ยืนยันการโอนเงิน (ปิดบิล)" : "✓ ยืนยันรับเงิน (ปิดบิล)"}</span>
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}