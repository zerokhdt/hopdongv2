import React from 'react';
import { RefreshCcw, ArrowUpCircle, LogOut, Plus, Menu } from 'lucide-react';

export default function Header({ onAddTask, reminderCount, onSyncPull, onSyncPush, onLogout, userRole, onToggleSidebar, isSidebarOpen }) {
  const handleLogout = () => {
    if (window.confirm('Bạn có muốn đăng xuất không?')) {
      onLogout();
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[#37352f]/10 bg-white/95 backdrop-blur z-30 font-sans">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 md:hidden flex"
          title={isSidebarOpen ? "Ẩn Sidebar" : "Hiện Sidebar"}
        >
          <Menu size={20} />
        </button>
        <button 
          onClick={onToggleSidebar}
          className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hidden md:flex"
          title={isSidebarOpen ? "Ẩn Sidebar" : "Hiện Sidebar"}
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-3">
          <img src="/ace-logo.svg" alt="ACE" className="w-8 h-8 rounded-lg shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]" />
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">ACE HRM</h1>
        </div>
        {reminderCount > 0 && isAdmin && (
          <span className="bg-rose-50 text-rose-700 border border-rose-100 text-sm font-bold px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
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
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group relative"
              title="Tải dữ liệu từ Sheet về Web (Pull)"
            >
              <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></span>
            </button>

            {/* Nút Sync Đỏ: Đẩy từ Web lên Sheet */}
            <button 
              onClick={() => onSyncPush()}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors group relative"
              title="Đẩy dữ liệu từ Web lên Sheet (Push/Merge)"
            >
              <ArrowUpCircle className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform duration-300" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>

            <button 
              onClick={onAddTask}
              className="hidden md:flex items-center gap-2 bg-[#37352f] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#37352f]/90 transition-all shadow-sm ml-2"
            >
              <Plus size={16} /> Thêm công việc
            </button>
          </>
        )}

        <button
          onClick={handleLogout}
          title="Đăng xuất"
          className="p-2 text-[#37352f]/60 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors group ml-2 flex items-center gap-2"
        >
          {!isAdmin && <span className="text-sm font-bold text-[#37352f] truncate max-w-[120px]">{localStorage.getItem('user_branch')}</span>}
          <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </header>
  );
}