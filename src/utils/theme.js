/**
 * ACE HRM Theme Configuration
 * centralizing typography and formatting rules
 */

export const THEME = {
  // Typography Rules
  typography: {
    // Only Titles are Bold
    title: "font-black text-slate-800 uppercase tracking-tight", // font-family: Helvetica (via global)
    subtitle: "font-bold text-slate-700 tracking-wide",
    
    // Body text must NOT be bold
    body: "font-normal text-slate-600 leading-relaxed",
    label: "font-normal text-[10px] text-slate-400 uppercase tracking-[0.2em]",
    
    // Status & Badges
    badge: "font-normal text-[10px] uppercase tracking-widest px-3 py-1 rounded-lg",
    
    // Sizes
    size: {
      h1: "text-4xl",
      h2: "text-2xl",
      h3: "text-lg",
      body: "text-sm",
      small: "text-[12px]",
      tiny: "text-[10px]"
    }
  },

  // Color Palette (ACE Colors)
  colors: {
    primary: "#E11920", // ACE Red
    secondary: "#1E293B", // Slate 800
    accent: "#4F46E5", // Indigo 600
    success: "#10B981", // Emerald 500
    warning: "#F59E0B", // Amber 500
    danger: "#EF4444" // Red 500
  },

  // Layout Standards
  layout: {
    radius: {
      card: "rounded-[40px]",
      button: "rounded-[20px]",
      input: "rounded-[18px]",
      badge: "rounded-full"
    },
    shadow: "shadow-2xl shadow-slate-200/50"
  }
};

export const THEMES = {
  slate: { id: 'slate', name: 'Mặc định', hex: '#64748b' },
  blue: { id: 'blue', name: 'Xanh dương', hex: '#3b82f6' },
  green: { id: 'green', name: 'Xanh lá', hex: '#22c55e' },
  red: { id: 'red', name: 'Đỏ', hex: '#ef4444' },
  orange: { id: 'orange', name: 'Cam', hex: '#f97316' },
  amber: { id: 'amber', name: 'Vàng', hex: '#f59e0b' },
  emerald: { id: 'emerald', name: 'Ngọc bích', hex: '#10b981' },
  purple: { id: 'purple', name: 'Tím', hex: '#a855f7' },
  pink: { id: 'pink', name: 'Hồng', hex: '#ec4899' },
  indigo: { id: 'indigo', name: 'Chàm', hex: '#6366f1' },
};
