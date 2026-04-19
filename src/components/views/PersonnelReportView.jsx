import React, { useMemo, useState } from 'react';
import { 
  Printer, 
  Eye, 
  X, 
  FileText, 
  BarChart3, 
  Users, 
  Briefcase, 
  GraduationCap, 
  CalendarClock, 
  AlertTriangle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2,
  ListFilter,
  EyeOff 
} from 'lucide-react';
import { formatName, formatBranch, formatPosition } from '../../utils/formatters';
import {
  differenceInMonths,
  differenceInDays,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
} from 'date-fns';

// Import RCC component from sub-directory
import RCC from './report/RCC';
import { generateMockEmployees, generateMockContracts } from '../../utils/mockGenerator';

function getRccStatus(renewDateStr) {
  const renew = parseDate(renewDateStr);
  if (!renew) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInDays(renew, today);
  if (days < 0) return 'QUÁ HẠN';
  if (days <= 30) return 'T-30';
  if (days <= 45) return 'T-45';
  if (days <= 60) return 'T-60';
  return 'AN TOÀN';
}

const REPORTS = [
  { id: 'RCC', label: 'Kiểm soát Tái ký Hợp đồng (RCC)', icon: <RefreshCw size={16} /> },
  { id: 'BRANCH', label: 'Báo cáo Nhân sự theo Chi nhánh', icon: <Users size={16} /> },
  { id: 'POSITION', label: 'Báo cáo Nhân sự theo Chức vụ', icon: <Briefcase size={16} /> },
  { id: 'SENIORITY', label: 'Báo cáo Nhân sự theo Thâm niên', icon: <BarChart3 size={16} /> },
  { id: 'EDUCATION', label: 'Báo cáo Nhân sự theo Bằng cấp', icon: <GraduationCap size={16} /> },
  { id: 'CONTRACT_EXPIRING', label: 'Hợp đồng sắp tới hạn (Thẻ)', icon: <CalendarClock size={16} /> },
  { id: 'GAP_ANALYSIS', label: 'Danh sách Hồ sơ còn thiếu', icon: <AlertTriangle size={16} /> },
  { id: 'TURNOVER_RATE', label: 'Tỷ lệ Biến động Nhân sự (Turnover)', icon: <BarChart3 size={16} /> }
];

function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  return d;
}

function getSeniorityMonths(startDate) {
  const start = parseDate(startDate);
  if (!start) return null;
  const months = differenceInMonths(new Date(), start);
  return Number.isFinite(months) ? Math.max(0, months) : null;
}

function formatSeniority(startDate) {
  const months = getSeniorityMonths(startDate);
  if (months === null) return '---';
  const years = Math.floor(months / 12);
  const remain = months % 12;
  if (years === 0) return `${remain} tháng`;
  if (remain === 0) return `${years} năm`;
  return `${years} năm ${remain} tháng`;
}

function seniorityBucket(months) {
  if (months === null) return 'Chưa có ngày vào';
  if (months < 6) return 'Dưới 6 tháng';
  if (months < 12) return '6–12 tháng';
  if (months < 36) return '1–3 năm';
  if (months < 60) return '3–5 năm';
  return 'Trên 5 năm';
}

function normalizeText(v) {
  return String(v || '').trim();
}

function canonicalPositionKey(v) {
  const t = normalizeText(v)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  if (t.includes('fulltime') || t.includes('full time')) return 'fulltime';
  if (t.includes('thinh gian') || t.includes('thinh giang')) return 'thinh giang';
  return t;
}

function canonicalPositionLabel(v) {
  const key = canonicalPositionKey(v);
  if (key === 'fulltime') return 'Bảo vệ - fulltime'; // Ví dụ theo rule
  if (key === 'thinh giang') return 'Giáo viên thỉnh giảng';
  return formatPosition(normalizeText(v)) || 'Chưa cập nhật';
}

// Using centralized formatters from utils

function normalizeEducation(v) {
  const t = normalizeText(v);
  if (!t) return 'Chưa cập nhật';
  return t
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .toUpperCase();
}

