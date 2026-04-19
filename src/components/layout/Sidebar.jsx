import React, { useState } from 'react';
import { LayoutDashboard, Info, GraduationCap, Settings, HelpCircle, ChevronRight, ChevronDown, Plus, Trash2, FileText, Users, UserSearch, Menu, Search, Clock, X, LogOut, RefreshCcw, ArrowUpCircle } from 'lucide-react';

function NavItem({ label, icon: _Icon, onClick, active, count = 0, hasSubmenu, isSubmenuOpen, onToggleSubmenu, isCollapsed }) {
    return (
        <div className="mb-px px-2">
            <button
                onClick={onClick}
                title={isCollapsed ? label : ""}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg transition-all text-[15px] group ${
                    active 
                        ? 'bg-[#f05959]/40 text-white font-bold shadow-sm border border-white/10' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white font-medium'
                }`}
            >
                <div className="flex items-center gap-2.5 overflow-hidden">
                    {hasSubmenu && !isCollapsed && (
                        <div 
                            onClick={(e) => { e.stopPropagation(); onToggleSubmenu && onToggleSubmenu(); }}
                            className="p-0.5 hover:bg-white/10 rounded transition-colors"
                        >
                            {isSubmenuOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                        </div>
                    )}
                    <_Icon size={18} className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-white'} shrink-0`} />
                    {!isCollapsed && <span className="truncate">{label}</span>}
                </div>
                {!isCollapsed && count > 0 && (
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>{count}</span>
                )}
            </button>
        </div>
    );
}

