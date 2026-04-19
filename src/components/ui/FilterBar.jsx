import React from 'react';
import { Search, X, ChevronDown, Filter, ListFilter } from 'lucide-react';

const STATUSES = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'TODO', label: 'Cần làm' },
  { value: 'IN_PROGRESS', label: 'Đang làm' },
  { value: 'DONE', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const PRIORITIES = [
  { value: 'ALL', label: 'Tất cả mức độ' },
  { value: 'critical', label: 'Khẩn cấp' },
  { value: 'high', label: 'Cao' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'low', label: 'Thấp' },
];

const QUICK_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'overdue', label: 'Quá hạn' },
];

const SORTS = [
  { value: '', label: 'Sắp xếp theo...' },
  { value: 'date_asc', label: 'Ngày (Cũ → Mới)' },
  { value: 'date_desc', label: 'Ngày (Mới → Cũ)' },
  { value: 'priority', label: 'Mức độ ưu tiên' },
  { value: 'progress', label: 'Tiến độ' },
  { value: 'title', label: 'Tên A→Z' },
];

const TASK_TYPES = [
  { value: 'ALL', label: 'Tất cả loại' },
  { value: 'CONTRACT_PRINT', label: 'In hợp đồng' },
  { value: 'EMPLOYEE_MOVEMENT', label: 'Biến động nhân sự' },
  { value: 'GENERAL', label: 'Thông thường' },
];

export default function FilterBar({ filters, onChange, isAdmin }) {
  const hasActiveFilters = filters.search || filters.status !== 'ALL' || filters.priority !== 'ALL' || filters.quickFilter || (isAdmin && filters.type && filters.type !== 'ALL');

  const reset = () => onChange({ search: '', status: 'ALL', priority: 'ALL', quickFilter: '', sort: '', type: 'ALL' });

  return (
    <div className="flex flex-wrap items-center gap-4 py-2 flex-shrink-0">
      
      {/* Search Bar - Notion style */}
      <div className="relative group max-w-[240px] flex-1">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#37352f]/30" />
        <input
          type="text"
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          placeholder="Tìm theo tiêu đề..."
          className="w-full pl-7 pr-3 py-2 bg-[#37352f]/5 border-none rounded text-[15px] text-[#37352f] placeholder:text-[#37352f]/30 outline-none focus:bg-[#37352f]/10 transition-colors"
        />
        {filters.search && (
            <button onClick={() => onChange({ ...filters, search: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#37352f]/30 hover:text-[#37352f]">
                <X size={12} />
            </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Quick Tabs */}
        <div className="flex items-center gap-1 bg-[#37352f]/5 p-0.5 rounded">
            {QUICK_FILTERS.map(qf => (
            <button
                key={qf.value}
                onClick={() => onChange({ ...filters, quickFilter: qf.value })}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                filters.quickFilter === qf.value
                    ? 'bg-white text-[#37352f] shadow-sm'
                    : 'text-[#37352f]/40 hover:text-[#37352f]'
                }`}
            >
                {qf.label}
            </button>
            ))}
        </div>

        {/* Dropdown Selectors */}
        <div className="flex items-center gap-3 ml-2">
            
            {/* Status */}
            <div className="relative group">
                <div className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-[#37352f]/5 rounded cursor-pointer transition-colors">
                    <ListFilter size={13} className="text-[#37352f]/40" />
                    <select
                        value={filters.status}
                        onChange={e => onChange({ ...filters, status: e.target.value })}
                        className="appearance-none bg-transparent text-sm font-medium text-[#37352f]/80 outline-none cursor-pointer pr-4"
                    >
                        {STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-1 text-[#37352f]/30 pointer-events-none" />
                </div>
            </div>

            {/* Priority */}
            <div className="relative group">
                <div className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-[#37352f]/5 rounded cursor-pointer transition-colors">
                    <Filter size={13} className="text-[#37352f]/40" />
                    <select
                        value={filters.priority}
                        onChange={e => onChange({ ...filters, priority: e.target.value })}
                        className="appearance-none bg-transparent text-sm font-medium text-[#37352f]/80 outline-none cursor-pointer pr-4"
                    >
                        {PRIORITIES.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-1 text-[#37352f]/30 pointer-events-none" />
                </div>
            </div>

            {/* Sort */}
            <div className="relative group">
                <div className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-[#37352f]/5 rounded cursor-pointer transition-colors">
                    <select
                        value={filters.sort || ''}
                        onChange={e => onChange({ ...filters, sort: e.target.value })}
                        className="appearance-none bg-transparent text-sm font-medium text-[#37352f]/80 outline-none cursor-pointer pr-4"
                    >
                        {SORTS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-1 text-[#37352f]/30 pointer-events-none" />
                </div>
            </div>

            {/* Type for Admin */}
            {isAdmin && (
                <div className="relative group border-l border-[#37352f]/10 pl-3 ml-1">
                    <div className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-[#37352f]/5 rounded cursor-pointer transition-colors">
                        <select
                            value={filters.type || 'ALL'}
                            onChange={e => onChange({ ...filters, type: e.target.value })}
                            className="appearance-none bg-transparent text-sm font-medium text-[#37352f]/80 outline-none cursor-pointer pr-4"
                        >
                            {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-1 text-[#37352f]/30 pointer-events-none" />
                    </div>
                </div>
            )}
        </div>

        {/* Reset */}
        {hasActiveFilters && (
            <button
                onClick={reset}
                className="flex items-center gap-1 px-3 py-1.5 text-[#37352f]/60 hover:text-[#37352f]/80 text-sm font-semibold transition-colors border-l border-[#37352f]/10 ml-2"
            >
                <X size={12} /> <span>Xóa bộ lọc</span>
            </button>
        )}
      </div>
    </div>
  );
}