function _normalizeGender(v) {
  const t = normalizeText(v).toLowerCase();
  if (!t) return '---';
  if (/(^|\b)(mr|nam)\b/.test(t)) return 'Nam';
  if (/(^|\b)(ms|mrs|nữ|nu)\b/.test(t)) return 'Nữ';
  return normalizeText(v);
}

export default function PersonnelReportView({ employees = [], setEmployees, branches = [] }) {
  const [reportId, setReportId] = useState('BRANCH');
  const [branch, setBranch] = useState('ALL');
  const [q, setQ] = useState('');

  const [positionFilter, setPositionFilter] = useState('ALL');
  const [educationFilter, _setEducationFilter] = useState('ALL');
  const [seniorityFilter, setSeniorityFilter] = useState('ALL');
  const [rccFilter, setRccFilter] = useState('ALL');
  const [contractMonth, setContractMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(true);
  
  const [_expandedGroups, _setExpandedGroups] = useState({});

  const _toggleGroup = (groupId) => {
    _setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleGenerateMock = () => {
    if (window.confirm('Bạn có chắc chắn muốn nạp 300 nhân sự mẫu và 100 hồ sơ mẫu để demo?')) {
      const mockEmps = generateMockEmployees(300);
      const mockContracts = generateMockContracts(mockEmps, 100);
      
      setEmployees(mockEmps);
      localStorage.setItem('ace_hrm_employees_v1', JSON.stringify(mockEmps));
      localStorage.setItem('ace_contract_issue_log_v1', JSON.stringify(mockContracts));
      
      alert('Đã tạo thành công 300 nhân sự và 100 hồ sơ mẫu! Vui lòng tải lại trang hoặc chuyển tab để thấy thay đổi.');
    }
  };

  const filtered = useMemo(() => {
    let list = employees;
    if (branch !== 'ALL') {
      list = list.filter(e => e.department === branch);
    }
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(e =>
        (e.name || '').toLowerCase().includes(s) ||
        (e.position || '').toLowerCase().includes(s) ||
        (e.department || '').toLowerCase().includes(s)
      );
    }
    if (positionFilter !== 'ALL') {
      list = list.filter(e => canonicalPositionKey(e.position) === positionFilter);
    }
    if (educationFilter !== 'ALL') {
      list = list.filter(e => normalizeEducation(e.education) === educationFilter);
    }
    if (seniorityFilter !== 'ALL') {
      list = list.filter(e => seniorityBucket(getSeniorityMonths(e.startDate)) === seniorityFilter);
    }
    if (rccFilter !== 'ALL') {
      list = list.filter(e => getRccStatus(e.renewDate) === rccFilter);
    }
    return list;
  }, [employees, branch, q, positionFilter, educationFilter, seniorityFilter, rccFilter]);

  const positionOptions = useMemo(() => {
    const map = new Map();
    employees.forEach(e => {
      const key = canonicalPositionKey(e.position);
      if (!key) return;
      if (!map.has(key)) map.set(key, canonicalPositionLabel(e.position));
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [employees]);

  const _educationOptions = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      set.add(normalizeEducation(e.education));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const seniorityOptions = useMemo(() => {
    const buckets = new Set();
    employees.forEach(e => buckets.add(seniorityBucket(getSeniorityMonths(e.startDate))));
    const order = ['Dưới 6 tháng', '6–12 tháng', '1–3 năm', '3–5 năm', 'Trên 5 năm', 'Chưa có ngày vào'];
    return Array.from(buckets).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [employees]);

  const contractExpiringList = useMemo(() => {
    const [y, m] = contractMonth.split('-').map(Number);
    if (!y || !m) return [];
    const start = startOfMonth(new Date(y, m - 1, 1));
    const end = endOfMonth(start);

    return filtered
      .map(e => {
        const renew = parseDate(e.renewDate);
        return { e, renew };
      })
      .filter(x => x.renew && x.renew >= start && x.renew <= end)
      .sort((a, b) => a.renew - b.renew);
  }, [filtered, contractMonth]);

  const _positionSummary = useMemo(() => {
    const map = new Map();
    filtered.forEach(e => {
      const key = canonicalPositionLabel(e.position);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([k, v]) => ({ key: k, count: v }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }, [filtered]);

  const _senioritySummary = useMemo(() => {
    const map = new Map();
    filtered.forEach(e => {
      const key = seniorityBucket(getSeniorityMonths(e.startDate));
      map.set(key, (map.get(key) || 0) + 1);
    });
    const order = ['Dưới 6 tháng', '6–12 tháng', '1–3 năm', '3–5 năm', 'Trên 5 năm', 'Chưa có ngày vào'];
    return Array.from(map.entries())
      .map(([k, v]) => ({ key: k, count: v }))
      .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }, [filtered]);

  const gapAnalysisList = useMemo(() => {
    return filtered.filter(e => {
      return e.checklist_status === false || e.checklist_status === 'FALSE' || !e.pdf_url || e.document_status === 'MISSING';
    }).map(e => ({
      ...e,
      missingReason: (!e.pdf_url) ? 'Thiếu Scan PDF' : 'Thiếu Checklist Gốc'
    }));
  }, [filtered]);

  const turnoverStats = useMemo(() => {
    let totalResignedGlobal = 0;
    const positionMap = new Map();

    filtered.forEach(e => {
      const pos = canonicalPositionLabel(e.position);
      const isResigned = e.status === 'RESIGNED' || e.status === 'APPROVED_RESIGNED' || !!e.resignedDate;

      if (!positionMap.has(pos)) {
        positionMap.set(pos, { total: 0, resigned: 0 });
      }

      const stats = positionMap.get(pos);
      stats.total += 1;
      
      if (isResigned) {
        stats.resigned += 1;
        totalResignedGlobal += 1;
      }
    });

    const globalTotal = filtered.length;
    const globalRate = globalTotal > 0 ? ((totalResignedGlobal / globalTotal) * 100).toFixed(1) : 0;

    const byPosition = Array.from(positionMap.entries()).map(([pos, stats]) => {
      const rate = stats.total > 0 ? ((stats.resigned / stats.total) * 100).toFixed(1) : 0;
      return {
        position: pos,
        total: stats.total,
        resigned: stats.resigned,
        rate: rate
      };
    }).sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate) || b.resigned - a.resigned);

    return {
      rate: globalRate,
      totalResigned: totalResignedGlobal,
      byPosition
    };
  }, [filtered]);

  const _educationSummary = useMemo(() => {
    const map = new Map();
    filtered.forEach(e => {
      const key = normalizeEducation(e.education);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([k, v]) => ({ key: k, count: v }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }, [filtered]);

  const groupedByPosition = useMemo(() => {
    const map = new Map();
    filtered.forEach(e => {
      const key = canonicalPositionLabel(e.position);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return Array.from(map.entries())
      .map(([key, list]) => ({
        position: key,
        employees: list
          .slice()
          .sort((a, b) => (a.department || '').localeCompare(b.department || '') || (a.name || '').localeCompare(b.name || '')),
      }))
      .sort((a, b) => b.employees.length - a.employees.length || a.position.localeCompare(b.position));
  }, [filtered]);

  const reportTitle = useMemo(() => {
    const base = REPORTS.find(r => r.id === reportId)?.label || 'Báo cáo nhân sự';
    if (branch === 'ALL') return base;
    return `${base} - ${branch}`;
  }, [reportId, branch]);

  const handlePrint = () => window.print();

  // ---------------- REPORT BODY (THE PRINTABLE AREA) ----------------
  const reportBody = (
    <div className="p-6 lg:p-8 min-w-[700px] w-full max-w-none mx-auto bg-white print:p-0 print:shadow-none print:bg-transparent">
      
      {/* Report Header Reduced Size */}
      <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-none">{reportTitle}</h1>
          <p className="text-[9px] font-black text-[#E11920] tracking-[0.2em] uppercase mt-1.5">ACE HRM SYSTEM</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-900 leading-none">{format(new Date(), 'dd/MM/yyyy')}</p>
          <div className="mt-1 inline-block px-2 py-0.5 bg-slate-50 rounded border border-slate-100">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tổng NV: <span className="text-indigo-600 ml-1">{filtered.length}</span></p>
          </div>
        </div>
      </div>

      {reportId === 'RCC' && (
        <RCC employees={employees} initialBranch={branch} />
      )}

      {showDetail && reportId === 'BRANCH' && (
        <div className="bg-white rounded-[12px] border border-slate-100 overflow-hidden print:border-slate-300 print:rounded-none shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 print:bg-slate-100 print:border-slate-300">
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4 w-12 text-center">STT</th>
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Họ và Tên</th>
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Chức vụ</th>
                {branch === 'ALL' && <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Chi nhánh</th>}
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Ngày vào</th>
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Thâm niên</th>
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Bằng cấp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 print:divide-slate-200">
              {filtered.map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 text-[11px] font-bold text-slate-400 text-center">{idx + 1}</td>
                  <td className="py-2.5 px-4 text-xs font-bold text-slate-800">{formatName(emp.name)}</td>
                  <td className="py-2.5 px-4 text-[11px] font-semibold text-indigo-600 uppercase-none">{formatPosition(emp.position)}</td>
                  {branch === 'ALL' && <td className="py-2.5 px-4 text-[11px] font-semibold text-slate-600 uppercase-none">{formatBranch(emp.department)}</td>}
                  <td className="py-2.5 px-4 text-[11px] text-slate-600">{emp.startDate || '---'}</td>
                  <td className="py-2.5 px-4 text-[11px] font-semibold text-emerald-600">{formatSeniority(emp.startDate)}</td>
                  <td className="py-2.5 px-4 text-[11px] font-semibold text-slate-600">{normalizeEducation(emp.education)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(reportId === 'POSITION' || reportId === 'SENIORITY' || reportId === 'EDUCATION') && (() => {
        let groupedData = [];
        if (reportId === 'POSITION') {
           groupedData = groupedByPosition.map(g => ({ label: g.position, employees: g.employees }));
        } else if (reportId === 'SENIORITY') {
           const map = new Map();
           filtered.forEach(e => {
             const key = seniorityBucket(getSeniorityMonths(e.startDate));
             if (!map.has(key)) map.set(key, []);
             map.get(key).push(e);
           });
           const order = ['Dưới 6 tháng', '6–12 tháng', '1–3 năm', '3–5 năm', 'Trên 5 năm', 'Chưa có ngày vào'];
           groupedData = Array.from(map.entries())
             .map(([key, list]) => ({ label: key, employees: list }))
             .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
        } else if (reportId === 'EDUCATION') {
           const map = new Map();
           filtered.forEach(e => {
             const key = normalizeEducation(e.education);
             if (!map.has(key)) map.set(key, []);
             map.get(key).push(e);
           });
           groupedData = Array.from(map.entries())
             .map(([key, list]) => ({ label: key, employees: list }))
             .sort((a, b) => b.employees.length - a.employees.length || a.label.localeCompare(b.label));
        }

        return (
          showDetail && (
            <div className="bg-white rounded-[12px] border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4 w-12 text-center">STT</th>
                    <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Họ và Tên</th>
                    <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Chức vụ</th>
                    {branch === 'ALL' && <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Chi nhánh</th>}
                    <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Ngày vào</th>
                    <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Thâm niên</th>
                    <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Bằng cấp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groupedData.map((group) => (
                    <React.Fragment key={group.label}>
                      <tr className="bg-slate-50/50">
                        <td colSpan={branch === 'ALL' ? 7 : 6} className="py-2.5 px-4 border-y border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">{group.label}</span>
                            <span className="text-[9px] font-black text-indigo-500 bg-white px-2 py-0.5 rounded border border-indigo-100">{group.employees.length} NHÂN SỰ</span>
                          </div>
                        </td>
                      </tr>
                      {group.employees.map((emp, idx) => (
                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 text-[11px] font-bold text-slate-400 text-center">{idx + 1}</td>
                          <td className="py-2.5 px-4 text-xs font-bold text-slate-800">{formatName(emp.name)}</td>
                          <td className="py-2.5 px-4 text-[11px] font-semibold text-indigo-600 uppercase-none">{formatPosition(emp.position)}</td>
                          {branch === 'ALL' && <td className="py-2.5 px-4 text-[11px] font-semibold text-slate-600 uppercase-none">{formatBranch(emp.department)}</td>}
                          <td className="py-2.5 px-4 text-[11px] text-slate-600">{emp.startDate || '---'}</td>
                          <td className="py-2.5 px-4 text-[11px] font-semibold text-emerald-600">{formatSeniority(emp.startDate)}</td>
                          <td className="py-2.5 px-4 text-[11px] font-semibold text-slate-600">{normalizeEducation(emp.education)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {groupedData.length === 0 && (
                    <tr>
                      <td colSpan={branch === 'ALL' ? 7 : 6} className="py-12 text-center">
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Không có dữ liệu phù hợp</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        );
      })()}

      {reportId === 'CONTRACT_EXPIRING' && (
        <div className="bg-white rounded-[12px] border border-slate-100 overflow-hidden print:border-slate-300 print:rounded-none shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 print:bg-slate-100 print:border-slate-300">
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4 w-12 text-center">STT</th>
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Họ và Tên</th>
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Chức vụ</th>
                {branch === 'ALL' && <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Chi nhánh</th>}
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Ngày tái ký</th>
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Ngày ký HĐ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 print:divide-slate-200">
              {contractExpiringList.map((row, idx) => (
                <tr key={row.e.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 text-[11px] font-bold text-slate-400 text-center">{idx + 1}</td>
                  <td className="py-2.5 px-4 text-xs font-bold text-slate-800">{formatName(row.e.name)}</td>
                  <td className="py-2.5 px-4 text-[11px] font-semibold text-indigo-600 uppercase-none">{formatPosition(row.e.position)}</td>
                  {branch === 'ALL' && <td className="py-2.5 px-4 text-[11px] font-semibold text-slate-600 uppercase-none">{formatBranch(row.e.department)}</td>}
                  <td className="py-2.5 px-4 text-[11px] font-bold text-rose-600">{row.e.renewDate || '---'}</td>
                  <td className="py-2.5 px-4 text-[11px] text-slate-500">{row.e.contractDate || '---'}</td>
                </tr>
              ))}
              {contractExpiringList.length === 0 && (
                <tr>
                  <td colSpan={branch === 'ALL' ? 6 : 5} className="py-10 px-4 text-center">
                    <CalendarClock size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-400 font-bold text-[11px]">Không có hợp đồng tới hạn tháng {contractMonth}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {reportId === 'GAP_ANALYSIS' && (
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            <AlertTriangle size={16} className="text-rose-600" />
            <div className="text-[11px] font-bold text-slate-800">
              Thiếu hồ sơ gốc / PDF: <span className="text-rose-600 font-black ml-1">{gapAnalysisList.length}</span>
            </div>
          </div>
          <div className="bg-white rounded-[12px] border border-slate-100 overflow-hidden print:border-slate-300 print:rounded-none shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 print:bg-slate-100 print:border-slate-300">
                  <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4 w-12 text-center">STT</th>
                  <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Họ và Tên</th>
                  <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Chi nhánh</th>
                  <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">Chi tiết thiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 print:divide-slate-200">
                {gapAnalysisList.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-[11px] font-bold text-slate-400 text-center">{idx + 1}</td>
                    <td className="py-2.5 px-4 text-xs font-bold text-slate-800">{formatName(row.name)}</td>
                    <td className="py-2.5 px-4 text-[11px] font-semibold text-slate-600 uppercase-none">{formatBranch(row.department)}</td>
                    <td className="py-2.5 px-4 text-[11px] font-bold text-rose-600">
                      {row.missingReason} {row.missingDocTypes && <span className="text-rose-400 ml-1">({row.missingDocTypes})</span>}
                    </td>
                  </tr>
                ))}
                {gapAnalysisList.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-10 px-4 text-center">
                       <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-2" />
                       <p className="text-emerald-600 font-bold text-[11px]">Tuân thủ 100% hồ sơ gốc!</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportId === 'TURNOVER_RATE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-white border border-slate-100 rounded-[16px] shadow-sm flex flex-col justify-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tỷ lệ biến động (Turnover)</div>
              <div className="text-3xl font-black text-rose-600 tracking-tighter">{turnoverStats.rate}%</div>
            </div>
            <div className="p-5 bg-white border border-slate-100 rounded-[16px] shadow-sm flex flex-col justify-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng nhân sự nghỉ</div>
              <div className="text-3xl font-black text-slate-800 tracking-tighter">{turnoverStats.totalResigned}</div>
            </div>
          </div>
          
          <div className="flex justify-center lg:justify-start">
            <div className="bg-white rounded-[12px] border border-slate-100 overflow-hidden print:border-slate-300 print:rounded-none inline-block w-full shadow-sm">
              <table className="text-left border-collapse w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 print:bg-slate-100 print:border-slate-300">
                    <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4 w-12 text-center">STT</th>
                    <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4">VỊ TRÍ / CHỨC VỤ</th>
                    <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4 w-28 text-center">SỐ LƯỢNG NV</th>
                    <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4 w-28 text-center">SỐ LƯỢNG NGHỈ</th>
                    <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-2.5 px-4 w-28 text-center">TỶ LỆ NGHỈ VIỆC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 print:divide-slate-200">
                  {turnoverStats.byPosition.map((p, idx) => (
                    <tr key={p.position} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 text-[11px] font-bold text-slate-400 text-center">{idx + 1}</td>
                      <td className="py-2.5 px-4 text-xs font-bold text-slate-800">{formatPosition(p.position)}</td>
                      <td className="py-2.5 px-4 text-xs font-black text-slate-600 text-center">{p.total}</td>
                      <td className="py-2.5 px-4 text-xs font-black text-rose-600 text-center">{p.resigned}</td>
                      <td className="py-2.5 px-4 text-xs font-black text-orange-600 text-center">{p.rate}%</td>
                    </tr>
                  ))}
                  {turnoverStats.byPosition.length === 0 && (
                     <tr>
                       <td colSpan="5" className="py-8 text-center text-[11px] font-bold text-slate-400">Không có dữ liệu</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  const openReview = () => setIsReviewOpen(true);
  const closeReview = () => setIsReviewOpen(false);

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7] pt-2 px-4 pb-4 lg:pt-3 lg:px-6 lg:pb-6 gap-6 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Báo cáo nhân sự</h1>
      </div>
      
      {/* COMPACT FILTER BAR - TOP - 2 ROWS MAXIMUM */}
      <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-2.5 shrink-0 print:hidden">
        <div className="grid grid-cols-2 lg:grid-cols-5 xl:grid-cols-8 gap-2">
          
          {/* SLOT 1: Header + Icons Preview & PDF */}
          <div className="col-span-2 xl:col-span-1 flex items-center justify-between bg-slate-50 rounded-lg border border-slate-100 px-3 h-9">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest hidden xl:inline-block">Bộ Lọc</span>
            <div className="flex items-center gap-2 w-full xl:w-auto justify-center xl:justify-end">
              <button onClick={openReview} title="Xem trước báo cáo" className="text-slate-400 hover:text-indigo-600 transition-colors bg-white p-1 rounded shadow-sm border border-slate-100">
                <Eye size={14} />
              </button>
              <button 
                onClick={() => setShowDetail(!showDetail)} 
                title={showDetail ? "Ẩn danh sách chi tiết" : "Hiện danh sách chi tiết"} 
                className={`transition-colors p-1 rounded shadow-sm border ${showDetail ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-slate-400 bg-white border-slate-100 hover:text-indigo-600'}`}
              >
                {showDetail ? <ListFilter size={14} /> : <EyeOff size={14} />}
              </button>
              <button onClick={handlePrint} title="In file PDF" className="text-slate-400 hover:text-indigo-600 transition-colors bg-white p-1 rounded shadow-sm border border-slate-100">
                <Printer size={14} />
              </button>
              <button 
                onClick={handleGenerateMock} 
                title="Mock 300 NS" 
                className="text-amber-500 hover:text-amber-600 transition-colors bg-amber-50 p-1 rounded shadow-sm border border-amber-100"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
              </button>
            </div>
          </div>

          {/* SLOT 2: Report Type */}
          <select value={reportId} onChange={e => setReportId(e.target.value)} className="h-9 w-full bg-slate-50 border border-slate-100 rounded-lg px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400">
            {REPORTS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>

          {/* SLOT 3: Branch */}
          <select value={branch} onChange={e => setBranch(e.target.value)} className="h-9 w-full bg-slate-50 border border-slate-100 rounded-lg px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400">
            <option value="ALL">Tất cả Chi nhánh</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          {/* SLOT 4: Search */}
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm tên..." className="col-span-2 lg:col-span-1 h-9 w-full bg-slate-50 border border-slate-100 rounded-lg px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 placeholder:text-slate-400" />

          {/* SLOT 5: Month */}
          <div className="relative flex items-center h-9 bg-slate-50 border border-slate-100 rounded-lg px-2 focus-within:border-indigo-400">
             <input type="month" value={contractMonth} onChange={e => setContractMonth(e.target.value)} className="bg-transparent text-[11px] font-bold text-slate-700 outline-none w-full" />
          </div>

          {/* SLOT 6: Position */}
          <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)} className="h-9 w-full bg-slate-50 border border-slate-100 rounded-lg px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400">
            <option value="ALL">Tất cả Chức vụ</option>
            {positionOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>

          {/* SLOT 7: Seniority */}
          <select value={seniorityFilter} onChange={e => setSeniorityFilter(e.target.value)} className="h-9 w-full bg-slate-50 border border-slate-100 rounded-lg px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400">
            <option value="ALL">Tất cả Thâm niên</option>
            {seniorityOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* SLOT 8: RCC Status */}
          <select value={rccFilter} onChange={e => setRccFilter(e.target.value)} className="h-9 w-full bg-slate-50 border border-slate-100 rounded-lg px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400">
            <option value="ALL">Tất cả Hạn tái ký</option>
            <option value="T-60">T-60 (Còn ≤ 60 ngày)</option>
            <option value="T-45">T-45 (Còn ≤ 45 ngày)</option>
            <option value="T-30">T-30 (Còn ≤ 30 ngày)</option>
            <option value="QUÁ HẠN">Đã quá hạn</option>
            <option value="AN TOÀN">An toàn</option>
          </select>

        </div>
      </div>

      {/* MAIN REPORT AREA */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto custom-scrollbar print:border-none print:shadow-none print:bg-white print:overflow-visible">
        {reportBody}
      </div>

      {/* MODAL XEM TRƯỚC (PREVIEW OVERLAY) */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-6 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1500px] h-full max-h-[95vh] overflow-hidden flex flex-col border border-white/20">
            
            {/* Header Modal */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <div className="text-sm font-black text-slate-900 leading-tight">Xem trước Bản in</div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">{reportTitle}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all font-bold text-[11px] uppercase tracking-widest shadow-sm"
                >
                  <Printer size={14} /> In PDF
                </button>
                <button
                  onClick={closeReview}
                  className="w-8 h-8 bg-slate-50 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center text-slate-400 border border-slate-100"
                  title="Đóng"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {/* Nội dung báo cáo trong Modal */}
            <div className="flex-1 overflow-auto bg-slate-100 custom-scrollbar p-4">
               <div className="shadow-md shadow-slate-200 rounded-[16px] overflow-hidden border border-slate-200">
                  {reportBody}
               </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
