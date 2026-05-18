import { createClient } from '@supabase/supabase-js';

// ดึงค่า URL และ Key มาจากไฟล์ .env.local (มี Fallback กันเว็บพังตอน Build)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://auenzzzprsgumwabzvdi.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZW56enpwcnNndW13YWJ6dmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDgwNDMsImV4cCI6MjA5NDYyNDA0M30.oMp9xZ6l4i2xECIGAlOoaYr5qzNa6PrBKJra8IQQkTw';
// สร้างและส่งออกตัว Client เพื่อนำไปใช้ดึงข้อมูลในไฟล์อื่นๆ
export const supabase = createClient(supabaseUrl, supabaseAnonKey);