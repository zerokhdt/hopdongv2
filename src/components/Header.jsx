import React from 'react';
import { RefreshCcw, ArrowUpCircle, LogOut, Plus } from 'lucide-react';

export default function Header({ onAddTask, reminderCount, onSyncPull, onSyncPush, onLogout, userRole }) {
  const handleLogout = () => {
    if (window.confirm('Bạn có muốn đăng xuất không?')) {
      onLogout();
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 font-sans">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <img src="/ace-logo.svg" alt="ACE" className="w-9 h-9 rounded-xl shadow-sm" />
          <h1 className="text-xl font-bold text-[#E11920] tracking-tight">ACE HRM</h1>
        </div>
        {reminderCount > 0 && isAdmin && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-red-500/20 animate-bounce">
            {reminderCount} nhắc nhở
          </span>
        )}
      </div>
      
        {/* Actions */}
        <div className="flex items-center gap-3">
        {isAdmin && (
          <>
            {/* Nút Sync Xanh Lá: Tải từ Sheet về Web */}
            <button 
              onClick={() => onSyncPull()}
              className="p-2.5 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-300 group relative"
              title="Tải dữ liệu từ Sheet về Web (Pull)"
            >
              <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></span>
            </button>

            {/* Nút Sync Đỏ: Đẩy từ Web lên Sheet */}
            <button 
              onClick={() => onSyncPush()}
              className="p-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300 group relative"
              title="Đẩy dữ liệu từ Web lên Sheet (Push/Merge)"
            >
              <ArrowUpCircle className="w-5 h-5 group-hover:-translate-y-1 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>

            <button 
              onClick={onAddTask}
              className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-200 ml-2"
            >
              <Plus size={18} /> Thêm công việc
            </button>
          </>
        )}

        <button
          onClick={handleLogout}
          title="Đăng xuất"
          className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-300 group ml-2 flex items-center gap-2"
        >
          {!isAdmin && <span className="text-sm font-semibold truncate max-w-[120px]">{localStorage.getItem('user_branch')}</span>}
          <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </header>
  );
}
