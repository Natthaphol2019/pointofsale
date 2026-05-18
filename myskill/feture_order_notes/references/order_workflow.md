# Reference: Order Workflow & Schema

## Database Schema (ที่เกี่ยวข้อง)
- **Table:** `order_items`
- **Target Column:** `note` (ประเภท `text`, nullable)

## Workflow (Staff Single Screen)
1. พนักงานกดจิ้มเมนูอาหารจากฝั่งซ้าย (Categories -> Menu Items)
2. ระบบสร้าง Record ลง `order_items` (สถานะ PENDING โดย Default)
3. รายการเด้งมาฝั่งขวา (Cart)
4. พนักงานคลิกที่ช่อง input ใต้เมนู พิมพ์หมายเหตุ เช่น "เผ็ดน้อย"
5. เมื่อพิมพ์เสร็จและกดคลิกที่อื่น (Trigger `onBlur`) ระบบจะ Update ค่า "เผ็ดน้อย" ลง Supabase
6. พนักงานกดยืนยันการชำระเงิน (Checkout) จบกระบวนการ