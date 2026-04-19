import { useState, useMemo } from 'react';
import { differenceInDays, parseISO, isValid, format, addDays } from 'date-fns';
import { formatName, formatBranch, formatPosition } from '../../../utils/formatters';

function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  return d;
}

// Using centralized formatters from utils

const EmployeeCard = ({ emp }) => (
  <div className={`p-3 rounded-xl border flex items-center justify-between transition-all hover:shadow-md ${
    emp.status === 'EXPIRED' || emp.status === 'URGENT' ? 'bg-red-50 border-red-100 hover:bg-red-100' :
    emp.status === 'WARNING' ? 'bg-amber-50 border-amber-100 hover:bg-amber-100' :
    'bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
  }`}>
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-black text-slate-800 tracking-tight uppercase">{formatName(emp.name)}</span>
      <div className="flex items-center gap-2 text-[10px] font-bold">
        <span className="text-indigo-600">{formatPosition(emp.position)}</span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-500">{formatBranch(emp.department)}</span>
      </div>
    </div>
    <div className="text-right flex flex-col items-end">
      <span className={`text-[11px] font-black ${
        emp.status === 'EXPIRED' ? 'text-red-600' : 'text-slate-700'
      }`}>
        {emp.daysRemaining < 0 ? `Quá hạn ${Math.abs(emp.daysRemaining)} ngày` : `Còn ${emp.daysRemaining} ngày`}
      </span>
      <span className="text-[9px] font-bold text-slate-400">{emp.renewDate}</span>
    </div>
  </div>
);

const Section = ({ title, color, employees, subtitle }) => {
  if (!employees || employees.length === 0) return null;
  const colorClasses = {
    red: 'text-red-600 bg-red-50 border-red-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100'
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex flex-col">
          <h4 className={`text-xs font-black tracking-wider ${colorClasses[color].split(' ')[0]}`}>{title}</h4>
          <span className="text-[10px] font-bold text-slate-400 italic">{subtitle}</span>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${colorClasses[color]}`}>
          {employees.length} nhân sự
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {employees.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
      </div>
    </div>
  );
};

export default function RCC({ employees = [], initialBranch = 'ALL' }) {
  const [branch, _setBranch] = useState(initialBranch);

  const mockEmployees = useMemo(() => {
    if (employees && employees.length > 0) return employees;
    const today = new Date();
    return [
      { id: 'mock-1', name: 'NGUYỄN HOÀNG NAM', position: 'Quản lý chi nhánh', department: 'TRUNG MỸ TÂY', renewDate: format(addDays(today, 25), 'yyyy-MM-dd'), startDate: '2022-01-10' },
      { id: 'mock-2', name: 'TRẦN THỊ BÍCH LIÊN', position: 'Giáo viên - TA', department: 'HÓC MÔN', renewDate: format(addDays(today, 40), 'yyyy-MM-dd'), startDate: '2023-05-15' },
      { id: 'mock-3', name: 'LÊ VĂN KHẢI', position: 'Bảo vệ - Fulltime', department: 'NGUYỄN ẢNH THỦ', renewDate: format(addDays(today, 55), 'yyyy-MM-dd'), startDate: '2021-11-20' }
    ];
  }, [employees]);

  const rccData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list = branch === 'ALL' ? mockEmployees : mockEmployees.filter(e => e.department === branch);

    const t30 = [];
    const t45 = [];
    const t60 = [];

    list.forEach(e => {
      const renew = parseDate(e.renewDate);
      if (!renew) return;
      const days = differenceInDays(renew, today);

      if (days < 0) {
        t30.push({ ...e, daysRemaining: days, status: 'EXPIRED' });
      } else if (days <= 30) {
        t30.push({ ...e, daysRemaining: days, status: 'URGENT' });
      } else if (days <= 45) {
        t45.push({ ...e, daysRemaining: days, status: 'WARNING' });
      } else if (days <= 60) {
        t60.push({ ...e, daysRemaining: days, status: 'INFO' });
      }
    });

    const sortByDays = (a, b) => a.daysRemaining - b.daysRemaining;
    return {
      t30: t30.sort(sortByDays),
      t45: t45.sort(sortByDays),
      t60: t60.sort(sortByDays),
    };
  }, [mockEmployees, branch]);


  return (
    <div className="space-y-4">
      <Section 
        title="Cảnh báo Đỏ (T-30)" 
        subtitle="Hạn chót tái ký hoặc cắt hợp đồng" 
        color="red" 
        employees={rccData.t30} 
      />
      <Section 
        title="Cảnh báo Cam (T-45)" 
        subtitle="Tiến hành đánh giá kết quả công việc" 
        color="amber" 
        employees={rccData.t45} 
      />
      <Section 
        title="Cảnh báo Xanh (T-60)" 
        subtitle="Rà soát danh sách hồ sơ chuẩn bị tái ký" 
        color="indigo" 
        employees={rccData.t60} 
      />

      {rccData.t30.length === 0 && rccData.t45.length === 0 && rccData.t60.length === 0 && (
        <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-xl font-bold text-slate-400">Hệ thống tái ký an toàn</p>
          <p className="text-sm font-medium text-slate-300 mt-2">Hiện tại không có nhân sự nào trong chu kỳ cảnh báo T-60 / T-45 / T-30</p>
        </div>
      )}

      {/* SUMMARY BOXES AT BOTTOM */}
      <div className="mt-12 pt-8 border-t border-slate-100">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
          Phần kiểm soát tái ký hợp đồng (RCC)
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-red-50 p-3 rounded-xl border border-red-100">
            <div className="text-[10px] font-black text-red-400 uppercase tracking-tight mb-1">Cảnh báo T-30</div>
            <div className="text-xl font-black text-red-600 leading-none">{rccData.t30.length} <span className="text-[10px] opacity-70">NS</span></div>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-tight mb-1">Cảnh báo T-45</div>
            <div className="text-xl font-black text-amber-600 leading-none">{rccData.t45.length} <span className="text-[10px] opacity-70">NS</span></div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-tight mb-1">Cảnh báo T-60</div>
            <div className="text-xl font-black text-indigo-600 leading-none">{rccData.t60.length} <span className="text-[10px] opacity-70">NS</span></div>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight mb-1">Tổng cộng</div>
            <div className="text-xl font-black text-slate-600 leading-none">{rccData.t30.length + rccData.t45.length + rccData.t60.length} <span className="text-[10px] opacity-70">NS</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
