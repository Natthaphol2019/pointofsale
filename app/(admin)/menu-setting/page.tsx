"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Cropper from "react-easy-crop";

interface Category { id: string; name: string; }
interface MenuItem { 
  id: string; 
  name: string; 
  price: number; 
  cost: number; 
  is_active: boolean; 
  category_id: string; 
  image_url?: string;
}

// 🛠️ Helper ฟังก์ชันสำหรับวาดรูปและแปลงเป็น WebP
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );

  // แปลงเป็น WebP คุณภาพ 80% (ลดขนาดไฟล์ได้เยอะมาก ภาพยังชัด)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", 0.8);
  });
}

export default function MenuSettingPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Modal เมนู
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "", price: "", cost: "", category_id: "", image_url: ""
  });

  // ✂️ State สำหรับระบบ Crop รูป
  const [imageSrc, setImageSrc] = useState<string | null>(null); // รูปต้นฉบับก่อน crop
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null); // ไฟล์ WebP ที่ crop เสร็จแล้ว
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // รูปพรีวิวหลัง crop

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: catData } = await supabase.from("categories").select("*").order("sort_order");
    if (catData) {
      setCategories(catData);
      if (catData.length > 0) setFormData(prev => ({ ...prev, category_id: catData[0].id }));
    }
    const { data: menuData } = await supabase.from("menu_items").select("*").is("deleted_at", null).order("name");
    if (menuData) setMenus(menuData);
    setLoading(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("menu_items").update({ is_active: !currentStatus }).eq("id", id);
    if (!error) setMenus(menus.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m));
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({ name: "", price: "", cost: "", category_id: categories.length > 0 ? categories[0].id : "", image_url: "" });
    resetCropState();
    setShowModal(true);
  };

  const handleOpenEdit = (menu: MenuItem) => {
    setEditId(menu.id);
    setFormData({ name: menu.name, price: menu.price.toString(), cost: menu.cost.toString(), category_id: menu.category_id, image_url: menu.image_url || "" });
    resetCropState();
    setShowModal(true);
  };

  const resetCropState = () => {
    setImageSrc(null);
    setCroppedBlob(null);
    setPreviewUrl(null);
    setZoom(1);
  };

  // 📂 เมื่อแอดมินเลือกไฟล์
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => setImageSrc(reader.result as string));
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // ✅ เมื่อกดยืนยันการ Crop
  const confirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const webpBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (webpBlob) {
        setCroppedBlob(webpBlob);
        setPreviewUrl(URL.createObjectURL(webpBlob)); // สร้าง URL จำลองให้พรีวิวดู
        setImageSrc(null); // ปิดหน้าต่าง Crop
      }
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการตัดรูปภาพ");
    }
  };

  // 🚀 อัปโหลดไฟล์ WebP ขึ้น Supabase
  const uploadImage = async (blob: Blob): Promise<string | null> => {
    try {
      setUploading(true);
      const fileName = `${Date.now()}.webp`; // บังคับนามสกุลเป็น .webp
      const { error: uploadError } = await supabase.storage.from('menu-images').upload(fileName, blob, {
        contentType: 'image/webp'
      });
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.cost) return alert("กรุณากรอกข้อมูลให้ครบถ้วน");

    let finalImageUrl = formData.image_url; 

    // ถ้ามีการ Crop รูปใหม่ ให้อัปโหลดก่อน
    if (croppedBlob) {
      const uploadedUrl = await uploadImage(croppedBlob);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        alert("อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
    }

    const payload = {
      name: formData.name,
      price: Number(formData.price),
      cost: Number(formData.cost),
      category_id: formData.category_id,
      image_url: finalImageUrl || null,
      is_active: true
    };

    if (editId) {
      const { data, error } = await supabase.from("menu_items").update(payload).eq("id", editId).select().single();
      if (!error && data) {
        setMenus(menus.map(m => m.id === editId ? data : m));
        setShowModal(false);
      }
    } else {
      const { data, error } = await supabase.from("menu_items").insert([payload]).select().single();
      if (!error && data) {
        setMenus([...menus, data]);
        setShowModal(false);
      }
    }
  };

  if (loading) return <div className="p-8 text-pos-text-muted">กำลังโหลดข้อมูลเมนู...</div>;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-pos-brand mb-1">จัดการเมนูอาหาร</h1>
          <p className="text-pos-text-muted">เพิ่ม/แก้ไขเมนู และระบบตัดรูปภาพ (Crop & WebP)</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-pos-brand text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-all font-bold shadow-lg active:scale-95 flex items-center gap-2"
        >
          ➕ เพิ่มเมนูใหม่
        </button>
      </div>
      
      {/* 📋 ตารางรายการอาหาร (โค้ดเดิม) */}
      <div className="bg-pos-card rounded-2xl border border-pos-border shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-pos-bg text-pos-text-muted text-sm border-b border-pos-border">
              <tr>
                <th className="p-4 font-medium w-16 text-center">สถานะ</th>
                <th className="p-4 font-medium w-24">รูปภาพ</th>
                <th className="p-4 font-medium">ชื่อเมนู</th>
                <th className="p-4 font-medium">หมวดหมู่</th>
                <th className="p-4 font-medium text-right text-pos-brand">ราคาขาย</th>
                <th className="p-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border">
              {menus.map((menu) => (
                <tr key={menu.id} className={`hover:bg-pos-bg/50 transition-colors ${!menu.is_active ? 'opacity-50 grayscale' : ''}`}>
                  <td className="p-4 text-center">
                    <button onClick={() => toggleActive(menu.id, menu.is_active)} className={`w-12 h-6 rounded-full transition-all relative ${menu.is_active ? 'bg-pos-success' : 'bg-gray-600'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${menu.is_active ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="p-4">
                    {menu.image_url ? (
                      <img src={menu.image_url} alt={menu.name} className="w-12 h-12 rounded-xl object-cover border border-pos-border shadow-md" />
                    ) : <div className="w-12 h-12 bg-pos-bg rounded-xl border border-dashed border-pos-border flex items-center justify-center text-xs text-pos-text-muted">ไม่มีรูป</div>}
                  </td>
                  <td className="p-4 font-bold text-lg">{menu.name}</td>
                  <td className="p-4"><span className="bg-pos-border px-3 py-1 rounded-full text-sm">{categories.find(c => c.id === menu.category_id)?.name || "ไม่ระบุ"}</span></td>
                  <td className="p-4 text-right font-bold text-pos-brand text-xl">฿{menu.price}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleOpenEdit(menu)} className="px-4 py-2 bg-pos-border hover:bg-pos-brand hover:text-white rounded-lg transition-all font-medium text-sm">📝 แก้ไข</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📝 Modal ฟอร์มเมนู */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="glass-panel p-8 rounded-3xl w-full max-w-md animate-in zoom-in duration-200 relative overflow-hidden">
            <h2 className="text-2xl font-bold mb-6 border-b border-pos-border pb-4">
              {editId ? "📝 แก้ไขเมนูอาหาร" : "➕ เพิ่มเมนูอาหารใหม่"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-pos-text-muted mb-1">หมวดหมู่</label>
                <select value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} className="w-full bg-pos-bg border border-pos-border rounded-xl p-3">
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-pos-text-muted mb-1">ชื่อเมนู</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-pos-bg border border-pos-border rounded-xl p-3" />
              </div>

              {/* 📸 อัปโหลดรูปภาพ */}
              <div>
                <label className="block text-sm text-pos-text-muted mb-1">รูปภาพเมนูอาหาร</label>
                
                {/* แสดงรูปปัจจุบัน หรือ รูปที่เพิ่ง Crop เสร็จ */}
                {(previewUrl || formData.image_url) && !imageSrc && (
                  <div className="mb-3 relative group w-32 h-32">
                    <img src={previewUrl || formData.image_url} alt="Preview" className="w-full h-full object-cover rounded-xl border-2 border-pos-brand shadow-lg" />
                  </div>
                )}

                <input 
                  type="file" accept="image/png, image/jpeg, image/jpg"
                  onChange={onFileChange}
                  className="w-full bg-pos-bg border border-pos-border rounded-xl p-2 text-sm text-pos-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-semibold file:bg-pos-border file:text-white file:hover:bg-pos-brand cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-pos-text-muted mb-1">ต้นทุน (บาท)</label>
                  <input type="number" required min="0" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} className="w-full bg-pos-bg border border-pos-border rounded-xl p-3 text-right" />
                </div>
                <div>
                  <label className="block text-sm text-pos-brand mb-1 font-bold">ราคาขาย (บาท)</label>
                  <input type="number" required min="0" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full bg-pos-bg border border-pos-brand/50 rounded-xl p-3 text-right text-pos-brand font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 mt-2 border-t border-pos-border">
                <button type="button" disabled={uploading} onClick={() => setShowModal(false)} className="py-3 bg-pos-border text-pos-text-muted font-bold rounded-xl hover:text-white transition-all">ยกเลิก</button>
                <button type="submit" disabled={uploading} className="py-3 bg-pos-brand text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg flex justify-center items-center">
                  {uploading ? "กำลังอัปโหลด..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>

            {/* ✂️ Overlay หน้าต่าง Crop รูปภาพ (ซ้อนทับอีกชั้นเมื่อมีการเลือกไฟล์) */}
            {imageSrc && (
              <div className="absolute inset-0 bg-pos-bg z-50 flex flex-col">
                <div className="p-4 border-b border-pos-border bg-pos-card flex justify-between items-center">
                  <h3 className="font-bold text-lg">ครอปรูปภาพ (16:9)</h3>
                  <button onClick={() => setImageSrc(null)} className="text-pos-text-muted hover:text-white">✕ ปิด</button>
                </div>
                <div className="flex-1 relative bg-black">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={16 / 9} // สัดส่วนรูปที่เหมาะกับการ์ดเมนู
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>
                <div className="p-6 bg-pos-card border-t border-pos-border">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm">ซูม</span>
                    <input 
                      type="range" min={1} max={3} step={0.1} value={zoom} 
                      onChange={(e) => setZoom(Number(e.target.value))} 
                      className="flex-1 accent-pos-brand"
                    />
                  </div>
                  <button onClick={confirmCrop} className="w-full py-3 bg-pos-success text-white font-bold rounded-xl shadow-lg hover:bg-green-500">
                    ✅ ยืนยันการตัดรูป
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}