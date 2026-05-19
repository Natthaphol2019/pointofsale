const fs = require('fs');
let code = fs.readFileSync('app/(staff)/order/[id]/page.tsx', 'utf-8');

// Update imports
if (code.includes('import { ArrowLeft, Trash2 } from "lucide-react";')) {
    code = code.replace(
      'import { ArrowLeft, Trash2 } from "lucide-react";',
      'import { ArrowLeft, Trash2, ShoppingCart, Pencil, Scissors, Wallet } from "lucide-react";'
    );
} else if (!code.includes('ShoppingCart')) {
    code = code.replace(
        'import { supabase } from "@/lib/supabase";',
        'import { supabase } from "@/lib/supabase";\nimport { ArrowLeft, Trash2, ShoppingCart, Pencil, Scissors, Wallet } from "lucide-react";'
    );
}

// Replace empty cart
code = code.replace(
    '<span className="text-6xl drop-shadow-sm">🛒</span>',
    '<ShoppingCart size={64} className="text-pos-text-muted opacity-60 mb-2" strokeWidth={1.5} />'
);

// Replace note pencil
code = code.replace(
    '<span className="text-xl opacity-50">📝</span>',
    '<Pencil size={20} className="text-pos-text-muted opacity-60" />'
);

// Replace item trash
code = code.replace(
    '<span className="text-xl">🗑️</span>',
    '<Trash2 size={20} />'
);

// Replace split scissors
code = code.replace(
    '<span className="text-base">🪚</span> แยก 1 จาน',
    '<Scissors size={18} className="opacity-80" /> แยก 1 จาน'
);

// Replace checkout button
code = code.replace(
    '💰 ชำระเงิน / ปิดบิล',
    '<div className="flex items-center justify-center gap-2"><Wallet size={24} /> <span>ชำระเงิน / ปิดบิล</span></div>'
);

// Provide alternative match for checkout just in case
code = code.replace(
    /💰 ชำระเงิน \/ ปิดบิล/g, 
    '<div className="flex items-center justify-center gap-2"><Wallet size={24} /> <span>ชำระเงิน / ปิดบิล</span></div>'
);


fs.writeFileSync('app/(staff)/order/[id]/page.tsx', code);
console.log("Icons updated!");
