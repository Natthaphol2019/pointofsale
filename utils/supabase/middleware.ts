import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ดึงข้อมูล User ปัจจุบัน (เผื่ออนาคตใช้ Supabase Auth เต็มรูปแบบ)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ดึงข้อมูลจาก Cookie ที่สร้างจาก PIN Login
  const posRole = request.cookies.get('pos_role')?.value;
  const posUserId = request.cookies.get('pos_user_id')?.value;

  // ผู้ใช้งานล็อกอินสำเร็จ ถือว่ามี User ของระบบ หรือมี Cookie รหัสพนักงาน
  const isAuthenticated = !!user || (!!posRole && !!posUserId);

  const path = request.nextUrl.pathname;

  // กำหนดหน้าที่ไม่ต้อง Login ก็เข้าได้ (สมมติให้หน้าแรก '/' คือหน้า Login)
  const isAuthRoute = path === '/';
  
  // ยกเว้นพวกไฟล์ระบบ ภาพ และ api
  const isPublicAsset = path.startsWith('/_next/') || path.match(/\.(.*)$/) || path.startsWith('/api/');

  if (isPublicAsset) {
    return supabaseResponse;
  }

  // 1. ถ้าไม่ได้ Login และพยายามเข้าหน้าอื่นที่ไม่ใช่หน้า Login -> เด้งไปหน้า '/'
  if (!isAuthenticated && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // กำหนด Role โดยเช็คจาก Supabase Auth หรือจาก Cookie PIN Login
  const userRole = user?.user_metadata?.role || posRole || 'staff'; 

  // กลุ่ม Path หน้าต่างๆ ของระบบ
  const isAdminPath = path.startsWith('/dashboard') || 
                      path.includes('-setting') || 
                      path.startsWith('/sales-report');
                      
  const isStaffPath = path.startsWith('/tables') || 
                      path.startsWith('/order');

  // 2. ถ้า Login แล้ว แต่จะเข้าหน้า Login '/' อีก -> ให้เด้งไปหน้าตามระบบงานของแต่ละ Role
  if (isAuthenticated && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = userRole === 'admin' ? '/dashboard' : '/tables';
    return NextResponse.redirect(url);
  }

  // 3. ป้องกัน Staff เข้าถึงเมนูของ Admin 
  if (isAuthenticated && userRole !== 'admin' && isAdminPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/tables'; // เด้งกลับไปหน้าจัดการโต๊ะของพนักงาน
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