function SubItem({ label, onClick, active, icon: _Icon }) {
    return (
        <div className="px-2 ml-4">
            <button
                onClick={onClick}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-sm group ${
                    active ? 'bg-[#f05959]/40 text-white font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                }`}
            >
                {_Icon && <_Icon size={14} className="opacity-50" />}
                <span className="truncate">{label}</span>
            </button>
        </div>
    );
}

export default function Sidebar({ activeTab, setActiveTab, groups = [], activeGroup = 'ALL', setActiveGroup, onAddGroup, onRemoveGroup, onOpenSettings, tasks = [], userRole = 'user', onToggleSidebar, isSidebarOpen: _isSidebarOpen, onLogout, onSyncPull, onSyncPush, onAddTask, reminderCount }) {
    // State quản lý việc thu gọn/mở rộng Sidebar
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    const [newGroup, setNewGroup] = useState('');
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [isPersonnelExpanded, setIsPersonnelExpanded] = useState(true);
    const [isTaskGroupsExpanded, setIsTaskGroupsExpanded] = useState(true);
    const [isRecruitmentExpanded, setIsRecruitmentExpanded] = useState(false);

    const now = new Date();
    const getGroupStats = (group) => {
        const groupTasks = tasks.filter(t => t.group === group);
        const active = groupTasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED').length;
        const overdue = groupTasks.filter(t => t.endDate && new Date(t.endDate) < now && t.status !== 'DONE' && t.status !== 'CANCELLED').length;
        return { active, overdue };
    };
    const totalActive = tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED').length;
    
    const isAdmin = userRole === 'admin';

    return (
        <aside 
            className={`${isCollapsed ? 'w-[72px]' : 'w-64'} bg-[#0f172a] h-full flex flex-col border-r border-slate-800 flex-shrink-0 overflow-hidden font-sans transition-all duration-300 ease-in-out z-20 relative`}
        >
            {/* User Profile Header */}
            <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} h-14 shrink-0 group transition-colors border-b border-white/5`}>
                <img src="/ace-logo.svg" alt="ACE" className="w-8 h-8 rounded-lg shadow-lg shrink-0" />
                {!isCollapsed && (
                    <>
                        <span className="font-bold text-[16px] text-white truncate flex-1 tracking-tight">ACE HRM</span>
                        <button 
                            onClick={onToggleSidebar}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-800 hover:text-white transition-all ml-auto"
                            title="Ẩn Sidebar"
                        >
                            <X size={16} />
                        </button>
                    </>
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide py-4 space-y-4">
                
                {/* Search / Inbox / Settings Simulation */}
                <div className="space-y-px">
                    <NavItem 
                        id="search" 
                        label="Tìm kiếm" 
                        icon={Search} 
                        onClick={() => {
                            const q = window.prompt('Nhập nội dung cần tìm kiếm (nhân viên, hồ sơ, công việc)...');
                            if (q) alert(`Đang tìm kiếm: "${q}"... (Kết quả sẽ hiển thị tại tab tương ứng)`);
                        }} 
                        active={false} 
                        isCollapsed={isCollapsed}
                    />
                    <NavItem 
                        id="updates" 
                        label="Cập nhật" 
                        icon={Clock} 
                        onClick={() => alert(`🔔 Bạn có ${reminderCount || 0} thông báo mới về tiến độ công việc và hồ sơ tuyển dụng.`)} 
                        active={false} 
                        count={reminderCount} 
                        isCollapsed={isCollapsed}
                    />
                    <NavItem id="settings" label="Cài đặt & Thành viên" icon={Settings} onClick={onOpenSettings} active={false} isCollapsed={isCollapsed} />
                    {isAdmin && (
                        <div className="px-2 mt-2">
                             <button 
                                onClick={onAddTask}
                                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-3 py-2 bg-[#f05959]/10 text-[#f05959] rounded-lg hover:bg-[#f05959]/20 transition-all text-sm font-bold`}
                            >
                                <Plus size={16} />
                                {!isCollapsed && <span>Thêm công việc</span>}
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Navigation */}
                <div className="space-y-px">
                    {!isCollapsed && <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-4 mt-4">KHÔNG GIAN LÀM VIỆC</div>}
                    
                    {/* Personnel Section */}
                    <div className="space-y-px">
                        <NavItem 
                            id="personnel" 
                            label="Nhân sự" 
                            icon={Users} 
                            onClick={() => { setActiveTab('personnel'); if (!isCollapsed) setIsPersonnelExpanded(true); }} 
                            active={activeTab.startsWith('personnel')} 
                            hasSubmenu={true}
                            isSubmenuOpen={isPersonnelExpanded && !isCollapsed}
                            onToggleSubmenu={() => setIsPersonnelExpanded(!isPersonnelExpanded)}
                            isCollapsed={isCollapsed}
                        />
                        {isPersonnelExpanded && !isCollapsed && (
                            <div className="space-y-px mt-0.5">
                                <SubItem label="Tất cả nhân sự" onClick={() => setActiveTab('personnel')} active={activeTab === 'personnel'} />
                                <SubItem label="Đánh giá tháng" onClick={() => setActiveTab('personnel-evaluation')} active={activeTab === 'personnel-evaluation'} />
                                {isAdmin && (
                                    <>
                                        <SubItem label="Tổng quan" onClick={() => setActiveTab('personnel-summary')} active={activeTab === 'personnel-summary'} />
                                        <SubItem label="Báo cáo" onClick={() => setActiveTab('personnel-report')} active={activeTab === 'personnel-report'} />
                                    </>
                                )}
                                <SubItem label="Biến động" onClick={() => setActiveTab('personnel-movements')} active={activeTab === 'personnel-movements'} />
                                <SubItem label="Hợp đồng & Hồ sơ" onClick={() => setActiveTab('personnel-contracts')} active={activeTab === 'personnel-contracts'} />
                            </div>
                        )}
                    </div>

                    {/* Recruitment Section */}
                    <div className="space-y-px">
                        <NavItem 
                            id="recruitment" 
                            label="Tuyển dụng" 
                            icon={UserSearch} 
                            onClick={() => { setActiveTab('recruitment-candidates'); if (!isCollapsed) setIsRecruitmentExpanded(true); }} 
                            active={activeTab.startsWith('recruitment')} 
                            hasSubmenu={true}
                            isSubmenuOpen={isRecruitmentExpanded && !isCollapsed}
                            onToggleSubmenu={() => setIsRecruitmentExpanded(!isRecruitmentExpanded)}
                            isCollapsed={isCollapsed}
                        />
                        {isRecruitmentExpanded && !isCollapsed && (
                            <div className="space-y-px mt-0.5">
                                <SubItem label="Ứng viên" onClick={() => setActiveTab('recruitment-candidates')} active={activeTab === 'recruitment-candidates'} />
                                <SubItem label="Xem chi nhánh" onClick={() => setActiveTab('recruitment-branch')} active={activeTab === 'recruitment-branch'} />
                                <SubItem label="Lịch phỏng vấn" onClick={() => setActiveTab('recruitment-interview')} active={activeTab === 'recruitment-interview'} />
                                <SubItem label="Báo cáo tuyển dụng" onClick={() => setActiveTab('recruitment-report')} active={activeTab === 'recruitment-report'} />
                            </div>
                        )}
                    </div>

                    {/* Task Manager Section */}
                    <div className="space-y-px">
                        <NavItem 
                            id="task-manager" 
                            label="Công việc" 
                            icon={LayoutDashboard} 
                            onClick={() => { setActiveTab('task-manager'); setActiveGroup('ALL'); if (!isCollapsed) setIsTaskGroupsExpanded(true); }} 
                            active={activeTab === 'task-manager' && activeGroup === 'ALL'} 
                            count={isAdmin ? totalActive : tasks.filter(t => (t.group === localStorage.getItem('user_branch') || t.group === 'ALL') && t.status !== 'DONE' && t.status !== 'CANCELLED').length}
                            hasSubmenu={isAdmin}
                            isSubmenuOpen={isTaskGroupsExpanded && !isCollapsed}
                            onToggleSubmenu={() => setIsTaskGroupsExpanded(!isTaskGroupsExpanded)}
                            isCollapsed={isCollapsed}
                        />
                        {isTaskGroupsExpanded && isAdmin && !isCollapsed && (
                            <div className="space-y-px mt-0.5">
                                {groups.map(group => {
                                    const stats = getGroupStats(group);
                                    return (
                                        <div key={group} className="px-2 ml-4">
                                            <button
                                                onClick={() => { setActiveTab('task-manager'); setActiveGroup(group); }}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm group ${
                                                    activeTab === 'task-manager' && activeGroup === group ? 'bg-[#f05959]/40 text-white font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stats.overdue > 0 ? 'bg-red-400' : 'bg-[#37352f]/20'}`} />
                                                    <span className="truncate">{group}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {stats.active > 0 && <span className="text-sm font-semibold opacity-40">{stats.active}</span>}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); if (onRemoveGroup) onRemoveGroup(group); }} 
                                                        className="text-[#37352f]/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </button>
                                        </div>
                                    );
                                })}
                                {isAdmin && (
                                    <div className="px-2 ml-4 mt-1">
                                        {isAddingGroup ? (
                                            <input 
                                                autoFocus
                                                type="text" 
                                                className="w-full bg-white text-[#37352f] text-sm font-medium rounded border border-[#37352f]/10 px-2 py-1 outline-none focus:border-[#2eaadc]/50 transition-all shadow-sm"
                                                placeholder="Tên nhóm mới..."
                                                value={newGroup}
                                                onChange={e => setNewGroup(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') { if (newGroup.trim() && onAddGroup) onAddGroup(newGroup.trim()); setNewGroup(''); setIsAddingGroup(false); }
                                                    if (e.key === 'Escape') { setIsAddingGroup(false); setNewGroup(''); }
                                                }}
                                                onBlur={() => {
                                                    if (newGroup.trim() && onAddGroup) onAddGroup(newGroup.trim());
                                                    setIsAddingGroup(false);
                                                    setNewGroup('');
                                                }}
                                            />
                                        ) : (
                                            <button 
                                                onClick={() => setIsAddingGroup(true)}
                                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-[#37352f]/40 hover:bg-[#efedf0] transition-colors"
                                            >
                                                <Plus size={14} /> <span>Thêm nhóm mới</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <NavItem id="contract" label="Tài liệu & Biểu mẫu" icon={FileText} onClick={() => setActiveTab('contract')} active={activeTab === 'contract'} isCollapsed={isCollapsed} />
                    {isAdmin && <NavItem id="trainer" label="Đào tạo" icon={GraduationCap} onClick={() => setActiveTab('trainer')} active={activeTab === 'trainer'} isCollapsed={isCollapsed} />}
                    <NavItem id="info" label="Trợ giúp & Hỗ trợ" icon={Info} onClick={() => setActiveTab('info')} active={activeTab === 'info'} isCollapsed={isCollapsed} />
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-white/5 space-y-1">
                {isAdmin && (
                    <div className="flex items-center justify-between px-2 mb-2">
                        <div className="flex gap-2">
                            <button onClick={onSyncPull} className="p-2 text-emerald-400 hover:bg-white/5 rounded-lg transition-colors" title="Đồng bộ về">
                                <RefreshCcw size={16} />
                            </button>
                            <button onClick={onSyncPush} className="p-2 text-rose-400 hover:bg-white/5 rounded-lg transition-colors" title="Gửi dữ liệu">
                                <ArrowUpCircle size={16} />
                            </button>
                        </div>
                    </div>
                )}
                
                <button 
                    onClick={() => { if(window.confirm('Bạn có muốn đăng xuất?')) onLogout(); }}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all text-sm font-bold group`}
                >
                    <LogOut size={18} className="shrink-0" />
                    {!isCollapsed && <span>Đăng xuất</span>}
                </button>

                <div className="flex justify-end pt-2">
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white transition-all"
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>
        </aside>
    );
}
