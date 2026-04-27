import React, { useMemo, useState, useEffect } from 'react';
import { 
  ChevronRight, Star, Send, ShieldAlert, FileText, ExternalLink, X, 
  CheckCircle2, MessageSquare, FileCheck, User, Briefcase, Mail, Phone, 
  Building, DollarSign, Video, Ban, Calendar, MapPin, Home, GraduationCap, 
  Clock, Info, UserCheck, Award, RotateCcw 
} from 'lucide-react';
import { formatName, formatPosition, formatBranch } from '../../utils/formatters';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebase";

const CandidateInfoItem = ({ icon: Icon, label, value, color = 'text-gray-900', formatValue }) => (
  <div className="flex flex-col gap-2 py-3">
    <div className="flex items-center gap-2 text-gray-700 text-sm font-semibold tracking-wide">
      {React.createElement(Icon, { size: 16, className: 'text-[#00288e]' })}
      <span className="font-semibold">{label}</span>
    </div>
    <div className={`text-[15px] font-normal leading-relaxed text-gray-900 ${color}`}>
      {formatValue(value)}
    </div>
  </div>
);

const CandidateSectionTitle = ({ children, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0">
    <div className="p-1.5 bg-blue-50 rounded-lg">
      {React.createElement(Icon, { size: 18, className: 'text-[#00288e]' })}
    </div>
    <h3 className="text-lg font-bold text-gray-900 font-display">{children}</h3>
  </div>
);

const CandidateDetailModal = ({ 
  isOpen, 
  onClose, 
  candidate, 
  mode = 'VIEW', 
  isHRM = false,
  branches = [],
  onSubmitEval,
  onReject,
  onAssign,
  onBranchAction
}) => {
  const [decision, setDecision] = useState(candidate?.decision || 'Đạt');
  const [note, setNote] = useState(candidate?.note || '');
  const [rejectReason, setRejectReason] = useState('Không phù hợp văn hóa');
  const [assignBranch, setAssignBranch] = useState(candidate?.branch || '');
  const [scheduleDate, setScheduleDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLockedLocal, setIsLockedLocal] = useState(candidate?.locked || false);
  const [reasonLocal, setReasonLocal] = useState(candidate?.locked_reason || '');
  const [branchs, setBranchs] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "branchs"));

        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setBranchs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, []);

  const branchOptions = Array.isArray(branchs)
  ? branchs.map(b => ({
      value: b.value,
      label: b.label,
    }))
  : [];

  React.useEffect(() => {
    setIsLockedLocal(candidate?.locked || false);
    setReasonLocal(candidate?.locked_reason || '');
  }, [candidate?.locked, candidate?.locked_reason]);

  const getEmbedtableUrl = (url) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      let id = '';
      if (url.includes('id=')) {
        id = url.split('id=')[1].split('&')[0];
      } else if (url.includes('/file/d/')) {
        id = url.split('/file/d/')[1].split('/')[0];
      }
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
    }
    return url;
  };

  const cvPreviewUrl = getEmbedtableUrl(candidate?.cvLink || candidate?.cv_url);

  if (!isOpen || !candidate) return null;

  const isCompleted = (candidate.status === 'COMPLETED' || candidate.status === 'Nhận việc');
  const isRejected = (candidate.status === 'REJECTED' || candidate.status === 'Từ chối');

  const c = candidate?.rawData ? { ...candidate.rawData, ...candidate } : candidate;

  const formatValue = (v) => {
    if (v === true) return 'Có';
    if (v === false) return 'Không';
    if (v === 0) return '0';
    const s = String(v ?? '').trim();
    return s ? s : 'không có';
  };

  const pick = (obj, keys) => {
    for (const key of keys) {
      const v = obj?.[key];
      if (v === 0 || v === false) return v;
      if (v === null || v === undefined) continue;
      if (typeof v === 'string' && !v.trim()) continue;
      return v;
    }
    return undefined;
  };

  const displayName = formatName(pick(c, ['name', 'Họ và tên ứng viên', 'Họ và tên', 'Họ tên']));
  const displayPosition = formatPosition(pick(c, ['position', 'Vị trí ứng tuyển', 'Vị trí']));

  const getExperienceValue = () => {
    const v = pick(c, [
      'experience_value',
      'Kinh nghiệm',
      'Bạn có bao nhiêu kinh nghiệm ở vị trí ứng tuyển?',
      'Bạn có bao nhiêu kinh nghiệm ở vị trí ứng tuyển? -> kinh nghiệm (unit: năm)',
    ]);
    if (typeof v === 'number') return `${v} năm`;
    const s = String(v ?? '').trim();
    if (!s) return 'không có';
    const n = Number(s);
    if (!Number.isNaN(n)) return `${n} năm`;
    return s;
  };

  const formatDate = (v) => {
  if (!v) return 'không có';

  const d = new Date(v);
  if (isNaN(d)) return v;

  return d.toLocaleDateString('vi-VN'); // 👉 01/03/2025
};

  const getWorkingTimeValue = () => {
    const source = c?.raw_data || c;

    const v = pick(source, [
      'Working_Time',
      'time',
      'workingTime',
      'Thời gian làm việc',
    ]);

    return String(v || '').trim() || 'không có';
  };

    const re = /thời gian.*làm việc/i;
    for (const [k, v] of Object.entries(c || {})) {
      if (!re.test(k)) continue;
      const sv = String(v ?? '').trim();
      if (!sv) continue;
      parts.push(`${k}: ${sv}`);
    }

    const unique = Array.from(new Set(parts)).filter(Boolean);
    return unique.length ? unique.join('\n') : 'không có';
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-6xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[90vh] animate-in fade-in zoom-in duration-300">
        
        {/* Left Section: CV Preview Protected (Hidden on small screens) */}
        <div className="hidden lg:flex flex-1 bg-slate-100 relative h-full flex-col border-r border-slate-200">


          {cvPreviewUrl ? (
            <iframe src={cvPreviewUrl} className="w-full h-full border-none" title="CV Document" allow="autoplay" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
              <FileText size={80} className="mb-6 opacity-20" />
              <p className="font-bold text-xl text-gray-600 mb-2">Bản CV không khả dụng</p>
              <p className="text-sm font-medium max-w-xs mx-auto text-slate-500">Chưa có liên kết CV hoặc định dạng không hỗ trợ.</p>
              <a 
                href={candidate?.cvLink || candidate?.cvUrl || candidate?.cv_url} target="_blank" rel="noreferrer"
                className="mt-8 px-6 py-3 bg-[#00288e] text-white rounded-xl font-bold text-sm hover:bg-blue-800 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
              >
                <ExternalLink size={18} /> Mở Google Link Trực Tiếp (Bypass)
              </a>
            </div>
          )}
        </div>

        {/* Right Section: Details & Evaluation */}
        <div className="w-full lg:w-[480px] bg-white flex flex-col h-full overflow-hidden">
          {/* Header Mobile/Tablet */}
          <div className="lg:hidden h-24 bg-gradient-to-r from-[#00288e] to-[#1e40af] p-6 flex items-center justify-between shrink-0">
             <div className="text-white">
                <h2 className="text-lg font-bold truncate">{displayName}</h2>
                <p className="text-sm opacity-80">{displayPosition}</p>
             </div>
             <button onClick={onClose} className="p-2 bg-white/10 text-white rounded-full"><X size={20} /></button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            {/* Tabs for View / Evaluate if HRM */}
            {mode === 'EVALUATE' || (isHRM && !isCompleted && !isRejected) ? (
              <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100">
                   <div>
                     <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                      {mode === 'EVALUATE' ? 'Đánh Giá Phỏng Vấn' : 'Thông Tin Ứng Viên'}
                     </h3>
                     <div className="flex items-center gap-3 mt-1">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00288e] to-[#1e40af] flex items-center justify-center text-white text-lg font-bold shadow-sm">
                         {candidate.name?.split(' ').slice(-1)[0][0] || 'U'}
                       </div>
                       <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{displayName}</h2>
                        <p className="text-sm font-bold text-[#00288e] uppercase tracking-wider">{displayPosition}</p>
                       </div>
                     </div>
                   </div>
                   <button onClick={onClose} className="hidden lg:block p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                      <X size={24} />
                   </button>
                </div>

                {mode === 'EVALUATE' ? (
                  /* EVALUATION FORM */
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                       <div className="flex items-center gap-2 text-blue-800 font-bold text-sm uppercase mb-3 tracking-wider">
                          <CheckCircle2 size={16} /> Quyết định tuyển dụng
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => !isCompleted && setDecision('Đạt')} 
                            disabled={isCompleted}
                            className={`py-3 rounded-xl font-bold text-sm transition-all border-2 ${decision === 'Đạt' ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}
                          >Tuyển Dụng</button>
                          <button 
                            onClick={() => !isCompleted && setDecision('Không đạt')} 
                            disabled={isCompleted}
                            className={`py-3 rounded-xl font-bold text-sm transition-all border-2 ${decision === 'Không đạt' ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}
                          >Không Đạt</button>
                       </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                         <MessageSquare size={14} className="text-[#00288e]" /> Nhận xét chuyên môn & Thái độ
                      </label>
                      <textarea 
                        value={note} 
                        onChange={(e) => setNote(e.target.value)} 
                        disabled={isCompleted}
                        placeholder="Nhập đánh giá chi tiết chuyên môn, điểm mạnh, điểm yếu và thái độ ứng viên..."
                        className="w-full h-40 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium text-gray-700 focus:border-[#00288e] outline-none resize-none transition-colors"
                      ></textarea>
                    </div>

                    {!isCompleted ? (
                      <button 
                        onClick={() => onSubmitEval && onSubmitEval({ decision, note })}
                        className="w-full py-4 bg-gradient-to-r from-[#00288e] to-[#1e40af] text-white rounded-2xl font-bold uppercase tracking-widest text-sm transition-all shadow-xl shadow-blue-200 flex justify-center items-center gap-2"
                      >
                        <FileCheck size={20} /> Gửi Kết Quả Đánh Giá
                      </button>
                    ) : (
                      <div className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold uppercase tracking-widest text-sm flex justify-center items-center gap-2 border border-gray-200 cursor-not-allowed">
                        <CheckCircle2 size={20} /> Đã Hoàn Thành Đánh Giá
                      </div>
                    )}
                  </div>
                ) : (
                  /* VIEW INFO IN EVALUATE MODE (As side info) */
                  <div className="space-y-4">
                     <CandidateSectionTitle icon={User}>Hồ sơ nhân sự</CandidateSectionTitle>
                     <div className="divide-y divide-gray-100">
                        <CandidateInfoItem icon={Briefcase} label="Vị trí ứng tuyển" value={pick(c, ['position', 'Vị trí ứng tuyển', 'Vị trí'])} color="text-[#00288e] font-bold" formatValue={formatValue} />
                        <CandidateInfoItem icon={Mail} label="Địa chỉ email" value={pick(c, ['gmail', 'Địa chỉ email', 'Email', 'Email liên hệ', 'Email liên hệ:'])} formatValue={formatValue} />
                        <CandidateInfoItem icon={Phone} label="Số điện thoại liên hệ" value={pick(c, ['phone', 'Số điện thoại liên hệ', 'Số điện thoại', 'SĐT', 'Điện thoại'])} formatValue={formatValue} />
                        <CandidateInfoItem icon={Building} label="Chi nhánh ứng tuyển" value={formatBranch(pick(c, ['branch', 'Chi nhánh ứng tuyển', 'Chi nhánh mong muốn', 'desiredBranch', 'Bạn muốn làm việc ở địa chỉ nào của Trung tâm Á châu? -> chi nhánh ứng tuyển', 'Bạn muốn làm việc ở địa chỉ nào của Trung tâm Á châu?']))} formatValue={formatValue} />
                        <CandidateInfoItem icon={DollarSign} label="Mức lương bạn mong muốn" value={pick(c, ['expected_salary', 'salaryWant', 'Mức lương bạn mong muốn', 'mức lương bạn mong muốn'])} color="text-emerald-600 font-bold" formatValue={formatValue} />
                     </div>
                     
                     {/* Links */}
                     <div className="grid grid-cols-2 gap-3 mt-4">
                        <a href={candidate.cvLink || candidate.cv_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors">
                           <FileText size={16} className="text-[#00288e]" />
                           <span className="text-sm font-bold text-gray-600">Mở CV</span>
                        </a>
                        <button onClick={() => mode === 'VIEW' ? onClose() : undefined} className="flex items-center justify-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors">
                           <Video size={16} className="text-gray-400" />
                           <span className="text-sm font-bold text-gray-400">Video</span>
                        </button>
                     </div>

                     {isHRM && !isCompleted && !isRejected && (
                        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-6">
                          <div>
                            <label className="text-sm font-bold text-amber-600 uppercase tracking-widest block mb-4">Điều phối phỏng vấn (HRM Only)</label>
                            {isLockedLocal && (
                              <div className="mb-4 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm font-semibold leading-relaxed">
                                {reasonLocal || 'Ứng viên đã được điều phối và đang bị khoá.'}
                              </div>
                            )}
                            {!isLockedLocal && candidate?.assignment_type === 'internal' && (
                              <div className="mb-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold leading-relaxed">
                                HRM giữ để PV
                              </div>
                            )}

                            <div className="flex flex-col gap-5">
                              <div className="flex flex-col gap-3">
                                <select 
                                  value={assignBranch} 
                                  onChange={(e) => setAssignBranch(e.target.value)}
                                  disabled={candidate?.locked}
                                  className="w-full p-3 border-2 border-amber-100 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-amber-400 bg-amber-50/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                  <option value="">-- Chọn chi nhánh --</option>
                                  {branchOptions.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={async () => {
                                    if (isLockedLocal) {
                                      alert('Ứng viên đang bị khoá. Vui lòng Thu hồi/Mở khoá trước khi điều phối lại.');
                                      return;
                                    }
                                    if (!assignBranch) {
                                      alert('Vui lòng chọn chi nhánh trước khi gửi.');
                                      return;
                                    }
                                    const selected = branchOptions.find(o => o.value === assignBranch);
                                    if (!selected) {
                                      alert('Chi nhánh không hợp lệ. Vui lòng chọn lại.');
                                      return;
                                    }
                                    const label = selected.label || assignBranch;
                                    if (onAssign) {
                                      setIsSubmitting(true);
                                      try {
                                        const res = await onAssign({ branch: assignBranch, branch_label: label, assignment_type: 'branch' });
                                        if (res) {
                                          alert('Gửi cho chi nhánh thành công! Chờ thông báo Email.');
                                          if (candidate) {
                                             candidate.locked = true;
                                             candidate.locked_reason = `Đã phân công về chi nhánh: ${label}`;
                                          }
                                          setIsLockedLocal(true);
                                          setReasonLocal(`Đã phân công về chi nhánh: ${label}`);
                                        }
                                      } finally {
                                        setIsSubmitting(false);
                                      }
                                    }
                                  }}
                                  disabled={isLockedLocal || isSubmitting}
                                  className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all flex justify-center items-center gap-2 shadow-lg ${
                                    isLockedLocal || isSubmitting
                                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                      : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200'
                                  }`}
                                >
                                  {isSubmitting ? 'ĐANG GỬI THÔNG BÁO...' : <><Send size={18} /> Gửi cho Chi nhánh (Kèm Email)</>}
                                </button>
                              </div>

                              <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                                <div className="flex flex-col gap-2">
                                  <label className="text-xs font-bold text-blue-700">Lịch hẹn phỏng vấn (HRM):</label>
                                  <input 
                                    type="datetime-local" 
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    disabled={isLockedLocal}
                                    className="p-3 border border-blue-200 rounded-xl outline-none focus:border-blue-500 font-medium disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                                  />
                                </div>
                                <button 
                                  onClick={() => {
                                    if (isLockedLocal) {
                                      alert('Ứng viên đang bị khoá. Vui lòng Thu hồi/Mở khoá trước khi điều phối lại.');
                                      return;
                                    }
                                    if (!scheduleDate) return alert('Vui lòng chọn ngày giờ phỏng vấn');
                                    onAssign && onAssign({ branch: 'HRM_INTERNAL', assignment_type: 'internal', interview_date: scheduleDate.replace('T', ' ') });
                                  }}
                                  disabled={isLockedLocal}
                                  className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all flex justify-center items-center gap-2 shadow-lg ${
                                    isLockedLocal 
                                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                                  }`}
                                >
                                  <ShieldAlert size={18} /> Lên Lịch & Tự Phỏng Vấn (HRM)
                                </button>
                                <p className="text-xs text-gray-500 italic text-center">Hồ sơ sẽ không giao về chi nhánh nào. Hệ thống sẽ tự ghi Supabase & đồng bộ Google Sheets để gửi Email.</p>
                              </div>

                              {isLockedLocal && (
                                <button
                                  onClick={() => {
                                    const reason = window.prompt('Nhập lý do thu hồi/mở khoá:');
                                    if (!reason) return;
                                    onBranchAction && onBranchAction('UNLOCK', { reason });
                                  }}
                                  className="w-full py-3 bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 shadow-sm"
                                >
                                  <RotateCcw size={18} /> Thu hồi / Mở khoá
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="pt-6 border-t border-gray-100">
                            <label className="text-sm font-bold text-rose-500 uppercase tracking-widest block mb-4">Loại hồ sơ (HRM Only)</label>
                            <div className="flex flex-col gap-3">
                              <select 
                                value={rejectReason} 
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full p-3 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-rose-400 bg-gray-50"
                              >
                                <option value="Không phù hợp văn hóa">Không phù hợp văn hóa</option>
                                <option value="Không đạt kỹ năng">Không đạt kỹ năng chuyên môn</option>
                                <option value="Mức lương quá cao">Mức lương yêu cầu quá cao</option>
                                <option value="Ứng viên từ chối/Không đến">Ứng viên từ chối / Không đến</option>
                              </select>
                              <button 
                                onClick={() => onReject && onReject(rejectReason)}
                                className="w-full py-3 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100 rounded-xl font-bold uppercase tracking-widest text-sm transition-all flex justify-center items-center gap-2"
                              >
                                <Ban size={16} /> Chấm dứt quy trình
                              </button>
                            </div>
                          </div>
                        </div>
                     )}
                  </div>
                )}
              </div>
            ) : (
              /* PURE VIEW MODE (The one user requested) */
              <>
                <div className="flex items-center justify-between mb-6">
                   <h1 className="text-2xl font-bold text-gray-900 font-display">Chi Tiết Ứng Viên</h1>
                   <button onClick={onClose} className="hidden lg:block p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                      <X size={24} />
                   </button>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00288e] to-[#1e40af] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-200">
                      {candidate.name?.split(' ').slice(-1)[0][0] || 'U'}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                      <p className="text-sm font-bold text-[#00288e] uppercase tracking-wider">{displayPosition}</p>
                    </div>
                  </div>

                  <div>
                    <CandidateSectionTitle icon={User}>Thông tin cá nhân</CandidateSectionTitle>
                    <div className="divide-y divide-gray-100">
                      <CandidateInfoItem icon={Mail} label="Địa chỉ email" value={pick(c, ['gmail', 'Địa chỉ email', 'Email', 'Email liên hệ', 'Email liên hệ:'])} formatValue={formatValue} />
                      <CandidateInfoItem icon={Phone} label="Số điện thoại liên hệ" value={pick(c, ['phone', 'Số điện thoại liên hệ', 'Số điện thoại', 'SĐT', 'Điện thoại'])} formatValue={formatValue} />
                      <CandidateInfoItem icon={Calendar} label="Ngày tháng năm sinh" value={pick(c, ['birth', 'Ngày tháng năm sinh', 'Ngày sinh', 'Ngày sinh:'])} formatValue={formatDate} />
                      <CandidateInfoItem icon={MapPin} label="Địa chỉ hiện tại" value={pick(c, ['current_address', 'Địa chỉ hiện tại', 'Địa chỉ hiện tại:', 'Địa chỉ'])} formatValue={formatValue} />
                      <CandidateInfoItem icon={User} label="Giới tính" value={pick(c, ['gender', 'Giới tính'])} formatValue={formatValue} />
                      <CandidateInfoItem icon={Home} label="Tình trạng nhà" value={pick(c, ['livingState', 'Tình trạng nhà', 'Loại nhà ở', 'house'])} formatValue={formatValue} />
                    </div>
                  </div>

                  <div>
                    <CandidateSectionTitle icon={GraduationCap}>Học vấn & Kinh nghiệm</CandidateSectionTitle>
                    <div className="divide-y divide-gray-100">
                      <CandidateInfoItem icon={GraduationCap} label="Chuyên ngành" value={pick(c, ['graduation_cap', 'Chuyên ngành', 'Chuyên ngành của bạn là gì? -> chuyên ngành', 'Chuyên ngành của bạn là gì?'])} formatValue={formatValue} />
                      <CandidateInfoItem icon={Clock} label="Kinh nghiệm (năm)" value={getExperienceValue()} formatValue={formatValue} />
                      <CandidateInfoItem icon={Building} label="Bạn đã làm việc ở công ty/trung tâm nào?" value={pick(c, ['company_old', 'Nơi làm việc cũ', 'Bạn đã làm việc ở công ty hay trung tâm nào?'])} formatValue={formatValue} />
                      <CandidateInfoItem icon={MessageSquare} label="Lí do nghỉ việc ở công ty/trung tâm cũ?" value={pick(c, ['reason_leave', 'reason', 'Lí do nghỉ việc ở công ty/ trung tâm cũ?', 'Lý do nghỉ việc ở công ty/ trung tâm cũ?', 'Lý do nghỉ việc'])} color="italic text-rose-600 whitespace-pre-wrap" formatValue={formatValue} />
                    </div>
                  </div>

                  <div>
                    <CandidateSectionTitle icon={Info}>Thông tin bổ sung</CandidateSectionTitle>
                    <div className="divide-y divide-gray-100">
                      <CandidateInfoItem icon={Building} label="Chi nhánh ứng tuyển" value={formatBranch(pick(c, ['branch', 'Chi nhánh ứng tuyển', 'Chi nhánh mong muốn', 'desiredBranch', 'Bạn muốn làm việc ở địa chỉ nào của Trung tâm Á châu? -> chi nhánh ứng tuyển', 'Bạn muốn làm việc ở địa chỉ nào của Trung tâm Á châu?']))} formatValue={formatValue} />
                      <CandidateInfoItem icon={ChevronRight} label="Sẵn sàng di chuyển theo sắp xếp công ty?" value={pick(c, ['ready_to_relocate', 'Sẵn sàng di chuyển', 'Bạn có sẵn sàng di chuyển theo sự sắp xếp của công ty không?'])} formatValue={formatValue} />
                      <CandidateInfoItem icon={Calendar} label="Thời gian làm việc mong muốn" value={getWorkingTimeValue()} color="whitespace-pre-wrap" formatValue={formatValue} />
                      <div className="divide-y divide-gray-100">
                        <CandidateInfoItem icon={DollarSign} label="Mức lương bạn mong muốn" value={pick(c, ['expected_salary', 'salaryWant', 'Mức lương bạn mong muốn', 'mức lương bạn mong muốn'])} color="text-[#00288e] font-bold whitespace-pre-wrap" formatValue={formatValue} />
                        <CandidateInfoItem icon={UserCheck} label="Miêu tả bản thân bằng 3 từ" value={pick(c, ['describe_yourself', 'Hãy miêu tả bản thân bạn bằng 3 từ:', 'Hãy miêu tả bản thân bạn bằng 3 từ', '3 từ', 'describe3Words'])} color="text-gray-700 font-semibold whitespace-pre-wrap" formatValue={formatValue} />
                      </div>
                      <CandidateInfoItem icon={Award} label="Người giới thiệu" value={pick(c, ['referrer', 'Người giới thiệu', 'Referral'])} formatValue={formatValue} />
                    </div>
                  </div>

                  {(candidate.cvLink || candidate.cv_url) && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                      <div className="flex items-center gap-2 text-[#00288e] font-bold text-sm uppercase mb-3">
                         <FileText size={16} /> Link tài liệu
                      </div>
                      <div className="flex flex-col gap-2">
                         <a href={candidate.cvLink || candidate.cv_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-xl hover:shadow-md transition-all group">
                            <span className="text-sm font-bold text-gray-700">Xem Hồ sơ (CV)</span>
                            <ExternalLink size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </a>
                         {candidate.video_url && (
                           <a href={candidate.video_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-white border border-purple-200 rounded-xl hover:shadow-md transition-all group">
                              <span className="text-sm font-bold text-gray-700">Video giới thiệu</span>
                              <Video size={16} className="text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                           </a>
                         )}
                      </div>
                    </div>
                  )}

                  {candidate.status !== 'PENDING' && (
                    <div className="p-4 bg-slate-900 rounded-2xl text-white">
                       <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Trạng thái tuyển dụng</div>
                       <div className="text-base font-bold flex items-center gap-2">
                         <Star size={18} className="text-amber-400 fill-amber-400" />
                         {(candidate.status === 'SENT_TO_BRANCH' || candidate.status === 'Đã chuyển cho chi nhánh') ? 'Đang phỏng vấn tại chi nhánh' : 
                          (candidate.status === 'COMPLETED' || candidate.status === 'Nhận việc') ? 'Tuyển dụng chính thức' : 
                          (candidate.status === 'REJECTED' || candidate.status === 'Từ chối') ? 'Từ chối / Loại' : 'Chưa xử lý'}
                       </div>
                       {candidate.note && (
                        <div className="mt-3 text-sm bg-white/10 p-3 rounded-xl border border-white/10 italic text-slate-200">
                           "{candidate.note}"
                        </div>
                       )}
                    </div>
                  )}

                  {!isHRM && (candidate.status === 'SENT_TO_BRANCH' || candidate.status === 'Đã chuyển cho chi nhánh') && (
                    <div className="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50 mt-6">
                       <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-widest mb-4">Phản hồi từ Chi nhánh</h3>
                       <div className="flex flex-col gap-4">
                         
                         <div className="flex flex-col gap-2">
                           <label className="text-xs font-bold text-indigo-700">Lịch hẹn phỏng vấn (Nếu nhận):</label>
                           <input 
                             type="datetime-local" 
                             value={scheduleDate}
                             onChange={(e) => setScheduleDate(e.target.value)}
                             className="p-3 border border-indigo-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                           />
                         </div>

                         <div className="grid grid-cols-2 gap-3 mt-2">
                            <button 
                              onClick={() => {
                                if (!scheduleDate) return alert('Vui lòng chọn ngày giờ phỏng vấn');
                                onBranchAction && onBranchAction('SCHEDULE', { interview_scheduled_date: scheduleDate.replace('T', ' ') });
                              }}
                              className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex justify-center items-center gap-2"
                            >
                              <CheckCircle2 size={18} /> Nhận & Hẹn phỏng vấn
                            </button>
                            <button 
                              onClick={() => onBranchAction && onBranchAction('REJECT')}
                              className="py-3 bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 shadow-sm"
                            >
                              <Ban size={18} /> Không nhận
                            </button>
                         </div>
                       </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer for VIEW mode when not evaluated */}
          {mode === 'VIEW' && !isCompleted && !isRejected && (
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
               <button 
                onClick={onClose}
                className="px-8 py-3 bg-[#00288e] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-blue-200"
              >
                Đóng
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CandidateDetailModal;
