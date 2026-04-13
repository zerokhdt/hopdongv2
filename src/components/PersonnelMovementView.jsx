import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserPlus, Calendar, ArrowRightLeft, CheckCircle, Clock, 
  XCircle, Send, Calculator, History, Search, Filter, 
  TrendingUp, Home, ShieldAlert, FileText, Mail, Bell, HelpCircle, Paperclip, Hash, Building2, IdCard
} from 'lucide-react';
import { differenceInDays, addMonths, format, parseISO } from 'date-fns';
import { apiFetch } from '../utils/api.js';

export default function PersonnelMovementView({ employees, setEmployees, movements: _movements, setMovements: _setMovements, userRole, branchId }) {
  const [activeSubTab, setActiveSubTab] = useState('onboarding');
  const [notifications, setNotifications] = useState([]);
  const [myMovements, setMyMovements] = useState([]);
  const [adminMovements, setAdminMovements] = useState([]);
  const [pendingMovements, setPendingMovements] = useState([]);
  const [busy, setBusy] = useState(false);
  const maskSalary = useMemo(() => {
    const raw = localStorage.getItem('ace_hrm_mask_salary');
    if (raw === null) return userRole !== 'admin';
    return raw === '1';
  }, [userRole]);

  const isAdmin = userRole === 'admin';
  useEffect(() => {
    if (!isAdmin) return;
    try {
      const v = localStorage.getItem('ace_open_personnel_movements');
      if (v === '1') {
        localStorage.removeItem('ace_open_personnel_movements');
        setActiveSubTab('approvals');
      }
    } catch (_e) {}
  }, [isAdmin]);

  const mapDbMovementToUi = (m) => {
    return {
      id: String(m?.id || ''),
      type: String(m?.type || ''),
      employeeName: String(m?.employee_name || ''),
      employeeId: String(m?.employee_id || ''),
      status: String(m?.status || ''),
      branchId: String(m?.branch || ''),
      createdAt: String(m?.created_at || ''),
      processedAt: String(m?.processed_at || ''),
      createdBy: String(m?.created_by || ''),
      processedBy: String(m?.processed_by || ''),
      note: String(m?.decision_note || m?.note || ''),
      details: m?.payload || {},
      attachments: Array.isArray(m?.attachments) ? m.attachments : [],
    };
  };

  const mapDbEmployeeToUi = (r) => {
    if (!r) return null;
    return {
      id: r.id,
      title: r.title || '',
      name: r.name || '',
      position: r.position || '',
      department: r.department || '',
      email: r.email || '',
      phone: r.phone || '',
      startDate: r.start_date || '',
      probationDate: r.probation_date || '',
      seniority: r.seniority || '',
      contractDate: r.contract_date || '',
      renewDate: r.renew_date || '',
      education: r.education || '',
      major: r.major || '',
      pedagogyCert: r.pedagogy_cert || '',
      hasInsurance: r.has_insurance || '',
      insuranceAgency: r.insurance_agency || '',
      documentStatus: r.document_status || '',
      salary: r.salary || '',
      salaryBase: r.salary_base || '',
      allowanceHousing: r.allowance_housing || '',
      allowanceTravel: r.allowance_travel || '',
      allowancePhone: r.allowance_phone || '',
      cccd: r.cccd || '',
      cccd_date: r.cccd_date || '',
      cccd_place: r.cccd_place || '',
      dob: r.dob || '',
      address: r.address || '',
      currentAddress: r.current_address || '',
      nationality: r.nationality || '',
      avatar_url: r.avatar_url || '',
      bankAccount: r.bank_account || '',
      bankName: r.bank_name || '',
      taxCode: r.tax_code || '',
      note: r.note || '',
      rawStatus: r.raw_status || '',
    };
  };

  const loadMy = async () => {
    setBusy(true);
    try {
      const token = String(localStorage.getItem('token') || '').trim();
      const resp = await apiFetch('/api/movements/my?status=ALL', { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) throw new Error(data?.message || 'load_failed');
      setMyMovements((data.movements || []).map(mapDbMovementToUi));
    } catch (e) {
      setNotifications(prev => [...prev, { id: Date.now(), message: `Không tải được biến động: ${e?.message || String(e)}`, type: 'error' }]);
    } finally {
      setBusy(false);
    }
  };

  const loadPending = async () => {
    if (!isAdmin) return;
    setBusy(true);
    try {
      const token = String(localStorage.getItem('token') || '').trim();
      const resp = await apiFetch('/api/movements/pending?status=ALL', { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) throw new Error(data?.message || 'load_failed');
      const list = (data.movements || []).map(mapDbMovementToUi);
      setPendingMovements(list.filter(m => m.status === 'PENDING' || m.status === 'REVISION'));
    } catch (e) {
      setNotifications(prev => [...prev, { id: Date.now(), message: `Không tải được danh sách duyệt: ${e?.message || String(e)}`, type: 'error' }]);
    } finally {
      setBusy(false);
    }
  };

  const loadAdminHistory = async () => {
    if (!isAdmin) return;
    setBusy(true);
    try {
      const token = String(localStorage.getItem('token') || '').trim();
      const resp = await apiFetch('/api/movements/list?status=ALL', { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) throw new Error(data?.message || 'load_failed');
      setAdminMovements((data.movements || []).map(mapDbMovementToUi));
    } catch (e) {
      setNotifications(prev => [...prev, { id: Date.now(), message: `Không tải được lịch sử hệ thống: ${e?.message || String(e)}`, type: 'error' }]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      if (isAdmin) loadAdminHistory();
      else loadMy();
    }
    if (activeSubTab === 'approvals') loadPending();
  }, [activeSubTab]);

  const addMovement = async (type, employeeName, details) => {
    setBusy(true);
    try {
      const token = String(localStorage.getItem('token') || '').trim();
      const employeeId = String(details?.employeeId || details?.id || '').trim() || null;
      const attachments = Array.isArray(details?.attachments) ? details.attachments : [];
      const resp = await apiFetch('/api/movements/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          employeeId,
          employeeName,
          payload: details || {},
          attachments,
          note: String(details?.note || '').trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) throw new Error(data?.message || 'create_failed');
      alert("Yêu cầu đã được gửi cho HRM phê duyệt.");
      if (isAdmin) loadAdminHistory();
      else loadMy();
    } catch (e) {
      alert(`Gửi yêu cầu thất bại: ${e?.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const decide = async (movement, decision, decisionNote) => {
    setBusy(true);
    try {
      const token = String(localStorage.getItem('token') || '').trim();
      const resp = await apiFetch('/api/movements/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: movement.id, decision, decisionNote }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) throw new Error(data?.message || 'decide_failed');
      if (data.updatedEmployee) {
        const uiEmp = mapDbEmployeeToUi(data.updatedEmployee);
        if (uiEmp) {
          setEmployees(prev => {
            const list = Array.isArray(prev) ? prev : [];
            const idx = list.findIndex(e => e.id === uiEmp.id);
            if (idx < 0) return [...list, uiEmp];
            const next = [...list];
            next[idx] = { ...next[idx], ...uiEmp };
            return next;
          });
        }
      }
      setNotifications(prev => [...prev, { id: Date.now(), message: `Đã xử lý yêu cầu ${movement.type} cho ${movement.employeeName}`, type: decision === 'APPROVE' ? 'success' : decision === 'REJECT' ? 'error' : 'warning' }]);
      loadPending();
      loadAdminHistory();
    } catch (e) {
      setNotifications(prev => [...prev, { id: Date.now(), message: `Xử lý thất bại: ${e?.message || String(e)}`, type: 'error' }]);
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = (movement) => decide(movement, 'APPROVE', '');
  const handleReject = (movement) => decide(movement, 'REJECT', '');
  const handleRequestRevision = (movement, note) => decide(movement, 'REVISION', note);

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7] p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Biến động nhân sự</h2>
          <p className="text-slate-500 text-sm">
            {userRole === 'admin' ? 'Quản lý và phê duyệt biến động toàn hệ thống' : `Gửi yêu cầu biến động cho chi nhánh ${branchId}`}
          </p>
        </div>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <div className="relative group">
              <button className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 transition-colors">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">{notifications.length}</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 hidden group-hover:block z-50">
                <div className="text-xs font-bold text-slate-400 uppercase p-2 border-b border-slate-50">Thông báo mới</div>
                {notifications.slice(-5).map(n => (
                  <div key={n.id} className={`p-2 text-xs rounded-lg mt-1 ${n.type === 'success' ? 'bg-green-50 text-green-700' : n.type === 'warning' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                    {n.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex bg-white rounded-xl border border-slate-200 p-1 gap-1 mb-6 shadow-sm">
        <button onClick={() => setActiveSubTab('onboarding')} className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${activeSubTab === 'onboarding' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
          <UserPlus size={16} /> Tuyển dụng mới
        </button>
        <button onClick={() => setActiveSubTab('leave')} className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${activeSubTab === 'leave' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Calendar size={16} /> Nghỉ phép / Thai sản
        </button>
        <button onClick={() => setActiveSubTab('career')} className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${activeSubTab === 'career' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
          <TrendingUp size={16} /> Thăng tiến / Điều chuyển
        </button>
        <button onClick={() => setActiveSubTab('history')} className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${activeSubTab === 'history' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
          <History size={16} /> {userRole === 'admin' ? 'Lịch sử hệ thống' : 'Yêu cầu của tôi'}
        </button>
        {userRole === 'admin' && (
          <button onClick={() => setActiveSubTab('approvals')} className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${activeSubTab === 'approvals' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
            <ShieldAlert size={16} /> HRM Duyệt ({pendingMovements.length})
          </button>
        )}
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {activeSubTab === 'onboarding' && <OnboardingForm onSubmit={(data) => addMovement('ONBOARDING', data.name, data)} maskSalary={maskSalary} />}
          {activeSubTab === 'leave' && <LeaveForm employees={employees} onSubmit={(data) => addMovement('LEAVE', data.employeeName, data)} />}
          {activeSubTab === 'career' && <CareerMovementForm employees={employees} onSubmit={(data) => addMovement('CAREER_CHANGE', data.employeeName, data)} maskSalary={maskSalary} />}
          {activeSubTab === 'history' && <HistoryList movements={isAdmin ? adminMovements : myMovements} busy={busy} />}
          {activeSubTab === 'approvals' && userRole === 'admin' && (
            <ApprovalDashboard 
              movements={pendingMovements} 
              onApprove={handleApprove} 
              onReject={handleReject} 
              onRevision={handleRequestRevision}
              busy={busy}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FORM 1: TUYỂN DỤNG MỚI ──────────────────────────────────────────
function OnboardingForm({ onSubmit, maskSalary = false }) {
  const [formData, setFormData] = useState({
    employeeId: '',
    contractNumber: '',
    name: '',
    nationality: 'Việt Nam',
    birthDate: '',
    birthPlace: '',
    cccd: '',
    cccdDate: '',
    cccdPlace: '',
    phone: '',
    email: '',
    permanentAddress: '',
    temporaryAddress: '',
    position: '',
    department: '',
    startDate: '',
    salary: '',
    salaryText: '',
    contractSignDate: '',
    note: '',
    scanFile: null
  });

  const [pendingContracts, setPendingContracts] = useState([]);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [checklistValues, setChecklistValues] = useState({});

  useEffect(() => {
    const raw = localStorage.getItem('ace_contract_issue_log_v1') || '[]';
    let list = JSON.parse(raw).filter(c => c.workflowStage < 3);
    
    // Inject Mock Data if empty for testing
    if (list.length === 0) {
      const mock = [
        { id: 'mock-1', soHd: '001/2026/FT', ho_ten: 'Nguyễn Văn Mock', employeeId: 'M001', branch: 'TRUNG MỸ TÂY', vi_tri: 'Giáo viên', workflowStage: 1, muc_luong: '15000000', quoc_tich: 'Việt Nam', dien_thoai: '0901234567', cccd: '012345678901' },
        { id: 'mock-2', soHd: '002/2026/FT', ho_ten: 'Trần Thị Demo', employeeId: 'D002', branch: 'NGUYỄN ẢNH THỦ', vi_tri: 'Tư vấn', workflowStage: 1, muc_luong: '12000000', quoc_tich: 'Việt Nam', dien_thoai: '0907654321', cccd: '098765432109' }
      ];
      localStorage.setItem('ace_contract_issue_log_v1', JSON.stringify(mock));
      list = mock;
    }
    setPendingContracts(list);
  }, []);

  const selectedContract = useMemo(() => {
    return pendingContracts.find(c => c.id === selectedContractId) || null;
  }, [selectedContractId, pendingContracts]);

  const requiredDocs = useMemo(() => {
    if (!selectedContract) return null;
    const mappings = JSON.parse(localStorage.getItem('ace_position_contract_mapping_v1') || '{}');
    const pos = String(selectedContract.chuc_vu || selectedContract.vi_tri || '').trim();
    const req = mappings[pos];
    // Default fallback if no admin mapping
    const defaultDocs = "HĐLĐ + Bản cam kết + CCCD Photo";
    const actual = req || defaultDocs;
    return actual.split('+').map(s => s.trim());
  }, [selectedContract]);

  const handleImportContract = (id) => {
    setSelectedContractId(id);
    const c = pendingContracts.find(x => x.id === id);
    if (!c) return;

    setFormData(prev => ({
      ...prev,
      employeeId: c.employeeId || '',
      contractNumber: c.soHd || '',
      name: c.ho_ten || '',
      nationality: c.quoc_tich || 'Việt Nam',
      birthDate: c.ngay_sinh || '',
      birthPlace: c.noi_sinh || '',
      cccd: c.cccd || '',
      cccdDate: c.cccd_date || '',
      cccdPlace: c.cccd_place || '',
      phone: c.dien_thoai || '',
      email: c.email || '',
      permanentAddress: c.dia_chi_thuong_tru || '',
      temporaryAddress: c.dia_chi_tam_tru || '',
      position: c.chuc_vu || c.vi_tri || '',
      department: c.branch || '',
      startDate: c.ngay_bat_dau || '',
      salary: c.muc_luong || '',
      salaryText: c.muc_luong_chu || '',
      contractSignDate: c.ngay_ky_hd || ''
    }));
    setChecklistValues({});
  };

  const isChecklistComplete = useMemo(() => {
    if (!requiredDocs) return true;
    return requiredDocs.every(d => checklistValues[d] === true);
  }, [requiredDocs, checklistValues]);

  const isReadyToSubmit = isChecklistComplete && formData.scanFile;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end gap-6 mb-10">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <UserPlus size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2">Báo tăng Nhân sự</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quy trình tự động hóa hồ sơ chi nhánh</p>
            </div>
          </div>
        </div>
        <div className="w-full md:w-80">
           <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 block ml-1">Lấy từ HĐ đã in (Hỗ trợ nhập liệu)</label>
           <select 
             className="w-full px-5 py-4 bg-white border-2 border-blue-100 rounded-[24px] text-sm font-black text-slate-700 outline-none focus:border-blue-500 shadow-xl shadow-blue-50/50 appearance-none cursor-pointer transition-all hover:bg-blue-50/30"
             value={selectedContractId}
             onChange={e => handleImportContract(e.target.value)}
           >
             <option value="">-- Chọn hợp đồng nhân viên --</option>
             {pendingContracts.map(c => (
               <option key={c.id} value={c.id}>{c.soHd} - {c.ho_ten} ({c.branch})</option>
             ))}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: FORM INFO */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/40 p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2 flex items-center gap-3">
                <div className="h-6 w-1.5 bg-blue-600 rounded-full"></div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">HỒ SƠ NHÂN SỰ</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Mã nhân viên</label>
                <input type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[20px] outline-none focus:border-blue-400 font-black text-sm text-slate-700" value={formData.employeeId} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Số hợp đồng</label>
                <input type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[20px] outline-none focus:border-blue-400 font-black text-sm text-slate-700" value={formData.contractNumber} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Họ và tên</label>
                <input type="text" className="w-full p-5 bg-white border border-slate-200 rounded-[20px] outline-none focus:border-blue-400 font-black text-sm text-slate-700 shadow-sm" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Chức danh</label>
                <input type="text" className="w-full p-5 bg-white border border-slate-200 rounded-[20px] outline-none focus:border-blue-400 font-black text-sm text-slate-700 shadow-sm" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Phòng ban / Chi nhánh</label>
                <input type="text" className="w-full p-5 bg-white border border-slate-200 rounded-[20px] outline-none focus:border-blue-400 font-black text-sm text-slate-700 shadow-sm" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Mức lương</label>
                <input type={maskSalary ? "password" : "text"} className="w-full p-5 bg-white border border-slate-200 rounded-[20px] outline-none focus:border-blue-400 font-black text-sm text-slate-700 shadow-sm" value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: CHECKLIST & SCAN */}
        <div className="lg:col-span-4 space-y-6">
          {/* SCAN UPLOAD */}
          <div className="bg-white rounded-[40px] border-2 border-dashed border-indigo-200 p-8 shadow-xl shadow-indigo-100/20 relative overflow-hidden group">
            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-sm shadow-lg shadow-indigo-200">↑</span>
              Bản scan ký tay (PDF) <span className="text-red-500">*</span>
            </h4>
            
            <input 
              type="file" 
              accept="application/pdf"
              className="hidden" 
              id="onboarding-scan"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFormData({ ...formData, scanFile: f });
              }}
            />
            <label htmlFor="onboarding-scan" className="flex flex-col items-center justify-center gap-4 w-full py-12 bg-slate-50 border-2 border-slate-100 border-dashed rounded-[32px] cursor-pointer group-hover:border-indigo-400 group-hover:bg-indigo-50/30 transition-all">
              <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-3xl shadow-inner transition-all ${formData.scanFile ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400'}`}>
                {formData.scanFile ? '✓' : '📄'}
              </div>
              <div className="text-center">
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest block mb-1">
                  {formData.scanFile ? 'Đã tải hồ sơ quét' : 'Chọn file Scan PDF'}
                </span>
                {formData.scanFile && <span className="text-[10px] font-bold text-emerald-600 truncate max-w-[150px] block">{formData.scanFile.name}</span>}
              </div>
            </label>
          </div>

          {/* CHECKLIST */}
          {requiredDocs && (
            <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-xl shadow-slate-200/30">
               <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                 <span className="w-8 h-8 border-2 border-slate-800 text-slate-800 rounded-xl flex items-center justify-center text-xs">✓</span>
                 Bảng kê hồ sơ bắt buộc
               </h4>
               <div className="space-y-3">
                 {requiredDocs.map(doc => (
                   <label key={doc} className="flex items-center gap-4 p-5 bg-slate-50 rounded-[20px] cursor-pointer hover:bg-blue-50 transition-all border-2 border-transparent has-[:checked]:border-blue-400 group">
                     <input 
                       type="checkbox" 
                       checked={checklistValues[doc] || false}
                       onChange={e => setChecklistValues({ ...checklistValues, [doc]: e.target.checked })}
                       className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                     />
                     <span className="text-xs font-black text-slate-700 group-hover:text-blue-700 tracking-tight">{doc}</span>
                   </label>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* BOTTOM: NOTE & SUBMIT */}
        <div className="lg:col-span-12">
          <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-xl shadow-slate-200/30">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 block ml-1">Ghi chú quan trọng cho bộ phận HRM Tổng</label>
            <textarea 
              className="w-full p-8 bg-slate-50 border border-slate-200 rounded-[32px] outline-none focus:border-blue-400 text-sm font-black text-slate-700 min-h-[160px] resize-none shadow-inner"
              placeholder="Nhập ghi chú chi tiết về hồ sơ này (ví dụ: xin bổ sung file sau, lưu ý về ngày làm việc...)"
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
            />
            
            <div className="mt-10 flex flex-col md:flex-row items-center gap-8 border-t border-slate-50 pt-10">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isChecklistComplete ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kiểm tra hồ sơ</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${formData.scanFile ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tải lên bản Scan (Bắt buộc)</span>
                </div>
              </div>

              <button 
                disabled={!isReadyToSubmit}
                onClick={() => {
                  if (!formData.scanFile) {
                    alert('Bạn bắt buộc phải tải lên bản Scan ký tay để Báo tăng nhân sự.');
                    return;
                  }
                  onSubmit({ ...formData, checklist: checklistValues });
                }} 
                className={`w-80 py-6 font-black rounded-[24px] shadow-2xl uppercase tracking-[0.3em] transition-all flex justify-center items-center gap-4 text-sm active:scale-[0.98] ${isReadyToSubmit ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
              >
                <Send size={20} /> Báo tăng →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FORM 2: NGHỈ PHÉP / THAI SẢN ────────────────────────────────────
function LeaveForm({ employees, onSubmit }) {
  const [department, setDepartment] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [formData, setFormData] = useState({ employeeName: '', employeeId: '', leaveType: 'ANNUAL', from: '', to: '', reason: '' });

  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach(e => set.add(e.department || '')); 
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (department !== 'ALL') list = list.filter(e => e.department === department);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(e => (e.name || '').toLowerCase().includes(s) || (e.id || '').toLowerCase().includes(s));
    }
    return list;
  }, [employees, department, search]);

  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  const readFilesToAttachments = async (fileList) => {
    const files = Array.from(fileList || []);
    const toAttachment = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
      reader.onerror = () => reject(new Error('read_failed'));
      reader.readAsDataURL(file);
    });
    const results = [];
    for (const f of files) {
      try {
        results.push(await toAttachment(f));
      } catch (_) {
      }
    }
    return results;
  };
  
  const stats = useMemo(() => {
    if (!formData.from || !formData.to) return null;
    const start = parseISO(formData.from);
    const end = parseISO(formData.to);
    const days = differenceInDays(end, start) + 1;
    
    let label = "Nghỉ phép năm";
    let isPaid = true;
    let detail = `${days} ngày`;

    if (formData.leaveType === 'MATERNITY') {
      label = "Nghỉ thai sản";
      const backDate = addMonths(start, 6);
      detail = `Dự kiến đi làm lại: ${format(backDate, 'dd/MM/yyyy')}`;
    } else if (formData.leaveType === 'SICK') {
      label = "Nghỉ ốm (Hưởng BHXH)";
    } else if (formData.leaveType === 'UNPAID') {
      label = "Nghỉ không lương";
      isPaid = false;
    }

    return { days, label, isPaid, detail };
  }, [formData.from, formData.to, formData.leaveType]);

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Calculator className="text-purple-500" /> Tính toán nghỉ phép</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Phòng ban / Chi nhánh</label>
          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="ALL">Tất cả</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Tìm mã / tên</label>
          <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={search} onChange={e => setSearch(e.target.value)} placeholder="Gõ mã NV hoặc tên" />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Chọn nhân sự</label>
          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={selectedEmployeeId} onChange={e => {
            const id = e.target.value;
            setSelectedEmployeeId(id);
            const emp = employees.find(x => x.id === id);
            setFormData(prev => ({ ...prev, employeeName: emp?.name || '', employeeId: emp?.id || '' }));
          }}>
            <option value="">-- Chọn nhân viên --</option>
            {filteredEmployees.map(e => <option key={e.id} value={e.id}>{e.id} - {e.name} ({e.department})</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Loại hình nghỉ</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
            {[
              { id: 'ANNUAL', label: 'Phép năm' },
              { id: 'SICK', label: 'Nghỉ ốm' },
              { id: 'MATERNITY', label: 'Thai sản' },
              { id: 'UNPAID', label: 'Không lương' }
            ].map(type => (
              <button key={type.id} onClick={() => setFormData({...formData, leaveType: type.id})} className={`p-2 text-xs font-bold rounded-lg border-2 transition-all ${formData.leaveType === type.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                {type.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Từ ngày</label>
          <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.from} onChange={e => setFormData({...formData, from: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Đến ngày</label>
          <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.to} onChange={e => setFormData({...formData, to: e.target.value})} />
        </div>

        <div className="col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
            <Paperclip size={14} /> Tài liệu đính kèm (đơn nghỉ, giấy BHXH, giấy khám, ...)
          </label>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            onChange={async (e) => {
              const items = await readFilesToAttachments(e.target.files);
              setAttachments(prev => [...prev, ...items]);
            }}
          />
          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {attachments.map((a, idx) => (
                <div key={idx} className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2">
                  <FileText size={14} className="text-slate-400" />
                  <span className="max-w-[220px] truncate">{a.name}</span>
                  <button className="text-slate-400 hover:text-red-600" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>
                    <XCircle size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {stats && (
        <div className="mt-6 p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Kết quả tính toán</div>
            <div className="text-xl font-black">{stats.label}</div>
            <div className="text-xs text-slate-400 mt-1">{stats.detail} · {stats.isPaid ? 'Có lương' : 'Không lương'}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-blue-400">{stats.days}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Tổng số ngày</div>
          </div>
        </div>
      )}

      <button onClick={() => onSubmit({ ...formData, employeeName: selectedEmp?.name || formData.employeeName, employeeId: selectedEmp?.id || formData.employeeId, department: selectedEmp?.department || department, attachments, ...stats })} className="w-full mt-8 py-4 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all">
        Gửi yêu cầu HRM
      </button>
    </div>
  );
}

// ─── FORM 3: BIẾN ĐỘNG CÔNG TÁC / LƯƠNG ──────────────────────────────
function CareerMovementForm({ employees, onSubmit, maskSalary = false }) {
  const [department, setDepartment] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    type: 'PROMOTION',
    newRole: '',
    newSalary: '',
    newSalaryText: '',
    housingAllowance: '',
    travelAllowance: '',
    phoneAllowance: '',
    newDepartment: '',
    effectiveDate: '',
    reason: ''
  });

  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach(e => set.add(e.department || '')); 
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (department !== 'ALL') list = list.filter(e => e.department === department);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(e => (e.name || '').toLowerCase().includes(s) || (e.id || '').toLowerCase().includes(s));
    }
    return list;
  }, [employees, department, search]);

  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="text-orange-500" /> Biến động vị trí & Lương</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Phòng ban / Chi nhánh</label>
          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="ALL">Tất cả</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Tìm mã / tên</label>
          <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={search} onChange={e => setSearch(e.target.value)} placeholder="Gõ mã NV hoặc tên" />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Chọn nhân sự</label>
          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={selectedEmployeeId} onChange={e => {
            const id = e.target.value;
            setSelectedEmployeeId(id);
            const emp = employees.find(x => x.id === id);
            setFormData(prev => ({
              ...prev,
              employeeId: emp?.id || '',
              employeeName: emp?.name || '',
              newDepartment: prev.newDepartment || emp?.department || ''
            }));
          }}>
            <option value="">-- Chọn nhân viên --</option>
            {filteredEmployees.map(e => <option key={e.id} value={e.id}>{e.id} - {e.name} ({e.position})</option>)}
          </select>
        </div>

        {selectedEmp && (
          <div className="col-span-2 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
            <div className="flex gap-4">
              <div><span className="text-slate-400">Vị trí hiện tại:</span> <span className="font-bold">{selectedEmp.position}</span></div>
              <div><span className="text-slate-400">Phòng ban:</span> <span className="font-bold">{selectedEmp.department}</span></div>
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Vị trí mới</label>
          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.newRole} onChange={e => setFormData({...formData, newRole: e.target.value})} placeholder={selectedEmp?.position} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Phòng ban/chi nhánh mới</label>
          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.newDepartment} onChange={e => setFormData({...formData, newDepartment: e.target.value})} placeholder={selectedEmp?.department} />
        </div>

        <div className="col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Loại biến động</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
            {[
              { id: 'PROMOTION', label: 'Thăng chức' },
              { id: 'TRANSFER', label: 'Điều chuyển' },
              { id: 'SALARY_UP', label: 'Tăng lương' },
              { id: 'RESIGN', label: 'Nghỉ việc' }
            ].map(type => (
              <button key={type.id} onClick={() => setFormData({...formData, type: type.id})} className={`p-2 text-xs font-bold rounded-lg border-2 transition-all ${formData.type === type.id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                {type.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Mức lương mới (số)</label>
          <input type={maskSalary ? "password" : "text"} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.newSalary} onChange={e => setFormData({...formData, newSalary: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Mức lương mới (chữ)</label>
          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.newSalaryText} onChange={e => setFormData({...formData, newSalaryText: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Phụ cấp chỗ ở</label>
          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.housingAllowance} onChange={e => setFormData({...formData, housingAllowance: e.target.value})} placeholder="đồng/tháng" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Phụ cấp đi lại</label>
          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.travelAllowance} onChange={e => setFormData({...formData, travelAllowance: e.target.value})} placeholder="đồng/tháng" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Phụ cấp điện thoại</label>
          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.phoneAllowance} onChange={e => setFormData({...formData, phoneAllowance: e.target.value})} placeholder="đồng/tháng" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Ngày hiệu lực</label>
          <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.effectiveDate} onChange={e => setFormData({...formData, effectiveDate: e.target.value})} />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Lý do / ghi chú</label>
          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
        </div>
      </div>

      <button onClick={() => onSubmit({ ...formData, employeeName: selectedEmp?.name || formData.employeeName, employeeId: selectedEmp?.id || formData.employeeId, currentDepartment: selectedEmp?.department, currentRole: selectedEmp?.position })} className="w-full mt-8 py-4 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all flex justify-center items-center gap-2">
        <Send size={18} /> Gửi trình ký HRM
      </button>
    </div>
  );
}

// ─── COMPONENT: DANH SÁCH LỊCH SỬ (Cho cả Chi nhánh & Admin) ───────────
function HistoryList({ movements }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Lịch sử biến động</h3>
      {movements.map(m => (
        <div key={m.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              m.type === 'ONBOARDING' ? 'bg-blue-100 text-blue-600' :
              m.type === 'LEAVE' ? 'bg-purple-100 text-purple-600' :
              'bg-orange-100 text-orange-600'
            }`}>
              {m.type.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">{m.employeeName}</span>
                <StatusBadge status={m.status} />
              </div>
              <div className="text-xs text-slate-400">{m.branchId} · {m.type} · {format(parseISO(m.createdAt), 'dd/MM/yyyy HH:mm')}</div>
              {m.note && <div className="text-xs text-orange-600 mt-1 font-medium bg-orange-50 p-1 px-2 rounded-lg inline-block italic">Phản hồi: {m.note}</div>}
              {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.attachments.map((a, idx) => (
                    <a
                      key={idx}
                      href={a.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2 hover:border-blue-300"
                    >
                      <FileText size={14} className="text-slate-400" />
                      <span className="max-w-[220px] truncate">{a.name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      {movements.length === 0 && <div className="text-center py-20 text-slate-400">Chưa có dữ liệu biến động</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const configs = {
    'PENDING': { label: 'Chờ duyệt', class: 'bg-yellow-100 text-yellow-700' },
    'APPROVED': { label: 'Đã duyệt', class: 'bg-green-100 text-green-700' },
    'REJECTED': { label: 'Từ chối', class: 'bg-red-100 text-red-700' },
    'REVISION': { label: 'Kiểm tra lại', class: 'bg-orange-100 text-orange-700' }
  };
  const config = configs[status] || configs['PENDING'];
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.class}`}>{config.label}</span>;
}

// ─── DASHBOARD: HRM PHÊ DUYỆT ─────────────────────────────────────────
function ApprovalDashboard({ movements, onApprove, onReject, onRevision }) {
  const pending = movements.filter(m => m.status === 'PENDING' || m.status === 'REVISION');
  const history = movements.filter(m => m.status === 'APPROVED' || m.status === 'REJECTED');

  const renderMovement = (m, isHistory = false) => (
    <div key={m.id} className="p-4 bg-white border border-slate-200 rounded-2xl mb-3 group hover:border-blue-400 transition-colors shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
            m.type === 'ONBOARDING' ? 'bg-blue-100 text-blue-600' :
            m.type === 'LEAVE' ? 'bg-purple-100 text-purple-600' :
            'bg-orange-100 text-orange-600'
          }`}>
            {m.type.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{m.employeeName}</span>
              <StatusBadge status={m.status} />
            </div>
            <div className="text-xs text-slate-400">{m.branchId} · {m.type} · {format(parseISO(m.createdAt), 'dd/MM/yyyy HH:mm')}</div>
          </div>
        </div>
        {!isHistory && (
          <div className="flex gap-1">
            <button onClick={() => {
              const note = prompt("Nhập lý do yêu cầu kiểm tra lại:");
              if (note) onRevision(m, note);
            }} className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Kiểm tra lại"><HelpCircle size={20} /></button>
            <button onClick={() => onReject(m)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Từ chối"><XCircle size={20} /></button>
            <button onClick={() => onApprove(m)} className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Phê duyệt"><CheckCircle size={20} /></button>
          </div>
        )}
      </div>
      
      <div className="ml-14 p-3 bg-slate-50 rounded-xl text-xs space-y-1">
        {m.type === 'ONBOARDING' && (
          <>
            <div><span className="text-slate-400">Số HĐ:</span> {m.details.contractNumber || '---'}</div>
            <div><span className="text-slate-400">Chức danh:</span> {m.details.position || '---'}</div>
            <div><span className="text-slate-400">Phòng ban:</span> {m.details.department || '---'}</div>
            <div><span className="text-slate-400">CCCD:</span> {m.details.cccd || '---'}</div>
            <div><span className="text-slate-400">Lương:</span> {m.details.salary || '---'} ({m.details.salaryText || '---'})</div>
          </>
        )}
        {m.type === 'LEAVE' && (
          <>
            <div><span className="text-slate-400">Loại nghỉ:</span> {m.details.label} ({m.details.days} ngày)</div>
            <div><span className="text-slate-400">Lý do:</span> {m.details.reason}</div>
          </>
        )}
        {m.type === 'CAREER_CHANGE' && (
          <>
            <div><span className="text-slate-400">Loại:</span> {m.details.type}</div>
            <div><span className="text-slate-400">Mới:</span> {m.details.newRole || '---'} ({m.details.newSalary || '---'})</div>
            <div><span className="text-slate-400">Phòng ban mới:</span> {m.details.newDepartment || '---'}</div>
            <div><span className="text-slate-400">Ngày hiệu lực:</span> {m.details.effectiveDate || '---'}</div>
          </>
        )}
        {Array.isArray(m.details?.attachments) && m.details.attachments.length > 0 && (
          <div className="pt-2 mt-2 border-t border-slate-200">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tài liệu đính kèm</div>
            <div className="flex flex-wrap gap-2">
              {m.details.attachments.map((a, idx) => (
                <a
                  key={idx}
                  href={a.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2 hover:border-blue-300"
                >
                  <FileText size={14} className="text-slate-400" />
                  <span className="max-w-[220px] truncate">{a.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
        {m.note && <div className="text-orange-600 font-bold border-t border-orange-100 pt-1 mt-1">Ghi chú: {m.note}</div>}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2"><Clock size={14} /> Chờ duyệt ({pending.length})</h4>
        {pending.map(m => renderMovement(m))}
        {pending.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Không có yêu cầu chờ duyệt</div>}
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2"><History size={14} /> Lịch sử xử lý</h4>
        <div className="max-h-[500px] overflow-y-auto pr-2">
          {history.map(m => renderMovement(m, true))}
        </div>
      </div>
    </div>
  );
}
