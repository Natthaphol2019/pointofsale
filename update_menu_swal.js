const fs = require('fs');
let code = fs.readFileSync('app/(admin)/menu-setting/page.tsx', 'utf-8');

if(!code.includes("import Swal from 'sweetalert2'") && !code.includes('import Swal from "sweetalert2"')) {
    code = code.replace('import { Plus, Edit2, CheckCircle2, ImageOff, X, Save, ShieldAlert } from "lucide-react";', 'import { Plus, Edit2, CheckCircle2, ImageOff, X, Save, ShieldAlert } from "lucide-react";\nimport Swal from "sweetalert2";');
}

code = code.replace(/alert\("เกิดข้อผิดพลาดในการตัดรูปภาพ"\);/g, `Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการตัดรูปภาพ', confirmButtonColor: '#ff5722' });`);

code = code.replace(/return alert\("กรุณากรอกข้อมูลให้ครบถ้วน"\);/g, `return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', confirmButtonColor: '#ff5722' });`);

code = code.replace(/alert\("อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่"\);/g, `Swal.fire({ icon: 'error', title: 'อัปโหลดไม่สำเร็จ', text: 'อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่', confirmButtonColor: '#ff5722' });`);

// Success sweet alert on save
code = code.replace(/setMenus\(menus\.map\(m => m\.id === editId \? data : m\)\);\n *setShowModal\(false\);/g, `setMenus(menus.map(m => m.id === editId ? data : m));\n        setShowModal(false);\n        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', showConfirmButton: false, timer: 1500 });`);

code = code.replace(/setMenus\(\[\.\.\.menus, data\]\);\n *setShowModal\(false\);/g, `setMenus([...menus, data]);\n        setShowModal(false);\n        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', showConfirmButton: false, timer: 1500 });`);

fs.writeFileSync('app/(admin)/menu-setting/page.tsx', code);
