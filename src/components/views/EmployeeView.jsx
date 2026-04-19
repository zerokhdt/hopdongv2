import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Search, UserPlus, Mail, Phone, MapPin, Briefcase, Calendar, Trash2, Edit2, MoreVertical, X, Printer, Camera, History, FileText, BadgeCheck, ShieldCheck, Download, Award, User, CreditCard, GraduationCap, Building2, Filter, ChevronDown } from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';
import { importEmployeesFromCsv, mergeEmployees } from '../../utils/employeeImport';
import { SEED_DATA } from '../../data/employees_seed';
import { apiFetch } from '../../utils/api.js';
import { formatName, formatBranch, formatPosition } from '../../utils/formatters';

const FilterDropdown = ({ type, options, activeValue, onSelect }) => (
  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
    <div 
      className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${!activeValue ? 'text-blue-600 font-bold' : 'text-gray-700'}`}
      onClick={() => onSelect(null)}
    >
      Tất cả
      {!activeValue && <BadgeCheck size={14} />}
    </div>
    <div className="h-px bg-gray-100 my-1" />
    <div className="max-h-48 overflow-y-auto">
      {options.map(opt => (
        <div 
          key={opt}
          className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${activeValue === opt ? 'text-blue-600 font-bold' : 'text-gray-700'}`}
          onClick={() => onSelect(opt)}
        >
          <span className="truncate">{type === 'department' ? formatBranch(opt) : formatPosition(opt)}</span>
          {activeValue === opt && <BadgeCheck size={14} />}
        </div>
      ))}
    </div>
  </div>
);

// Helper for seniority calculation
const calculateSeniority = (startDate) => {
  if (!startDate) return '0 năm 0 tháng';
  try {
    const start = parseISO(startDate);
    const now = new Date();
    const years = differenceInYears(now, start);
    const months = differenceInMonths(now, start) % 12;
    
    if (years === 0 && months === 0) {
      const days = differenceInDays(now, start);
      return `${days} ngày`;
    }
    
    return `${years} năm ${months} tháng`;
  } catch (_e) {
    return 'N/A';
  }
};

export default function EmployeeView({ employees, setEmployees, userRole, branchId, movements = [], onCreateContract: _onCreateContract }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isImportingEmployees, setIsImportingEmployees] = useState(false);
  const [showImportRequests, setShowImportRequests] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    department: null,
    position: null
  });
  const [_openFilter, setOpenFilter] = useState(null); // 'department' or 'position'

  const isAdmin = userRole === 'admin';
  useEffect(() => {
    if (!isAdmin) return;
    try {
      const v = localStorage.getItem('ace_open_employee_requests');
      if (v === '1') {
        localStorage.removeItem('ace_open_employee_requests');
        setShowImportRequests(true);
      }
    } catch (_e) {}
  }, [isAdmin]);

  const normalizeKey = (v) => String(v || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.position || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const empDept = normalizeKey(emp.department);
      const empPos = normalizeKey(emp.position);
      
      const filterDept = activeFilters.department ? normalizeKey(activeFilters.department) : null;
      const filterPos = activeFilters.position ? normalizeKey(activeFilters.position) : null;

      const matchesDept = !filterDept || empDept === filterDept;
      const matchesPos = !filterPos || empPos === filterPos;

      let basicCheck = matchesSearch && matchesDept && matchesPos;
      
      if (!isAdmin && branchId) {
        return basicCheck && normalizeKey(emp.department) === normalizeKey(branchId);
      }
      return basicCheck;
    });
  }, [employees, searchTerm, activeFilters, isAdmin, branchId]);

  const _uniqueDepartments = useMemo(() => {
    const seen = new Set();
    return employees
      .map(emp => emp.department)
      .filter(d => d && !seen.has(normalizeKey(d)) && seen.add(normalizeKey(d)))
      .sort();
  }, [employees]);

  const _uniquePositions = useMemo(() => {
    const seen = new Set();
    return employees
      .map(emp => emp.position)
      .filter(p => p && !seen.has(normalizeKey(p)) && seen.add(normalizeKey(p)))
      .sort();
  }, [employees]);

  // Handle clicking outside to close filter
  const filterRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const _handleDelete = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7] p-4 lg:p-6 overflow-hidden print:bg-white print:p-0">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Danh sách nhân sự</h1>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setShowImportRequests(true)}
              className="px-4 py-2 bg-white border border-[#37352f]/15 text-[#37352f]/80 rounded-lg hover:bg-[#efedf0] transition-all shadow-sm flex items-center gap-2 font-semibold text-sm"
            >
              <ShieldCheck size={18} /> Yêu cầu Cập nhật
            </button>
          )}
          <button
            onClick={() => setIsImportingEmployees(true)}
            className="px-4 py-2 bg-white border border-[#37352f]/15 text-[#37352f]/80 rounded-lg hover:bg-[#efedf0] transition-all shadow-sm flex items-center gap-2 font-semibold text-sm"
          >
            <Download size={18} /> Nhập CSV
          </button>
          {isAdmin && (
            <button 
              onClick={() => setIsAddingEmployee(true)}
              className="px-4 py-2 bg-[#37352f] text-white rounded-lg hover:bg-[#37352f]/90 transition-all shadow-sm flex items-center gap-2 font-bold text-sm"
            >
              <UserPlus size={18} /> Thêm Nhân sự mới
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 flex-1 flex flex-col overflow-hidden print:border-none print:shadow-none">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Tìm kiếm nhân viên (tên, email, chức vụ)..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-400 transition-colors text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {(activeFilters.department || activeFilters.position) && (
            <button 
              onClick={() => setActiveFilters({ department: null, position: null })}
              className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <X size={14} /> Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-3 px-6 w-12 text-center">STT</th>
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-3 px-6">Họ và Tên</th>
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-3 px-6">Chi nhánh</th>
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-3 px-6">Chức danh</th>
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-3 px-6">Thâm niên</th>
                <th className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-3 px-6 whitespace-nowrap">Ngày vào làm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEmployees.map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
                  <td className="py-3 px-6 text-[11px] font-bold text-slate-400 text-center">{idx + 1}</td>
                  <td className="py-3 px-6">
                    <div className="text-xs font-bold text-slate-800">{formatName(emp.name)}</div>
                    <div className="text-[10px] text-slate-400 font-medium">ID: {emp.id}</div>
                  </td>
                  <td className="py-3 px-6 text-[11px] font-semibold text-slate-600 uppercase-none">
                    {formatBranch(emp.department)}
                  </td>
                  <td className="py-3 px-6 text-[11px] font-semibold text-indigo-600 uppercase-none">
                    {formatPosition(emp.position)}
                  </td>
                  <td className="py-3 px-6 text-[11px] font-semibold text-emerald-600">
                    {calculateSeniority(emp.startDate)}
                  </td>
                  <td className="py-3 px-6 text-[11px] text-slate-600 whitespace-nowrap uppercase tracking-tighter">
                    {emp.startDate || '---'}
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                    Không tìm thấy nhân viên nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for adding/editing/viewing */}
      {(isAddingEmployee || selectedEmployee) && (
        <EmployeeProfileModal 
          employee={selectedEmployee} 
          userRole={userRole}
          movements={movements}
          onClose={() => { setIsAddingEmployee(false); setSelectedEmployee(null); }}
          onSave={(data) => {
            if (selectedEmployee) {
              setEmployees(prev => prev.map(e => e.id === selectedEmployee.id ? { ...e, ...data } : e));
            } else {
              const maxId = employees.reduce((max, emp) => {
                const num = parseInt(emp.id);
                return isNaN(num) ? max : Math.max(max, num);
              }, 0);
              const nextId = (maxId + 1).toString().padStart(4, '0');
              setEmployees(prev => [...prev, { ...data, id: nextId }]);
            }
            setIsAddingEmployee(false);
            setSelectedEmployee(null);
          }}
        />
      )}

      {isImportingEmployees && (
        <EmployeeCsvImportModal
          existingEmployees={employees}
          isAdmin={isAdmin}
          branchId={branchId}
          onClose={() => setIsImportingEmployees(false)}
          onApply={(merged) => {
            setEmployees(merged);
            setIsImportingEmployees(false);
          }}
        />
      )}

      {showImportRequests && isAdmin && (
        <EmployeeImportRequestsModal
          existingEmployees={employees}
          setEmployees={setEmployees}
          onClose={() => setShowImportRequests(false)}
        />
      )}
    </div>
  );
}

