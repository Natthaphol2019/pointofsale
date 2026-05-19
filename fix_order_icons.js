const fs = require('fs');
let code = fs.readFileSync('app/(staff)/order/[id]/page.tsx', 'utf-8');

// Add imports
if (!code.includes("import Swal from 'sweetalert2'") && !code.includes('import Swal from "sweetalert2"')) {
    code = code.replace('import { supabase } from "@/lib/supabase";', 'import { supabase } from "@/lib/supabase";\nimport Swal from "sweetalert2";\nimport { ArrowLeft, Trash2 } from "lucide-react";');
} else {
    // If Swal is imported but lucide-react might not be
    if (!code.includes('import { ArrowLeft, Trash2 } from "lucide-react";')) {
         code = code.replace('import { supabase } from "@/lib/supabase";', 'import { supabase } from "@/lib/supabase";\nimport { ArrowLeft, Trash2 } from "lucide-react";');
    }
}

// Replace Back emoji
code = code.replace('<span className="text-xl">⬅️</span>', '<ArrowLeft size={24} className="text-slate-600" />');

// Replace Trash emoji
code = code.replace('<span className="text-lg">🗑️</span>', '<Trash2 size={20} />');

fs.writeFileSync('app/(staff)/order/[id]/page.tsx', code);
