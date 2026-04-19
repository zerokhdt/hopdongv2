import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserPlus, Calendar, ArrowRightLeft, CheckCircle, Clock, 
  XCircle, Send, Calculator, History, Search, Filter, 
  TrendingUp, Home, ShieldAlert, FileText, Mail, Bell, HelpCircle, Paperclip, Hash, Building2, IdCard
} from 'lucide-react';
import { differenceInDays, addMonths, format, parseISO } from 'date-fns';
import { apiFetch } from '../../utils/api.js';
import { formatName, formatBranch, formatPosition } from '../../utils/formatters';

export default function PersonnelMovementView({ employees, setEmployees, movements: _movements, setMovements: _setMovements, userRole, branchId }) {
  const [activeSubTab, setActiveSubTab] = useState('onboarding');
  const [notifications, setNotifications] = useState([]);
  const [myMovements, setMyMovements] = useState([]);
  const [adminMovements, setAdminMovements] = useState([]);
  const [pendingMovements, setPendingMovements] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
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
      let list = [];
      try {
        const resp = await apiFetch('/api/movements/my?status=ALL', { headers: { Authorization: `Bearer ${token}` } });
        const data = await resp.json();
        if (!resp.ok || !data?.ok) throw new Error(data?.message || 'load_failed');
        list = (data.movements || []).map(mapDbMovementToUi);
      } catch (_err) {
        const existing = JSON.parse(localStorage.getItem('ace_mock_movements') || '[]');
        list = existing.filter(m => m.branch === branchId).map(mapDbMovementToUi);
      }
      setMyMovements(list);
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
      let list = [];
      try {
        const resp = await apiFetch('/api/movements/pending?status=ALL', { headers: { Authorization: `Bearer ${token}` } });
        const data = await resp.json();
        if (!resp.ok || !data?.ok) throw new Error(data?.message || 'load_failed');
        list = (data.movements || []).map(mapDbMovementToUi);
      } catch (_err) {
        const existing = JSON.parse(localStorage.getItem('ace_mock_movements') || '[]');
        list = existing.map(mapDbMovementToUi);
      }
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
      let list = [];
      try {
        const resp = await apiFetch('/api/movements/list?status=ALL', { headers: { Authorization: `Bearer ${token}` } });
        const data = await resp.json();
        if (!resp.ok || !data?.ok) throw new Error(data?.message || 'load_failed');
        list = (data.movements || []).map(mapDbMovementToUi);
      } catch (_err) {
        const existing = JSON.parse(localStorage.getItem('ace_mock_movements') || '[]');
        list = existing.map(mapDbMovementToUi);
      }
      setAdminMovements(list);
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

  const handleBase64Upload = async (file, ma_nv, ho_ten, vi_tri) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        const payload = {
          action: "uploadFile",
          secret: import.meta.env.VITE_SYNC_SECRET || "moon_map_2026",
          fileName: file.name,
          mimeType: file.type,
          base64: base64,
          ma_nv: ma_nv,
          ho_ten: ho_ten,
          vi_tri: vi_tri,
          branch: branchId || "Khac",
          loai_ho_so: "Báo tăng nhân sự"
        };

        const resp = await apiFetch('/api/contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await resp.json();
        if (result.ok) resolve(result);
        else reject(new Error(result.error || 'Upload failed'));
      };
      reader.onerror = () => reject(new Error('Read file error'));
      reader.readAsDataURL(file);
    });
  };

  const addMovement = async (type, employeeName, details) => {
    setBusy(true);
    try {
      const token = String(localStorage.getItem('token') || '').trim();
      const employeeId = String(details?.employeeId || details?.id || '').trim() || null;
      
      let finalDetails = { ...details };
      let finalAttachments = Array.isArray(details?.attachments) ? [...details.attachments] : [];

      // Nếu có file scan PDF trong form Onboarding, upload lên Drive trước
      if (type === 'ONBOARDING' && details.scanFile) {
        setUploadLoading(true);
        try {
          const driveResult = await handleBase64Upload(details.scanFile, employeeId, employeeName, details.position || "Không rõ");
          finalDetails.driveViewUrl = driveResult.url;
          finalDetails.driveFileId = driveResult.fileId;
          finalDetails.scanFileName = details.scanFile.name;
          delete finalDetails.scanFile; // Không gửi object File lên API
          
          finalAttachments.push({
            name: details.scanFile.name,
            url: driveResult.url,
            type: 'GOOGLE_DRIVE_PDF'
          });
        } catch (uploadErr) {
          alert("Lỗi upload file lên Google: " + uploadErr.message);
          setBusy(false);
          setUploadLoading(false);
          return;
        }
        setUploadLoading(false);
      }

      const resp = await apiFetch('/api/movements/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          employeeId,
          employeeName,
          payload: finalDetails || {},
          attachments: finalAttachments,
          note: String(details?.note || '').trim(),
        }),
      });
      
      const text = await resp.text();
      let data = { ok: false };
      try { data = JSON.parse(text); } catch(_e) {}

      if (!resp?.ok || !data?.ok) {
        const mockRow = {
          id: 'mock-mv-' + Date.now(),
          type,
          employee_id: employeeId,
          employee_name: employeeName,
          payload: finalDetails || {},
          attachments: finalAttachments,
          note: String(details?.note || '').trim(),
          branch: branchId || 'KHÁC',
          status: 'PENDING',
          created_at: new Date().toISOString(),
          created_by: String(localStorage.getItem('saved_username') || 'admin'),
        };
        const existing = JSON.parse(localStorage.getItem('ace_mock_movements') || '[]');
        existing.push(mockRow);
        localStorage.setItem('ace_mock_movements', JSON.stringify(existing));
      }
      
      // Đánh dấu đã báo tăng thành công để không hiện lại trong danh sách
      if (type === 'ONBOARDING' && details?.selectedContractId) {
        const raw = JSON.parse(localStorage.getItem('ace_contract_issue_log_v1') || '[]');
        const updated = raw.map(c => {
          if (c.id === details.selectedContractId) return { ...c, onboarded: true, workflowStage: 3 };
          return c;
        });
        localStorage.setItem('ace_contract_issue_log_v1', JSON.stringify(updated));
      }

      alert("Yêu cầu đã được gửi cho HRM phê duyệt.");
      if (isAdmin) loadAdminHistory();
      else loadMy();
    } catch (e) {
      alert(`Gửi yêu cầu thất bại: ${e?.message || String(e)}`);
    } finally {
      setBusy(false);
      setUploadLoading(false);
    }
  };

  const decide = async (movement, decision, decisionNote) => {
    setBusy(true);
    try {
      const token = String(localStorage.getItem('token') || '').trim();
      let uiEmp = null;
      let data = {};
      try {
        const resp = await apiFetch('/api/movements/decide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: movement.id, decision, decisionNote }),
        });
        data = await resp.json();
        if (!resp.ok || !data?.ok) throw new Error(data?.message || 'decide_failed');
        if (data.updatedEmployee) uiEmp = mapDbEmployeeToUi(data.updatedEmployee);
      } catch (err) {
        console.warn('API decide failed, updating local mock instead', err);
        const existing = JSON.parse(localStorage.getItem('ace_mock_movements') || '[]');
        const idx = existing.findIndex(m => m.id === movement.id);
        if (idx >= 0) {
          existing[idx].status = decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : 'REVISION';
          existing[idx].processed_by = String(localStorage.getItem('saved_username') || 'admin');
          existing[idx].processed_at = new Date().toISOString();
          existing[idx].decision_note = decisionNote;
          localStorage.setItem('ace_mock_movements', JSON.stringify(existing));
        }
      }

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
    <div className="h-full flex flex-col bg-[#F2F4F7] p-4 lg:p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Biến động nhân sự</h1>
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

      <div className="flex bg-white rounded-xl border border-[#37352f]/10 p-1 gap-1 mb-6 shadow-sm">
        <button onClick={() => setActiveSubTab('onboarding')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeSubTab === 'onboarding' ? 'bg-[#37352f] text-white shadow-lg' : 'text-[#37352f]/40 hover:bg-slate-50'}`}>
          <UserPlus size={16} /> Tuyển dụng mới
        </button>
        <button onClick={() => setActiveSubTab('leave')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeSubTab === 'leave' ? 'bg-[#37352f] text-white shadow-lg' : 'text-[#37352f]/40 hover:bg-slate-50'}`}>
          <Calendar size={16} /> Nghỉ phép / Thai sản
        </button>
        <button onClick={() => setActiveSubTab('career')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeSubTab === 'career' ? 'bg-[#37352f] text-white shadow-lg' : 'text-[#37352f]/40 hover:bg-slate-50'}`}>
          <TrendingUp size={16} /> Thăng tiến / Điều chuyển
        </button>
        <button onClick={() => setActiveSubTab('history')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeSubTab === 'history' ? 'bg-[#37352f] text-white shadow-lg' : 'text-[#37352f]/40 hover:bg-slate-50'}`}>
          <History size={16} /> {userRole === 'admin' ? 'Lịch sử hệ thống' : 'Yêu cầu của tôi'}
        </button>
        {userRole === 'admin' && (
          <button onClick={() => setActiveSubTab('approvals')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeSubTab === 'approvals' ? 'bg-[#37352f] text-white shadow-lg' : 'text-[#37352f]/40 hover:bg-slate-50'}`}>
            <ShieldAlert size={16} /> HRM Duyệt ({pendingMovements.length})
          </button>
        )}
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {activeSubTab === 'onboarding' && <OnboardingForm onSubmit={(data) => addMovement('ONBOARDING', data.name, data)} maskSalary={maskSalary} isSubmitting={busy || uploadLoading} />}
          {activeSubTab === 'leave' && <LeaveForm employees={employees} onSubmit={(data) => addMovement('LEAVE', data.employeeName, data)} isSubmitting={busy} />}
          {activeSubTab === 'career' && <CareerMovementForm employees={employees} onSubmit={(data) => addMovement('CAREER_CHANGE', data.employeeName, data)} maskSalary={maskSalary} isSubmitting={busy} />}
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
function OnboardingForm({ onSubmit, maskSalary: _maskSalary = false, isSubmitting = false }) {
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
    // Lấy dữ liệu và loại bỏ trùng lặp (chỉ lấy bản mới nhất cho mỗi Mã NV)
    const uniqueMap = new Map();
    JSON.parse(raw).forEach(c => {
       // Chỉ lấy những người chưa Báo tăng (onboarded !== true) 
       // và Stage < 3
       if (!c.onboarded && (c.workflowStage || 0) < 3) {
         uniqueMap.set(c.ma_nv || c.employeeId, c);
       }
    });
    
    let list = Array.from(uniqueMap.values());
    
    // Inject Mock Data if empty for testing
    if (list.length === 0 && raw === '[]') {
      const mock = [
        { id: 'mock-1', soHd: 'HĐLD-0001', ho_ten: 'Nguyễn Văn Mock', employeeId: '0001', branch: 'TRUNG MỸ TÂY', vi_tri: 'Giáo viên', workflowStage: 1, muc_luong: '15000000', quoc_tich: 'Việt Nam', dien_thoai: '0901234567', socccd: '012345678901' },
      ];
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
      employeeId: c.ma_nv || c.employeeId || '',
      contractNumber: c.so_hd || c.soHd || '',
      name: c.ho_ten || c.employeeName || '',
      nationality: c.quoc_tich || 'Việt Nam',
      birthDate: c.ngay_sinh || '',
      birthPlace: c.noi_sinh || '',
      cccd: c.socccd || c.cccd || '',
      cccdDate: c.ngaycapcccd || c.cccd_date || '',
      cccdPlace: c.noicapcccd || c.cccd_place || '',
      phone: c.dien_thoai || c.phone || '',
      email: c.email || '',
      permanentAddress: c.dia_chi || c.permanentAddress || '',
      temporaryAddress: c.dia_chi_tam_tru || c.temporaryAddress || '',
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
    <div className="max-w-5xl mx-auto pb-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">Báo tăng nhân sự</h3>
          <p className="text-sm font-medium text-gray-500">Quy trình tự động gửi yêu cầu lên HRM Tổng</p>
        </div>
        <div className="w-full md:w-72">
           <label className="text-xs font-semibold text-gray-600 mb-1 block">Lấy từ HĐ đã in (Hỗ trợ nhập liệu)</label>
           <select 
             className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900 outline-none focus:border-blue-500 shadow-sm cursor-pointer"
             value={selectedContractId}
             onChange={e => handleImportContract(e.target.value)}
           >
             <option value="">-- Chọn hợp đồng --</option>
             {pendingContracts.map(c => (
               <option key={c.id} value={c.id}>
                 {c.ma_nv || c.employeeId} - {c.ho_ten || c.employeeName}
               </option>
             ))}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: FORM INFO */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Hồ sơ nhân viên</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Mã nhân viên</label>
                <input type="text" className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-md text-sm font-medium text-gray-600 outline-none" value={formData.employeeId} readOnly />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Số hợp đồng</label>
                <input type="text" className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-md text-sm font-medium text-gray-600 outline-none" value={formData.contractNumber} readOnly />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-600">Họ và tên</label>
                <input type="text" className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-blue-500 shadow-sm" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Chức danh</label>
                <input type="text" className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-blue-500 shadow-sm" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Chi nhánh / Bộ phận</label>
                <input type="text" className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-md text-sm font-medium text-gray-600 outline-none" value={formData.department} readOnly />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: CHECKLIST & SCAN */}
        <div className="lg:col-span-4 space-y-4">
          {/* SCAN UPLOAD */}
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm bg-blue-50/10">
            <h4 className="text-sm font-semibold text-gray-900 mb-2.5 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded flex items-center justify-center text-[10px] font-bold">↑</span>
              Bản scan ký tay <span className="text-red-500">*</span>
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
            <label htmlFor="onboarding-scan" className="flex flex-col items-center justify-center gap-1.5 w-full py-4 bg-white border-2 border-slate-200 border-dashed rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${formData.scanFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {formData.scanFile ? '✓' : '📄'}
              </div>
              <div className="text-center px-2">
                <span className="text-xs font-medium text-gray-700 block">
                  {formData.scanFile ? 'Đã tải bản scan' : 'Tải lên PDF'}
                </span>
                {formData.scanFile && <span className="text-[11px] font-semibold text-emerald-600 block line-clamp-1 break-all">{formData.scanFile.name}</span>}
              </div>
            </label>
          </div>

          {/* CHECKLIST */}
          {requiredDocs && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
               <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                 <span className="w-5 h-5 border border-gray-300 text-gray-600 rounded flex items-center justify-center text-[10px] font-bold">✓</span>
                 Hồ sơ bản cứng đi kèm
               </h4>
               <div className="space-y-1">
                 {requiredDocs.map(doc => (
                   <label key={doc} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-md cursor-pointer hover:bg-blue-50/50 transition-all border border-transparent has-[:checked]:border-blue-200 has-[:checked]:bg-blue-50/30 group">
                     <input 
                       type="checkbox" 
                       checked={checklistValues[doc] || false}
                       onChange={e => setChecklistValues({ ...checklistValues, [doc]: e.target.checked })}
                       className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                     />
                     <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 leading-snug">{doc}</span>
                   </label>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* BOTTOM: NOTE & SUBMIT */}
        <div className="lg:col-span-12">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="text-xs font-semibold text-gray-900 mb-1.5 block">Ghi chú thêm cho HRM Tổng</label>
            <textarea 
              className="w-full p-2 bg-white border border-gray-200 rounded-md outline-none focus:border-blue-500 text-sm font-medium text-gray-900 min-h-[50px] resize-y transition-all"
              placeholder="VD: Thiếu CCCD photo bộ phận xin báo trước và nộp bản cứng sau 3 ngày..."
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
            />
            
            <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 pt-3">
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isChecklistComplete ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs font-medium text-gray-600">Đã chọn Checklist</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${formData.scanFile ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs font-medium text-gray-600">Có bản Scan</span>
                </div>
              </div>

              <button 
                disabled={!isReadyToSubmit || isSubmitting}
                onClick={() => {
                  if (!formData.scanFile) {
                    alert('Bạn bắt buộc phải tải lên bản Scan ký tay để Báo tăng nhân sự.');
                    return;
                  }
                  onSubmit({ ...formData, checklist: checklistValues, selectedContractId });
                }} 
                className={`w-full sm:w-auto px-5 py-2 font-semibold rounded-lg shadow-sm transition-all flex justify-center items-center gap-2 text-sm ${isReadyToSubmit && !isSubmitting ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
              >
                {(isSubmitting) ? 'Đang gửi...' : <><Send size={14} /> Gửi duyệt Báo tăng</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FORM 2: NGHỈ PHÉP / THAI SẢN ────────────────────────────────────
function LeaveForm({ employees, onSubmit, isSubmitting = false }) {
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
    <div className="max-w-4xl mx-auto pb-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
          <Calculator size={20} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">Tính toán nghỉ phép</h3>
          <p className="text-sm font-medium text-gray-500">Quản lý nghỉ phép năm, thai sản, ốm đau</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Phòng ban / Chi nhánh</label>
            <select className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-purple-500 shadow-sm" value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="ALL">Tất cả</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Tìm người</label>
            <input className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-purple-500 shadow-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Gõ mã NV hoặc tên" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Chọn nhân sự</label>
            <select className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-purple-500 shadow-sm cursor-pointer" value={selectedEmployeeId} onChange={e => {
              const id = e.target.value;
              setSelectedEmployeeId(id);
              const emp = employees.find(x => x.id === id);
              setFormData(prev => ({ ...prev, employeeName: emp?.name || '', employeeId: emp?.id || '' }));
            }}>
              <option value="">-- Chọn nhân viên --</option>
              {filteredEmployees.map(e => <option key={e.id} value={e.id}>{e.id} - {formatName(e.name)} ({formatBranch(e.department)})</option>)}
            </select>
          </div>
          <div className="md:col-span-2 mt-1">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Loại hình nghỉ</label>
            <div className="grid grid-cols-2 text-sm md:grid-cols-4 gap-2">
              {[
                { id: 'ANNUAL', label: 'Phép năm' },
                { id: 'SICK', label: 'Nghỉ ốm' },
                { id: 'MATERNITY', label: 'Thai sản' },
                { id: 'UNPAID', label: 'Không lương' }
              ].map(type => (
                <button key={type.id} onClick={() => setFormData({...formData, leaveType: type.id})} className={`p-2 text-sm font-semibold rounded-md border transition-all ${formData.leaveType === type.id ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Từ ngày</label>
            <input type="date" className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-purple-500 shadow-sm" value={formData.from} onChange={e => setFormData({...formData, from: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Đến ngày</label>
            <input type="date" className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-purple-500 shadow-sm" value={formData.to} onChange={e => setFormData({...formData, to: e.target.value})} />
          </div>

          <div className="md:col-span-2 pt-2">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 mb-1.5">
              <Paperclip size={14} className="text-gray-400" /> Tài liệu đính kèm (đơn xin, y tế...)
            </label>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium outline-none focus:border-purple-500"
              onChange={async (e) => {
                const items = await readFilesToAttachments(e.target.files);
                setAttachments(prev => [...prev, ...items]);
              }}
            />
            {attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map((a, idx) => (
                  <div key={idx} className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700 flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" />
                    <span className="max-w-[150px] truncate">{a.name}</span>
                    <button className="text-slate-400 hover:text-red-600 ml-1" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>
                      <XCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {stats && (
          <div className="mt-5 p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-0.5">KẾT QUẢ TÍNH TOÁN</div>
              <div className="text-lg font-bold">{stats.label}</div>
              <div className="text-[13px] text-slate-400 mt-0.5">{stats.detail} · {stats.isPaid ? 'Có lương' : 'Không lương'}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-purple-400 leading-none">{stats.days}</div>
              <div className="text-xs font-semibold text-slate-400 mt-1">Tổng số ngày</div>
            </div>
          </div>
        )}

        <button 
          disabled={isSubmitting}
          onClick={() => onSubmit({ ...formData, employeeName: selectedEmp?.name || formData.employeeName, employeeId: selectedEmp?.id || formData.employeeId, department: selectedEmp?.department || department, attachments, ...stats })} 
          className={`w-full mt-5 py-2.5 font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-[15px] ${isSubmitting ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
        >
          {isSubmitting ? 'Đang gửi...' : <><Send size={16} /> Gửi yêu cầu HRM</>}
        </button>
      </div>
    </div>
  );
}

// ─── FORM 3: BIẾN ĐỘNG CÔNG TÁC / LƯƠNG ──────────────────────────────
function CareerMovementForm({ employees, onSubmit, maskSalary = false, isSubmitting = false }) {
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
    (employees || []).forEach(e => set.add(e.department || ''));
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let list = Array.isArray(employees) ? employees : [];
    if (department !== 'ALL') list = list.filter(e => (e.department || '') === department);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(e => (e.name || '').toLowerCase().includes(s) || (e.id || '').toLowerCase().includes(s));
    }
    return list;
  }, [department, employees, search]);

  const selectedEmp = useMemo(() => {
    return (employees || []).find(e => e.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  return (
    <div className="max-w-4xl mx-auto pb-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
          <TrendingUp size={20} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">Biến động vị trí & Lương</h3>
          <p className="text-sm font-medium text-gray-500">Cập nhật bổ nhiệm, thăng tiến, phụ cấp</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Phòng ban / Chi nhánh</label>
            <select className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-orange-500 shadow-sm cursor-pointer" value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="ALL">Tất cả</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Tìm người</label>
            <input className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-orange-500 shadow-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Mã NV hoặc Tên" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Chọn nhân sự tiếp nhận biến động</label>
            <select className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-orange-500 shadow-sm cursor-pointer" value={selectedEmployeeId} onChange={e => {
              const id = e.target.value;
              setSelectedEmployeeId(id);
              const emp = (employees || []).find(x => x.id === id);
              setFormData(prev => ({
                ...prev,
                employeeId: emp?.id || '',
                employeeName: emp?.name || '',
                newDepartment: prev.newDepartment || emp?.department || ''
              }));
            }}>
              <option value="">-- Chọn nhân viên --</option>
              {filteredEmployees.map(e => <option key={e.id} value={e.id}>{e.id} - {formatName(e.name)} ({formatPosition(e.position)})</option>)}
            </select>
          </div>

          {selectedEmp && (
            <div className="md:col-span-2 p-3 bg-orange-50 border border-orange-100 rounded-lg flex items-center justify-between text-[13px] text-orange-900 mt-1">
              <div className="flex gap-6">
                <div><span className="text-orange-700 font-medium mr-1.5">Vai trò hiện tại:</span> <span className="font-bold">{formatPosition(selectedEmp.position)}</span></div>
                <div><span className="text-orange-700 font-medium mr-1.5">Trực thuộc:</span> <span className="font-bold">{formatBranch(selectedEmp.department)}</span></div>
              </div>
            </div>
          )}

          <div className="md:col-span-2 pt-2">
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Loại hình biến động</label>
            <div className="grid grid-cols-2 text-sm md:grid-cols-4 gap-2">
              {[
                { id: 'PROMOTION', label: 'Thăng chức' },
                { id: 'TRANSFER', label: 'Điều chuyển' },
                { id: 'SALARY_UP', label: 'Tăng lương' },
                { id: 'RESIGN', label: 'Nghỉ việc' }
              ].map(type => (
                <button key={type.id} onClick={() => setFormData({ ...formData, type: type.id })} className={`p-2 text-sm font-semibold rounded-md border transition-all ${formData.type === type.id ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Vị trí mới</label>
            <input type="text" className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-orange-500 shadow-sm" value={formData.newRole} onChange={e => setFormData({ ...formData, newRole: e.target.value })} placeholder={selectedEmp?.position} />
          </div>
          <div className="mt-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Chi nhánh trực thuộc mới</label>
            <input type="text" className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-orange-500 shadow-sm" value={formData.newDepartment} onChange={e => setFormData({ ...formData, newDepartment: e.target.value })} placeholder={selectedEmp?.department} />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Mức lương mới (số)</label>
            <input type={maskSalary ? "password" : "text"} className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-orange-500 shadow-sm" value={formData.newSalary} onChange={e => setFormData({ ...formData, newSalary: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Mức lương mới (chữ)</label>
            <input type="text" className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-orange-500 shadow-sm" value={formData.newSalaryText} onChange={e => setFormData({ ...formData, newSalaryText: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Cấp nhà ở (VNĐ/Tháng)</label>
            <input type="text" className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-orange-500 shadow-sm" value={formData.housingAllowance} onChange={e => setFormData({ ...formData, housingAllowance: e.target.value })} placeholder="..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Cấp đi lại (VNĐ/Tháng)</label>
            <input type="text" className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-orange-500 shadow-sm" value={formData.travelAllowance} onChange={e => setFormData({ ...formData, travelAllowance: e.target.value })} placeholder="..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Cấp điện thoại (VNĐ/Tháng)</label>
            <input type="text" className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-orange-500 shadow-sm" value={formData.phoneAllowance} onChange={e => setFormData({ ...formData, phoneAllowance: e.target.value })} placeholder="..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Ngày hiệu lực</label>
            <input type="date" className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-orange-500 shadow-sm" value={formData.effectiveDate} onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })} />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Lý do / Mô tả chi tiết</label>
            <textarea className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 outline-none focus:border-orange-500 shadow-sm min-h-[60px] resize-y" placeholder="Nhập tóm tắt..." value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
          </div>
        </div>

        <button
          disabled={isSubmitting}
          onClick={() => onSubmit({ ...formData, employeeName: selectedEmp?.name || formData.employeeName, employeeId: selectedEmp?.id || formData.employeeId, currentDepartment: selectedEmp?.department, currentRole: selectedEmp?.position })}
          className={`w-full mt-5 py-2.5 font-semibold rounded-lg shadow-sm flex justify-center items-center gap-2 transition-all text-[15px] ${isSubmitting ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-[#00288e] text-white hover:bg-[#001e6b]'}`}
        >
          {isSubmitting ? 'ĐANG GỬI...' : <><Send size={18} /> Báo cáo biến động</>}
        </button>
      </div>
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
                <span className="font-bold text-slate-800">{formatName(m.employeeName)}</span>
                <StatusBadge status={m.status} />
              </div>
              <div className="text-xs text-slate-400">{formatBranch(m.branchId)} · {m.type} · {format(parseISO(m.createdAt), 'dd/MM/yyyy HH:mm')}</div>
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
    'PENDING': { label: 'Chờ duyệt', class: 'bg-yellow-50 text-yellow-700 border border-yellow-100' },
    'APPROVED': { label: 'Đã duyệt', class: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    'REJECTED': { label: 'Từ chối', class: 'bg-red-50 text-red-700 border border-red-100' },
    'REVISION': { label: 'Kiểm tra lại', class: 'bg-orange-50 text-orange-700 border border-orange-100' }
  };
  const config = configs[status] || configs['PENDING'];
  return <span className={`text-sm font-bold px-3 py-1 rounded-lg ${config.class}`}>{config.label}</span>;
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
              <span className="font-bold text-slate-800">{formatName(m.employeeName)}</span>
              <StatusBadge status={m.status} />
            </div>
            <div className="text-xs text-slate-400">{formatBranch(m.branchId)} · {m.type} · {format(parseISO(m.createdAt), 'dd/MM/yyyy HH:mm')}</div>
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
            <div><span className="text-slate-400">Chức danh:</span> {formatPosition(m.details.position) || '---'}</div>
            <div><span className="text-slate-400">Phòng ban:</span> {formatBranch(m.details.department) || '---'}</div>
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
            <div><span className="text-slate-400">Mới:</span> {formatPosition(m.details.newRole) || '---'} ({m.details.newSalary || '---'})</div>
            <div><span className="text-slate-400">Phòng ban mới:</span> {formatBranch(m.details.newDepartment) || '---'}</div>
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
