import { createClient } from '@supabase/supabase-js';

// ดึงค่า URL และ Key มาจากไฟล์ .env.local 
// คำเตือน: ควรใช้ process.env เท่านั้น เพื่อความปลอดภัยของ Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// สร้างและส่งออกตัว Client เพื่อนำไปใช้ดึงข้อมูลในไฟล์อื่นๆ
export const supabase = createClient(supabaseUrl, supabaseAnonKey);