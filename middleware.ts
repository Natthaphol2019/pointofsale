import { type NextRequest } from "next/server";
// เปลี่ยนจาก "@/utils/supabase/middleware" ให้เป็น "./utils/supabase/middleware"
import { updateSession } from "./utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};