function EmployeeCsvImportModal({ existingEmployees, isAdmin, branchId, onClose, onApply }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [parsedEmployees, setParsedEmployees] = useState([]);
  const [parsedCount, setParsedCount] = useState(0);
  const [parseErrors, setParseErrors] = useState([]);
  const [replaceAll, setReplaceAll] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [error, setError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [csvText, setCsvText] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const applyBranchOverride = (list) => {
    if (isAdmin) return list;
    const b = String(branchId || '').trim();
    if (!b) return list;
    return (Array.isArray(list) ? list : []).map(e => ({ ...e, department: b }));
  };

  const decodeBest = (buf) => {
    const decoders = [
      { name: 'utf-8', dec: () => new TextDecoder('utf-8').decode(buf) },
      { name: 'windows-1258', dec: () => new TextDecoder('windows-1258').decode(buf) },
      { name: 'windows-1252', dec: () => new TextDecoder('windows-1252').decode(buf) },
      { name: 'utf-16le', dec: () => new TextDecoder('utf-16le').decode(buf) },
    ];

    const scoreText = (t) => {
      const s = String(t || '');
      const bad = (s.match(/\uFFFD/g) || []).length * 8 + (s.match(/Ã./g) || []).length * 4 + (s.match(/ï»¿/g) || []).length * 6;
      const good = (s.match(/[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/gi) || []).length;
      const headerBoost = /ma\s*nv|mã\s*nv/i.test(s) ? 10 : 0;
      return good + headerBoost - bad;
    };

    let best = { text: new TextDecoder('utf-8').decode(buf), score: -Infinity };
    for (const d of decoders) {
      let t = '';
      try {
        t = d.dec();
      } catch {
        continue;
      }
      const score = scoreText(t);
      if (score > best.score) best = { text: t, score };
    }
    return best.text.replace(/^\uFEFF/, '').replace(/^ï»¿/, '');
  };

  const decodeFile = async (file) => {
    const buf = await file.arrayBuffer();
    return decodeBest(buf);
  };

  const handlePickFile = () => {
    if (fileRef.current) fileRef.current.click();
  };

  const handleFile = async (file) => {
    setError('');
    setSyncMessage('');
    setParsedEmployees([]);
    setParsedCount(0);
    setParseErrors([]);
    setSelectedIds(new Set());
    if (!file) return;
    setBusy(true);
    try {
      const text = await decodeFile(file);
      setCsvText(text);
      const parsed = importEmployeesFromCsv(text);
      if (!parsed.ok) {
        setError(parsed.error || 'Không đọc được CSV');
        return;
      }
      const list = applyBranchOverride(parsed.employees);
      setParsedEmployees(list);
      setParsedCount(list.length);
      setSelectedIds(new Set(list.map(e => e.id)));
      setParseErrors(parsed.errors || []);
    } catch (_e) {
      setError(_e?.message || String(_e));
    } finally {
      setBusy(false);
    }
  };

  const handleParseText = () => {
    setError('');
    setSyncMessage('');
    setParsedEmployees([]);
    setParsedCount(0);
    setParseErrors([]);
    setSelectedIds(new Set());
    const text = String(csvText || '').trim();
    if (!text) {
      setError('Chưa có nội dung CSV để phân tích.');
      return;
    }
    const parsed = importEmployeesFromCsv(text);
    if (!parsed.ok) {
      setError(parsed.error || 'Không đọc được CSV');
      return;
    }
    const list = applyBranchOverride(parsed.employees);
    setParsedEmployees(list);
    setParsedCount(list.length);
    setSelectedIds(new Set(list.map(e => e.id)));
    setParseErrors(parsed.errors || []);
  };

  const mergeResult = useMemo(() => {
    if (!parsedEmployees || parsedEmployees.length === 0) return null;
    const selected = parsedEmployees.filter(e => selectedIds.has(e.id));
    if (selected.length === 0) return null;
    return mergeEmployees(existingEmployees, selected, { replaceAll, overwrite: overwriteExisting });
  }, [existingEmployees, overwriteExisting, parsedEmployees, replaceAll, selectedIds]);

  const applyNow = () => {
    if (!mergeResult || !mergeResult.merged) return;
    onApply(mergeResult.merged);
  };

  const syncToFirebase = async () => {
    if (!mergeResult) return;
    setError('');
    setSyncMessage('');
    setSyncBusy(true);
    try {
      if (!isAdmin) {
        setError('Chỉ tài khoản Admin được phép lưu nhân sự lên Firebase.');
        return;
      }
      const token = String(localStorage.getItem('token') || '').trim();
      if (!token) {
        setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.');
        return;
      }
      const selected = (parsedEmployees || []).filter(e => selectedIds.has(e.id));
      const resp = await apiFetch('/api/employees/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employees: selected,
          replaceAll,
          overwriteExisting,
        }),
      });
      const text = await resp.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
      if (!resp.ok || !data?.ok) {
        setError(data?.message || 'Lưu Firebase thất bại.');
        return;
      }
      setSyncMessage(`Đã lưu Firebase: ${data.employees} nhân viên · ${data.branches} chi nhánh`);
      onApply(mergeResult.merged);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSyncBusy(false);
    }
  };

  const sendImportRequest = async () => {
    if (!mergeResult) return;
    setError('');
    setSyncMessage('');
    setRequestBusy(true);
    try {
      if (isAdmin) {
        setError('Admin không cần gửi yêu cầu.');
        return;
      }
      const token = String(localStorage.getItem('token') || '').trim();
      if (!token) {
        setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.');
        return;
      }
      const selected = (parsedEmployees || []).filter(e => selectedIds.has(e.id)).map(e => ({ ...e, department: String(branchId || e.department || '').trim() }));
      const resp = await apiFetch('/api/employees/import-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employees: selected,
          overwriteExisting,
        }),
      });
      const text = await resp.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
      if (!resp.ok || !data?.ok) {
        setError(data?.message || 'Gửi yêu cầu thất bại.');
        return;
      }
      setSyncMessage(`Đã gửi yêu cầu cập nhật (${data.employees} nhân viên). Chờ Admin duyệt.`);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setRequestBusy(false);
    }
  };

  const preview = parsedEmployees || [];

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden mx-auto my-6 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-[#37352f]">Import nhân viên từ CSV</div>
            <div className="text-sm text-[#37352f]/40 font-bold uppercase tracking-widest">Cập nhật danh sách nhân sự</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white border border-[#37352f]/15 text-[#37352f]/80 font-bold hover:bg-[#efedf0] transition-colors text-sm">
              Hủy
            </button>
            {isAdmin && (
              <button disabled={!mergeResult || busy || syncBusy} onClick={syncToFirebase} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-black hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {syncBusy ? 'ĐANG LƯU…' : 'LƯU FIREBASE'}
              </button>
            )}
            {!isAdmin && (
              <button disabled={!mergeResult || busy || syncBusy || requestBusy} onClick={sendImportRequest} className="px-4 py-2 rounded-lg bg-amber-600 text-white font-black hover:bg-amber-700 disabled:opacity-50 transition-colors">
                {requestBusy ? 'ĐANG GỬI…' : 'GỬI YÊU CẦU'}
              </button>
            )}
            <button disabled={!mergeResult || busy || syncBusy} onClick={applyNow} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-black hover:bg-blue-700 disabled:opacity-50 transition-colors">
              Áp dụng local
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-auto flex-1">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files && e.target.files[0])} />
              <button onClick={handlePickFile} className="px-4 py-2 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-900 transition-colors">
                Chọn file CSV
              </button>
              <button onClick={handleParseText} disabled={busy} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors">
                Phân tích nội dung dán
              </button>
              <div className="text-sm text-slate-600 font-semibold">
                {busy ? 'Đang đọc file…' : (parsedCount > 0 ? `Đã đọc ${parsedCount} dòng` : 'Chưa chọn file')}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={replaceAll} onChange={(e) => setReplaceAll(e.target.checked)} disabled={!isAdmin} />
                Thay thế toàn bộ
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={overwriteExisting} onChange={(e) => setOverwriteExisting(e.target.checked)} disabled={replaceAll} />
                Ghi đè nhân viên trùng Mã NV
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-xl text-sm font-bold text-red-600">
              {error}
            </div>
          )}
          {syncMessage && (
            <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl text-sm font-bold text-emerald-700">
              {syncMessage}
            </div>
          )}

          <div className="border border-[#37352f]/10 rounded-xl overflow-hidden">
            <div className="bg-[#f7f6f3] px-4 py-2 text-sm font-bold text-[#37352f]/40 uppercase tracking-widest">Dán CSV (tuỳ chọn)</div>
            <div className="p-4">
              <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} className="w-full h-32 px-3 py-2 rounded-lg border border-[#37352f]/15 text-sm font-mono outline-none focus:border-blue-400" placeholder="Dán toàn bộ nội dung CSV vào đây rồi bấm “Phân tích nội dung dán”" />
            </div>
          </div>

          {mergeResult && (
            <div className="bg-[#f7f6f3]/50 border border-[#37352f]/5 px-4 py-3 rounded-xl">
              <div className="text-sm font-bold text-[#37352f] mb-2">Kết quả import</div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-white border border-[#37352f]/10 rounded-lg p-3">
                  <div className="text-sm font-bold text-[#37352f]/40 uppercase">Thêm mới</div>
                  <div className="text-[15px] font-bold text-[#37352f]">{mergeResult.stats.added}</div>
                </div>
                <div className="bg-white border border-[#37352f]/10 rounded-lg p-3">
                  <div className="text-sm font-bold text-[#37352f]/40 uppercase">Cập nhật</div>
                  <div className="text-[15px] font-bold text-[#37352f]">{mergeResult.stats.updated}</div>
                </div>
                <div className="bg-white border border-[#37352f]/10 rounded-lg p-3">
                  <div className="text-sm font-bold text-[#37352f]/40 uppercase">Giữ nguyên</div>
                  <div className="text-[15px] font-bold text-[#37352f]">{mergeResult.stats.kept}</div>
                </div>
              </div>
              {parseErrors.length > 0 && (
                <div className="mt-3 text-sm font-bold text-amber-700">
                  Có {parseErrors.length} dòng bị bỏ qua (thiếu Mã NV hoặc Họ và Tên).
                </div>
              )}
            </div>
          )}

          {preview.length > 0 && (
            <div className="border border-[#37352f]/10 rounded-xl overflow-hidden">
              <div className="bg-[#f7f6f3] px-4 py-2 text-sm font-bold text-[#37352f]/40 uppercase tracking-widest">Danh sách nhân sự nạp</div>
              <div className="max-h-52 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white border-b border-[#37352f]/10">
                    <tr>
                      <th className="px-4 py-2 text-sm font-bold text-[#37352f]/40 uppercase">
                        <input
                          type="checkbox"
                          checked={parsedEmployees.length > 0 && selectedIds.size === parsedEmployees.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(new Set(parsedEmployees.map(x => x.id)));
                            else setSelectedIds(new Set());
                          }}
                        />
                      </th>
                      <th className="px-4 py-2 text-sm font-bold text-[#37352f]/40 uppercase">Mã NV</th>
                      <th className="px-4 py-2 text-sm font-bold text-[#37352f]/40 uppercase">Họ tên</th>
                      <th className="px-4 py-2 text-sm font-bold text-[#37352f]/40 uppercase">Bộ phận</th>
                      <th className="px-4 py-2 text-sm font-bold text-[#37352f]/40 uppercase">Chức vụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#37352f]/5">
                    {preview.map((e) => (
                      <tr key={e.id}>
                        <td className="px-4 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(e.id)}
                            onChange={(ev) => {
                              const next = new Set(selectedIds);
                              if (ev.target.checked) next.add(e.id);
                              else next.delete(e.id);
                              setSelectedIds(next);
                            }}
                          />
                        </td>
                        <td className="px-4 py-2 text-sm font-bold text-[#37352f]">{e.id}</td>
                        <td className="px-4 py-2 text-sm text-[#37352f]/80">{e.name}</td>
                        <td className="px-4 py-2 text-sm text-[#37352f]/70">{e.department}</td>
                        <td className="px-4 py-2 text-sm text-[#37352f]/70">{e.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-white border-t border-[#37352f]/5 text-sm font-bold text-[#37352f]/40">
                Đã chọn {selectedIds.size}/{parsedEmployees.length} nhân sự
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeImportRequestsModal({ existingEmployees, setEmployees, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [decideBusy, setDecideBusy] = useState('');
  const [previewId, setPreviewId] = useState('');

  const load = async () => {
    setError('');
    setBusy(true);
    try {
      const token = String(localStorage.getItem('token') || '').trim();
      const resp = await apiFetch('/api/employees/import-requests/list?status=PENDING', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await resp.text();
      let data = null;
      try { data = JSON.parse(text) } catch { data = null }
      if (!resp.ok || !data?.ok) {
        setError(data?.message || 'Không tải được danh sách yêu cầu.');
        return;
      }
      setItems(Array.isArray(data.requests) ? data.requests : []);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (id, decision) => {
    setError('');
    setDecideBusy(id);
    try {
      const token = String(localStorage.getItem('token') || '').trim();
      const resp = await apiFetch('/api/employees/import-requests/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, decision }),
      });
      const text = await resp.text();
      let data = null;
      try { data = JSON.parse(text) } catch { data = null }
      if (!resp.ok || !data?.ok) {
        setError(data?.message || 'Thao tác thất bại.');
        return;
      }
      const item = items.find(x => x.id === id);
      if (decision === 'APPROVE' && item?.employees) {
        const overwrite = item.overwrite_existing !== false;
        const payload = Array.isArray(item.employees) ? item.employees : [];
        const merged = mergeEmployees(existingEmployees, payload, { replaceAll: false, overwrite }).merged;
        setEmployees(merged);
      }
      setItems(prev => prev.filter(x => x.id !== id));
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setDecideBusy('');
    }
  };

  const previewItem = useMemo(() => items.find(x => x.id === previewId) || null, [items, previewId]);

  const normalizeVal = (v) => String(v ?? '').trim();
  const sameVal = (a, b) => normalizeVal(a) === normalizeVal(b);
  const diffFields = [
    { key: 'name', label: 'Họ và Tên' },
    { key: 'department', label: 'Chi nhánh' },
    { key: 'position', label: 'Chức vụ' },
    { key: 'phone', label: 'Điện thoại' },
    { key: 'email', label: 'Email' },
    { key: 'startDate', label: 'Ngày vào làm' },
    { key: 'probationDate', label: 'Thử việc' },
    { key: 'contractDate', label: 'Ký HĐ' },
    { key: 'renewDate', label: 'Tái ký' },
    { key: 'dob', label: 'Ngày sinh' },
    { key: 'nationality', label: 'Quốc tịch' },
    { key: 'address', label: 'Địa chỉ' },
    { key: 'cccd', label: 'CCCD' },
    { key: 'cccd_date', label: 'Ngày cấp' },
    { key: 'cccd_place', label: 'Nơi cấp' },
    { key: 'salary', label: 'Lương' },
    { key: 'hasInsurance', label: 'BHXH' },
    { key: 'insuranceAgency', label: 'Cơ quan BH' },
    { key: 'documentStatus', label: 'Hồ sơ' },
    { key: 'education', label: 'Học vấn' },
    { key: 'major', label: 'Chuyên ngành' },
    { key: 'pedagogyCert', label: 'NVSP' },
    { key: 'title', label: 'Giới tính' },
  ];

  const previewRows = useMemo(() => {
    if (!previewItem || !Array.isArray(previewItem.employees)) return [];
    const byId = new Map();
    (existingEmployees || []).forEach(e => {
      const id = normalizeVal(e?.id);
      if (id) byId.set(id, e);
    });
    return previewItem.employees
      .map((e) => {
        const id = normalizeVal(e?.id);
        const cur = id ? byId.get(id) : null;
        const changes = [];
        diffFields.forEach(f => {
          if (!cur) return;
          if (!sameVal(cur?.[f.key], e?.[f.key])) changes.push(f.label);
        });
        const action = !cur ? 'ADD' : (changes.length > 0 ? 'UPDATE' : 'NOCHANGE');
        return {
          id,
          name: normalizeVal(e?.name),
          department: normalizeVal(e?.department),
          action,
          changes,
          next: e,
          prev: cur,
        };
      })
      .filter(r => r.id);
  }, [existingEmployees, previewItem]);

  const previewStats = useMemo(() => {
    const stats = { add: 0, update: 0, nochange: 0 };
    previewRows.forEach(r => {
      if (r.action === 'ADD') stats.add++;
      else if (r.action === 'UPDATE') stats.update++;
      else stats.nochange++;
    });
    return stats;
  }, [previewRows]);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden mx-auto my-6 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900 font-display">Yêu cầu cập nhật nhân sự</div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">Chi nhánh gửi dữ liệu · Admin duyệt</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={busy} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50">
              Tải lại
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
              Đóng
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-xl text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700">
            {busy ? 'Đang tải…' : `Đang chờ duyệt: ${items.length} yêu cầu`}
          </div>

          {items.length === 0 && !busy ? (
            <div className="text-center text-sm font-bold text-slate-500 py-10">
              Không có yêu cầu nào.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#37352f] truncate">
                      {it.branch} · {Array.isArray(it.employees) ? it.employees.length : 0} nhân viên
                    </div>
                    <div className="text-sm text-[#37352f]/40 font-bold mt-1">
                      Từ: {it.created_by} · {it.created_at ? new Date(it.created_at).toLocaleString() : ''}
                    </div>
                    <div className="text-sm text-[#37352f]/40 font-bold mt-1">
                      {it.overwrite_existing === false ? 'Chỉ thêm mới (không ghi đè)' : 'Có ghi đè Mã NV trùng'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={!!decideBusy}
                      onClick={() => setPreviewId(it.id)}
                      className="px-3 py-2 rounded-lg bg-white border border-[#37352f]/15 text-[#37352f]/80 font-bold text-sm hover:bg-[#efedf0] disabled:opacity-50"
                    >
                      XEM TRƯỚC
                    </button>
                    <button
                      disabled={!!decideBusy}
                      onClick={() => decide(it.id, 'REJECT')}
                      className="px-3 py-2 rounded-lg bg-white border border-[#37352f]/15 text-[#37352f]/80 font-bold text-sm hover:bg-[#efedf0] disabled:opacity-50"
                    >
                      {decideBusy === it.id ? '...' : 'TỪ CHỐI'}
                    </button>
                    <button
                      disabled={!!decideBusy}
                      onClick={() => decide(it.id, 'APPROVE')}
                      className="px-3 py-2 rounded-lg bg-[#37352f] text-white font-bold text-sm hover:bg-[#37352f]/90 disabled:opacity-50"
                    >
                      {decideBusy === it.id ? '...' : 'DUYỆT'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {previewItem && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-sm p-4 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden mx-auto my-6 flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-[#37352f]">Xem trước cập nhật</div>
                <div className="text-sm text-[#37352f]/40 font-bold uppercase tracking-widest">
                  {previewItem.branch} · Thêm {previewStats.add} · Cập nhật {previewStats.update} · Không đổi {previewStats.nochange}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewId('')}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="p-6 overflow-auto flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-sm font-semibold text-[#37352f]/40 uppercase tracking-wider">Mã NV</th>
                      <th className="px-4 py-3 text-sm font-semibold text-[#37352f]/40 uppercase tracking-wider">Họ tên</th>
                      <th className="px-4 py-3 text-sm font-semibold text-[#37352f]/40 uppercase tracking-wider">Chi nhánh</th>
                      <th className="px-4 py-3 text-sm font-semibold text-[#37352f]/40 uppercase tracking-wider">Trạng thái</th>
                      <th className="px-4 py-3 text-sm font-semibold text-[#37352f]/40 uppercase tracking-wider">Thay đổi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-bold text-[#37352f]">{r.id}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#37352f]/80">{r.name || '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#37352f]/60">{r.department || '—'}</td>
                        <td className="px-4 py-3">
                          {r.action === 'ADD' && <span className="px-2 py-1 rounded bg-[#dbeddb] text-[#1c3829] text-sm font-bold">THÊM MỚI</span>}
                          {r.action === 'UPDATE' && <span className="px-2 py-1 rounded bg-[#fff0b3] text-[#5c4a14] text-sm font-bold">CẬP NHẬT</span>}
                          {r.action === 'NOCHANGE' && <span className="px-2 py-1 rounded bg-[#f1f1ef] text-[#37352f]/60 text-sm font-bold">KHÔNG ĐỔI</span>}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[#37352f]/60">
                          {r.action === 'UPDATE' ? r.changes.join(' · ') : (r.action === 'ADD' ? '—' : '—')}
                        </td>
                      </tr>
                    ))}
                    {previewRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm font-bold text-slate-500">Không có dữ liệu.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeProfileModal({ employee, onClose, onSave, userRole, movements }) {
  const isAdmin = userRole === 'admin';
  const canEditCompensation = true;
  const [activeTab, setActiveTab] = useState('info');
  const fileInputRef = useRef(null);
  const maskSalary = useMemo(() => {
    const raw = localStorage.getItem('ace_hrm_mask_salary');
    if (raw === null) return !isAdmin;
    return raw === '1';
  }, [isAdmin]);
  const [printOrientation, setPrintOrientation] = useState(() => {
    const raw = localStorage.getItem('ace_hrm_print_orientation');
    return raw === 'landscape' ? 'landscape' : 'portrait';
  });
  const [printMode, setPrintMode] = useState(() => {
    const raw = localStorage.getItem('ace_hrm_print_mode');
    return raw === 'full' ? 'full' : 'summary';
  });

  const applyPrintPageStyle = (orientation) => {
    if (typeof document === 'undefined') return;
    const id = 'ace_print_page_style';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    const o = orientation === 'landscape' ? 'landscape' : 'portrait';
    el.textContent = `@page { size: A4 ${o}; margin: 10mm; }`;
  };

  const normalizeNameKey = (v) => String(v || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
  
  const [formData, setFormData] = useState(employee || {
    name: '', position: '', department: '', email: '', phone: '',
    startDate: new Date().toISOString().slice(0, 10),
    probationDate: '', contractDate: '', renewDate: '',
    address: '', dob: '', cccd: '', cccd_date: '', cccd_place: '',
    nationality: 'Việt Nam', education: '', major: '',
    pedagogyCert: '', hasInsurance: '', insuranceAgency: '', documentStatus: '',
    salary: '', avatar_url: '', title: '', pdf_url: ''
  });

  const employeeHistory = useMemo(() => {
    if (!employee) return [];
    const realHistory = movements.filter(m => m.employeeName === employee.name);
    // Mock more data for demo if history is empty
    if (realHistory.length === 0) {
      const base = formData.startDate ? new Date(formData.startDate) : new Date('2024-01-01');
      const baseTime = base.getTime();
      return [
        { id: 'm1', type: 'ONBOARDING', createdAt: base.toISOString(), branchId: formData.department || 'Hội Sở', status: 'APPROVED', details: { reason: 'Tiếp nhận nhân sự mới' } },
        { id: 'm2', type: 'CAREER_CHANGE', createdAt: new Date(baseTime - 45 * 24 * 60 * 60 * 1000).toISOString(), branchId: formData.department || 'Hội Sở', status: 'APPROVED', details: { newRole: formData.position || 'Nhân viên', newSalary: formData.salary || 'Thương lượng', branch: formData.department || 'Hội Sở' } },
        { id: 'm3', type: 'LEAVE', createdAt: new Date(baseTime - 15 * 24 * 60 * 60 * 1000).toISOString(), branchId: formData.department || 'Hội Sở', status: 'APPROVED', details: { from: '2024-03-01', to: '2024-03-03', days: 3, reason: 'Việc gia đình' } }
      ];
    }
    return realHistory;
  }, [employee, movements, formData.startDate, formData.department, formData.position, formData.salary]);

  const monthlyEvals = useMemo(() => {
    try {
      const raw = localStorage.getItem('ace_monthly_eval_v1') || '{}'
      const all = JSON.parse(raw)
      const rows = []
      const branchesToScan = isAdmin
        ? Object.keys(all || {})
        : [String(formData.department || localStorage.getItem('user_branch') || '').trim()].filter(Boolean)

      const empId = String(employee?.id || '').trim()
      const empNameKey = normalizeNameKey(employee?.name)

      branchesToScan.forEach((b) => {
        const listByBranch = all?.[b] || {}
        Object.entries(listByBranch).forEach(([mon, arr]) => {
          ;(arr || []).forEach(it => {
            const matchById = empId && String(it.employeeId || '').trim() === empId
            const matchByName = !empId && normalizeNameKey(it.name) === empNameKey
            if (!matchById && !matchByName) return
            const key = it.scoreKey || Object.keys(it.scores || {})[0] || 'diem'
            rows.push({ branch: b, month: mon, score: it.scores?.[key] || '' })
          })
        })
      })
      
      // Mock data if empty
      if (rows.length === 0 && employee) {
        return [
          { branch: formData.department || 'Gò Vấp', month: '2024-01', score: '92.5' },
          { branch: formData.department || 'Gò Vấp', month: '2024-02', score: '88.0' },
          { branch: formData.department || 'Gò Vấp', month: '2024-03', score: '95.2' },
        ];
      }

      rows.sort((a, b) => a.month.localeCompare(b.month) || a.branch.localeCompare(b.branch))
      return rows
    } catch {
      return []
    }
  }, [employee, formData.department, isAdmin]);

  const recentMonthlyEvals = useMemo(() => monthlyEvals.slice(-6), [monthlyEvals])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    try {
      localStorage.setItem('ace_hrm_print_orientation', printOrientation);
      localStorage.setItem('ace_hrm_print_mode', printMode);
    } catch (_e) {}
    applyPrintPageStyle(printOrientation);
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 max-h-[95vh] print:fixed print:inset-0 print:m-0 print:rounded-none print:shadow-none print:max-h-none print:overflow-visible">
        
        {/* Header - Hidden on print */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                {isAdmin ? (employee ? 'Hồ sơ nhân sự' : 'Thêm nhân viên mới') : 'Chi tiết nhân sự'}
              </h3>
              <p className="text-sm font-semibold text-slate-500 tracking-widest">Hệ thống anh ngữ Á Châu</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {employee && (
              <div className="flex items-center gap-2">
                <select
                  value={printOrientation}
                  onChange={(e) => {
                    const v = e.target.value === 'landscape' ? 'landscape' : 'portrait';
                    setPrintOrientation(v);
                    try { localStorage.setItem('ace_hrm_print_orientation', v); } catch (_err) {}
                  }}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none focus:border-blue-500"
                  title="Khổ giấy A4"
                >
                  <option value="portrait">A4 Dọc</option>
                  <option value="landscape">A4 Ngang</option>
                </select>
                <select
                  value={printMode}
                  onChange={(e) => {
                    const v = e.target.value === 'full' ? 'full' : 'summary';
                    setPrintMode(v);
                    try { localStorage.setItem('ace_hrm_print_mode', v); } catch (_err) {}
                  }}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none focus:border-blue-500"
                  title="Chế độ in"
                >
                  <option value="summary">Tóm tắt</option>
                  <option value="full">Đầy đủ</option>
                </select>
                <button onClick={handlePrint} className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-all flex items-center gap-2 font-bold text-sm shadow-sm">
                  <Printer size={18} /> In hồ sơ
                </button>
              </div>
            )}
            <button onClick={onClose} className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={24} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0">
          
          {/* Profile Summary Card - Digital ID Style */}
          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-8 mb-8 flex flex-col md:flex-row gap-8 items-center md:items-start shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full -mr-24 -mt-24"></div>
            <div className="relative group shrink-0">
              <div className="w-44 h-44 rounded-xl overflow-hidden border-4 border-white shadow-xl bg-gray-100 relative group/avatar">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl font-black text-gray-300">
                    {formData.name?.split(' ').pop().charAt(0) || '?'}
                  </div>
                )}
                {isAdmin && (
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="absolute inset-0 bg-gray-900/60 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer text-white"
                  >
                    <Camera size={32} />
                    <span className="text-sm font-bold mt-2 tracking-widest">Thay ảnh</span>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>

            <div className="flex-1 w-full text-center md:text-left relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight mb-2">{formatName(formData.name) || '---'}</h1>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                    <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1.5 rounded-md tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={16} /> {formatPosition(formData.position) || 'Nhân viên'}
                    </span>
                    <span className="bg-gray-100 text-gray-600 text-sm font-bold px-3 py-1.5 rounded-md tracking-wider border border-gray-200">
                      {formatBranch(formData.department) || '---'}
                    </span>
                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm px-3 py-1.5 bg-emerald-50 rounded-md border border-emerald-100">
                      <Award size={16} /> Thâm niên: {calculateSeniority(formData.startDate)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6 border-t border-gray-100 pt-6">
                <div>
                  <div className="text-sm font-bold text-slate-600 tracking-widest mb-1">Mã nhân sự</div>
                  <div className="text-[16px] font-black text-gray-800">{formData.id || '---'}</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-600 tracking-widest mb-1 flex items-center gap-1 justify-center md:justify-start">
                    <Phone size={14} /> Điện thoại
                  </div>
                  <div className="text-[16px] font-black text-gray-800">{formData.phone || '---'}</div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <div className="text-sm font-bold text-slate-600 tracking-widest mb-1 flex items-center gap-1 justify-center md:justify-start">
                    <Mail size={14} /> Email nội bộ
                  </div>
                  <div className="text-[16px] font-black text-gray-800 truncate">{formData.email || '---'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs - Hidden on print */}
          <div className="flex flex-wrap gap-2 mb-8 print:hidden">
            <button onClick={() => setActiveTab('info')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border ${activeTab === 'info' ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
              <FileText size={16} /> Thông tin chi tiết
            </button>
            <button onClick={() => setActiveTab('history')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border ${activeTab === 'history' ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
              <History size={16} /> Lịch sử biến động
            </button>
            <button onClick={() => setActiveTab('eval')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border ${activeTab === 'eval' ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
              <BadgeCheck size={16} /> Đánh giá tháng
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
              {/* Personal Section */}
              <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                <h5 className="text-sm font-bold text-blue-600 tracking-widest mb-6 flex items-center gap-2 ml-1">
                  <User size={18} /> Thông tin cá nhân & pháp lý
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Field label="Họ và tên" value={formatName(formData.name)} disabled={!isAdmin} onChange={val => setFormData({...formData, name: val})} />
                  <Field label="Ngày sinh" value={formData.dob} type="date" disabled={!isAdmin} onChange={val => setFormData({...formData, dob: val})} />
                  <Field label="Giới tính" value={formData.title} placeholder="Nam/Nữ" disabled={!isAdmin} onChange={val => setFormData({...formData, title: val})} />
                  <Field label="Quốc tịch" value={formData.nationality} disabled={!isAdmin} onChange={val => setFormData({...formData, nationality: val})} />
                  
                  <Field label="Số CCCD" value={formData.cccd} disabled={!isAdmin} onChange={val => setFormData({...formData, cccd: val})} />
                  <Field label="Ngày cấp" value={formData.cccd_date} type="date" disabled={!isAdmin} onChange={val => setFormData({...formData, cccd_date: val})} />
                  <Field label="Nơi cấp" value={formData.cccd_place} disabled={!isAdmin} onChange={val => setFormData({...formData, cccd_place: val})} />
                  <Field label="Địa chỉ hiện tại" value={formData.address} disabled={!isAdmin} onChange={val => setFormData({...formData, address: val})} />
                </div>
              </section>

              {/* Education Section */}
              <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-600"></div>
                <h5 className="text-sm font-bold text-purple-600 tracking-widest mb-6 flex items-center gap-2 ml-1">
                  <GraduationCap size={18} /> Trình độ học vấn & chuyên môn
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Field label="Bằng cấp cao nhất" value={formData.education} placeholder="Cử nhân/Thạc sĩ..." disabled={!isAdmin} onChange={val => setFormData({...formData, education: val})} />
                  <Field label="Chuyên ngành" value={formData.major} disabled={!isAdmin} onChange={val => setFormData({...formData, major: val})} />
                  <Field label="Chứng chỉ NVSP" value={formData.pedagogyCert} placeholder="Có/Không hoặc Tên chứng chỉ" disabled={!isAdmin} onChange={val => setFormData({...formData, pedagogyCert: val})} />
                </div>
              </section>

              {/* Work Section */}
              <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600"></div>
                <h5 className="text-sm font-bold text-emerald-600 tracking-widest mb-6 flex items-center gap-2 ml-1">
                  <Building2 size={18} /> Quá trình công tác & chế độ
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Field label="Ngày vào làm" value={formData.startDate} type="date" disabled={!isAdmin} onChange={val => setFormData({...formData, startDate: val})} />
                  <Field label="Ngày thử việc" value={formData.probationDate} type="date" disabled={!isAdmin} onChange={val => setFormData({...formData, probationDate: val})} />
                  <Field label="Ngày ký HĐ" value={formData.contractDate} type="date" disabled={!isAdmin} onChange={val => setFormData({...formData, contractDate: val})} />
                  <Field label="Ngày tái ký" value={formData.renewDate} type="date" disabled={!isAdmin} onChange={val => setFormData({...formData, renewDate: val})} />
                  
                  <Field label="Mức lương" value={formData.salary} placeholder="Ví dụ: 15,000,000" disabled={!canEditCompensation} onChange={val => setFormData({...formData, salary: val})} mask={maskSalary} />
                  <Field label="Tham gia BHXH" value={formData.hasInsurance} placeholder="Có/Không" disabled={!canEditCompensation} onChange={val => setFormData({...formData, hasInsurance: val})} />
                  <Field label="Cơ quan BHXH" value={formData.insuranceAgency} disabled={!canEditCompensation} onChange={val => setFormData({...formData, insuranceAgency: val})} />
                  <Field label="Tình trạng hồ sơ" value={formData.documentStatus} placeholder="Đủ/Thiếu" disabled={!canEditCompensation} onChange={val => setFormData({...formData, documentStatus: val})} />
                  <div className="lg:col-span-4">
                    <Field label="Link scan hợp đồng (Google Drive)" value={formData.pdf_url} placeholder="Dán link Google Drive PDF..." disabled={!isAdmin && !canEditCompensation} onChange={val => setFormData({...formData, pdf_url: val})} />
                    {formData.pdf_url && (
                      <div className="mt-2">
                        <a href={formData.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 hover:bg-rose-100 transition-colors">
                          <FileText size={14} /> Xem hồ sơ gốc từ Google Drive
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                {recentMonthlyEvals.length > 0 && (
                  <div className="mt-8 border-t border-gray-100 pt-8">
                    <h6 className="text-sm font-bold text-slate-600 tracking-widest mb-4">Lịch sử KPI gần đây</h6>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {recentMonthlyEvals.map(it => (
                        <div key={`${it.branch}:${it.month}`} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-center transition-colors hover:bg-blue-50">
                          <div className="text-sm font-bold text-gray-400 uppercase">{it.month}</div>
                          <div className="text-[16px] font-black text-blue-600">{it.score || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              {employeeHistory.length > 0 ? (
                employeeHistory.map((m, idx) => (
                  <div key={m.id} className="relative pl-8 pb-8 last:pb-0">
                    {/* Timeline Line */}
                    {idx !== employeeHistory.length - 1 && <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-slate-100"></div>}
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-blue-50 border-4 border-white shadow-sm flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black text-blue-600 tracking-wider">{m.type === 'ONBOARDING' ? 'Tiếp nhận' : m.type === 'CAREER_CHANGE' ? 'Thay đổi' : m.type === 'LEAVE' ? 'Nghỉ phép' : m.type}</span>
                        <span className="text-[10px] font-bold text-slate-400">{format(parseISO(m.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 mb-1">{m.branchId}</p>
                      <div className="text-xs text-slate-500 bg-white/50 p-2 rounded-lg italic">
                        {m.type === 'LEAVE' && `Nghỉ từ ${m.details.from} đến ${m.details.to} (${m.details.days} ngày). Lý do: ${m.details.reason}`}
                        {m.type === 'CAREER_CHANGE' && `Thay đổi sang: ${m.details.newRole} (${maskSalary ? '*******' : m.details.newSalary}) tại ${m.details.branch}`}
                        {m.type === 'ONBOARDING' && `Tiếp nhận nhân sự mới vào hệ thống.`}
                      </div>
                      <div className="mt-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          m.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          m.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-slate-400">
                  <History size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold">Chưa có lịch sử biến động nào được ghi nhận</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'eval' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50">
                  <div>
                    <div className="text-[16px] font-black text-gray-900">Chi tiết đánh giá kỹ năng & KPI</div>
                    <div className="text-sm font-bold text-gray-400">{monthlyEvals.length} hồ sơ</div>
                  </div>
                </div>
                <div className="p-6">
                  {monthlyEvals.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 font-bold">Chưa có dữ liệu đánh giá hệ thống.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400">
                            <th className="text-left text-sm font-bold tracking-widest border-b border-gray-200 py-3 px-4">Tháng xét</th>
                            <th className="text-left text-sm font-bold tracking-widest border-b border-gray-200 py-3 px-4">Đơn vị công tác</th>
                            <th className="text-left text-sm font-bold tracking-widest border-b border-gray-200 py-3 px-4">Điểm trung bình</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {monthlyEvals.map(r => (
                            <tr key={`${r.branch}:${r.month}`} className="hover:bg-blue-50/30 transition-colors">
                              <td className="py-4 px-4 text-sm font-black text-gray-900">{r.month}</td>
                              <td className="py-4 px-4 text-sm font-medium text-gray-600">{r.branch}</td>
                              <td className="py-4 px-4 text-[15px] font-bold text-blue-600">{r.score || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Hidden on print */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 sticky bottom-0 z-10 print:hidden">
          <button onClick={onClose} className="px-6 py-2.5 text-gray-500 font-bold hover:text-gray-900 transition-colors text-sm tracking-widest">
            {isAdmin ? 'Hủy bỏ' : 'Đóng'}
          </button>
          {isAdmin && (
            <button 
              onClick={() => onSave(formData)}
              className="px-8 py-2.5 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 text-sm tracking-widest"
            >
              Lưu hồ sơ
            </button>
          )}
          {!isAdmin && canEditCompensation && (
            <button
              onClick={() => onSave({
                salary: formData.salary,
                hasInsurance: formData.hasInsurance,
                insuranceAgency: formData.insuranceAgency,
                documentStatus: formData.documentStatus,
                pdf_url: formData.pdf_url
              })}
              className="px-8 py-2.5 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 text-sm tracking-widest"
            >
              Lưu thay đổi
            </button>
          )}
        </div>
      </div>

      <div className="hidden print:block bg-white text-slate-900">
        <div
          className="mx-auto"
          style={{
            width: printOrientation === 'landscape' ? '297mm' : '210mm',
            minHeight: printOrientation === 'landscape' ? '210mm' : '297mm',
            padding: 0,
          }}
        >
          <div className="w-full h-full" style={{ padding: '10mm' }}>
            <div className="flex items-start justify-between border-b border-slate-300 pb-3">
              <div className="flex items-center gap-3">
                <img src="/ace-logo.svg" alt="ACE" className="w-10 h-10 rounded-xl" />
                <div>
                  <div className="text-sm font-black text-slate-900 tracking-tight">HỒ SƠ NHÂN SỰ</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ACE HRM</div>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-slate-600">
                <div>Mã NV: <span className="font-black text-slate-900">{formData.id || '—'}</span></div>
                <div>Ngày in: <span className="font-black text-slate-900">{format(new Date(), 'dd/MM/yyyy')}</span></div>
                <div>Chi nhánh: <span className="font-black text-slate-900">{formData.department || '—'}</span></div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <div className="shrink-0">
                <div className="w-24 h-28 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-slate-300">
                      {formData.name?.split(' ').pop()?.charAt(0) || '—'}
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-black text-slate-900 leading-tight truncate">{formData.name || '—'}</div>
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                  <PrintLine label="Chức vụ" value={formData.position} />
                  <PrintLine label="Ngày vào làm" value={formData.startDate} />
                  <PrintLine label="Điện thoại" value={formData.phone} />
                  <PrintLine label="Email" value={formData.email} />
                </div>
              </div>
            </div>

            <div className={`mt-4 grid gap-3 ${printOrientation === 'landscape' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div className="border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Thông tin cá nhân</div>
                <div className="mt-2 space-y-1">
                  <PrintLine label="Ngày sinh" value={formData.dob} />
                  <PrintLine label="Giới tính" value={formData.title} />
                  <PrintLine label="Quốc tịch" value={formData.nationality} />
                  <PrintLine label="Địa chỉ" value={formData.address} />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pháp lý</div>
                <div className="mt-2 space-y-1">
                  <PrintLine label="CCCD" value={formData.cccd} />
                  <PrintLine label="Ngày cấp" value={formData.cccd_date} />
                  <PrintLine label="Nơi cấp" value={formData.cccd_place} />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Học vấn</div>
                <div className="mt-2 space-y-1">
                  <PrintLine label="Học vấn" value={formData.education} />
                  <PrintLine label="Chuyên ngành" value={formData.major} />
                  <PrintLine label="NVSP" value={formData.pedagogyCert} />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hợp đồng</div>
                <div className="mt-2 space-y-1">
                  <PrintLine label="Thử việc" value={formData.probationDate} />
                  <PrintLine label="Ký HĐ" value={formData.contractDate} />
                  <PrintLine label="Tái ký" value={formData.renewDate} />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chế độ</div>
                <div className="mt-2 space-y-1">
                  <PrintLine label="Mức lương" value={formData.salary} mask={maskSalary} />
                  <PrintLine label="BHXH" value={formData.hasInsurance} />
                  <PrintLine label="Cơ quan BH" value={formData.insuranceAgency} />
                  <PrintLine label="Hồ sơ" value={formData.documentStatus} />
                </div>
              </div>

              {printMode === 'full' && (
                <div className="border border-slate-200 rounded-xl p-3">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Biến động gần nhất</div>
                  <div className="mt-2 space-y-1">
                    {(employeeHistory || []).slice(0, 3).map(m => (
                      <div key={m.id} className="flex justify-between gap-2 text-[11px]">
                        <span className="font-bold text-slate-500">{format(parseISO(m.createdAt), 'dd/MM/yyyy')}</span>
                        <span className="font-black text-slate-800 truncate">{m.type}</span>
                        <span className="font-bold text-slate-600 truncate">{m.branchId}</span>
                      </div>
                    ))}
                    {(employeeHistory || []).length === 0 && (
                      <div className="text-[11px] font-bold text-slate-500">—</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className={`mt-5 grid gap-6 ${printOrientation === 'landscape' && printMode === 'full' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div className="text-center">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Người lập</div>
                <div className="h-12"></div>
                <div className="border-b border-slate-300"></div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HRM</div>
                <div className="h-12"></div>
                <div className="border-b border-slate-300"></div>
              </div>
              {printOrientation === 'landscape' && printMode === 'full' && (
                <div className="text-center">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phê duyệt</div>
                  <div className="h-12"></div>
                  <div className="border-b border-slate-300"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, type = "text", placeholder, disabled, onChange, mask = false }) {
  const computedType = mask && type === 'text' ? 'password' : type;
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-slate-600 tracking-widest">{label}</label>
      <input 
        type={computedType}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all text-[15px] font-bold text-gray-700 ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-300'}`}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function PrintField({ label, value, mask = false }) {
  const displayValue = mask && value ? '*******' : (value || '................................');
  return (
    <div className="flex gap-2 text-sm">
      <span className="font-bold text-slate-600 w-32 shrink-0 uppercase text-sm tracking-wider">{label}:</span>
      <span className="font-black text-gray-800">{displayValue}</span>
    </div>
  );
}

function PrintLine({ label, value, mask = false }) {
  const displayValue = mask && value ? '*******' : (String(value || '').trim() || '—');
  return (
    <div className="flex items-baseline gap-2 text-sm leading-snug">
      <span className="font-bold text-slate-600 w-[84px] shrink-0">{label}:</span>
      <span className="font-black text-gray-800 min-w-0 break-words">{displayValue}</span>
    </div>
  );
}
