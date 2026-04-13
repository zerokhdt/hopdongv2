import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserSearch, Send, FileCheck, CheckCircle2, XCircle, 
  MessageSquare, Star, Clock, Building2, UserCircle, 
  ExternalLink, ArrowRight, UserPlus, FileText, Search, Filter, History, AlertTriangle, RotateCcw, Users, RefreshCw
} from 'lucide-react';
import { parseCsv } from '../utils/csv';

// Helper to convert Google Drive link to Preview link
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

export default function RecruitmentView({ userRole, branchId, employees }) {
  const isAdmin = userRole === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'pipeline' : 'my-interviews');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Mock Data dựa trên cấu trúc Google Sheet bạn cung cấp (Cột A, E, F, Q, K, P)
  const [candidates, setCandidates] = useState([]);

  // Fetch real Google Sheet data via CSV export and CORS proxy
  const fetchLiveCandidates = async () => {
    setIsSyncing(true);
    try {
      const targetUrl = 'https://docs.google.com/spreadsheets/d/1uW9XQdQXXnfaKyir0zBf9C5KMYzROUgLRb_Te6UJArk/export?format=csv&gid=0';
      const resp = await fetch('https://corsproxy.io/?' + encodeURIComponent(targetUrl));
      const text = await resp.text();
      const rows = parseCsv(text);
      
      if (rows && rows.length > 3) {
        const newCandidates = [];
        // Bỏ qua 3 dòng đầu vì chúng là header báo cáo của Google form
        for (let i = 3; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[1] || row[1].includes('Dấu thời gian')) continue;

          newCandidates.push({
            id: row[1].trim(), // Cột B: Timestamp
            name: (row[5] || 'Ứng viên chưa rõ').trim(), // Cột F
            position: (row[17] || 'Ứng viên').trim(), // Cột R
            source: 'Google Sheet',
            appliedAt: new Date().toISOString(), 
            branch: (row[10] || 'HEAD OFFICE').split(':')[0].trim(), // Cột K
            status: 'PENDING',
            phone: (row[6] || '').trim(), // Cột G
            email: (row[3] || '').trim(), // Cột D
            cvUrl: getEmbedtableUrl((row[16] || '').trim()) // Cột Q
          });
        }

        setCandidates(newCandidates);
      }
    } catch (e) {
      console.error("Lỗi đồng bộ Sheet tuyển dụng:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchLiveCandidates();
  }, []);

  const handleAction = (candidateId, action, extra = {}) => {
    setCandidates(prev => prev.map(c => {
      if (c.id !== candidateId) return c;
      const now = new Date().toISOString();
      let newHistory = [...(c.history || [])];
      
      if (action === 'SEND') {
        const deadline = extra.deadline || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
        newHistory.push({ time: now, event: `HRM gửi hồ sơ cho chi nhánh ${extra.branch}. Hạn xử lý: ${new Date(deadline).toLocaleString('vi-VN')}` });
        return { ...c, status: 'SENT_TO_BRANCH', branch: extra.branch, interviewer: extra.interviewer, sentAt: now, deadline, history: newHistory };
      }
      if (action === 'WITHDRAW') {
        newHistory.push({ time: now, event: `HRM RÚT HỒ SƠ VỀ do chi nhánh quá hạn xử lý hoặc thay đổi luồng PV.` });
        return { ...c, status: 'PENDING', branch: 'HEAD OFFICE', interviewer: '', deadline: null, history: newHistory };
      }
      if (action === 'COMPLETE') {
        newHistory.push({ time: now, event: `${c.interviewer || extra.interviewer || 'Người PV'} đã nộp kết quả: ${extra.decision}` });
        return { ...c, status: 'COMPLETED', ...extra, history: newHistory };
      }
      return c;
    }));
  };

  const getTimeStatus = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    if (diff < 0) return 'EXPIRED';
    if (diff < 12 * 60 * 60 * 1000) return 'URGENT';
    return 'NORMAL';
  };

  const filteredCandidates = useMemo(() => {
    let list = candidates;
    if (activeTab === 'pipeline') {
      list = list.filter(c => c.status === 'PENDING');
    } else if (activeTab === 'monitoring') {
      list = list.filter(c => c.status === 'SENT_TO_BRANCH' || (c.status === 'COMPLETED' && c.interviewer !== 'HRM Admin'));
    } else if (activeTab === 'my-interviews') {
      if (isAdmin) {
        list = list.filter(c => c.interviewer === 'HRM Admin' || c.status === 'PENDING');
      } else {
        list = list.filter(c => (c.branch === branchId || c.interviewer === (branchId ? `Manager ${branchId}` : 'Manager')) && c.status === 'SENT_TO_BRANCH');
      }
    } else if (activeTab === 'completed') {
      list = list.filter(c => c.status === 'COMPLETED');
    }

    if (searchTerm) {
      list = list.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return list;
  }, [candidates, activeTab, isAdmin, branchId, searchTerm]);

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7] p-6 lg:p-8 overflow-hidden uppercase-none">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Hệ thống Tuyển dụng ACE</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase ${isAdmin ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-blue-600 text-white shadow-lg shadow-blue-100'}`}>
              {isAdmin ? 'QUYỀN HRM TỔNG (DIRECTOR)' : `QUẢN LÝ CHI NHÁNH: ${branchId}`}
            </span>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Tìm ứng viên..."
            className="pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-[24px] outline-none focus:border-blue-500 w-full md:w-96 shadow-xl shadow-slate-200/40 font-bold text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABS HỆ THỐNG */}
      <div className="flex bg-white rounded-[26px] border border-slate-200 p-2 gap-2 mb-8 shadow-sm">
        {isAdmin && (
          <>
            <TabButton active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} icon={<UserSearch size={18} />} label="Nguồn ứng viên" />
            <TabButton active={activeTab === 'monitoring'} onClick={() => setActiveTab('monitoring')} icon={<History size={18} />} label="Giám sát Chi nhánh" color="orange" />
          </>
        )}
        <TabButton active={activeTab === 'my-interviews'} onClick={() => setActiveTab('my-interviews')} icon={<MessageSquare size={18} />} label={isAdmin ? "Tôi trực tiếp PV" : "Hồ sơ chờ PV"} color="blue" />
        <TabButton active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} icon={<CheckCircle2 size={18} />} label="Lịch sử kết quả" color="emerald" />
      </div>

      {/* DANH SÁCH ỨNG VIÊN - DẠNG TABLE PREMIUM */}
      <div className="flex-1 bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-white overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Ứng viên</th>
                <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Vị trí</th>
                <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Chi nhánh PV</th>
                <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Trạng thái</th>
                <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Hạn chót</th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCandidates.map(c => {
                const timeStatus = getTimeStatus(c.deadline);
                return (
                  <CandidateRow
                    key={c.id}
                    candidate={c}
                    isAdmin={isAdmin}
                    currentTab={activeTab}
                    timeStatus={timeStatus}
                    onSend={(data) => handleAction(c.id, 'SEND', data)}
                    onWithdraw={() => handleAction(c.id, 'WITHDRAW')}
                    onStart={() => {
                      if (timeStatus === 'EXPIRED' && !isAdmin) {
                        alert('Hồ sơ này đã quá hạn phỏng vấn (48h). Hệ thống đã chặn quyền PV của chi nhánh. Vui lòng liên hệ HRM.');
                        return;
                      }
                      setSelectedCandidate(c);
                      setIsEvaluationOpen(true);
                    }}
                  />
                );
              })}
            </tbody>
          </table>

          {filteredCandidates.length === 0 && (
            <div className="py-32 text-center">
              <FileText size={48} className="text-slate-200 mx-auto mb-4" />
              <h3 className="text-slate-400 font-black uppercase tracking-[0.3em] text-sm">Danh sách trống</h3>
            </div>
          )}
        </div>
      </div>

      {/* EVALUATION MODAL */}
      {isEvaluationOpen && selectedCandidate && (
        <EvaluationModal 
          candidate={selectedCandidate} 
          isHRM={isAdmin}
          onClose={() => setIsEvaluationOpen(false)}
          onSubmit={(results) => {
            handleAction(selectedCandidate.id, 'COMPLETE', { 
              ...results, 
              interviewer: isAdmin ? 'HRM Admin' : (branchId ? `Manager ${branchId}` : 'Manager') 
            });
            setIsEvaluationOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── COMPONENT CON ──────────────────────────────────────────────────

function TabButton({ active, onClick, icon, label, color = 'blue' }) {
  const colorMap = {
    blue: active ? 'bg-blue-600 text-white shadow-blue-200' : 'text-slate-500 hover:bg-slate-50',
    orange: active ? 'bg-orange-600 text-white shadow-orange-200' : 'text-slate-500 hover:bg-slate-50',
    emerald: active ? 'bg-emerald-600 text-white shadow-emerald-200' : 'text-slate-500 hover:bg-slate-50',
  };
  return (
    <button onClick={onClick} className={`flex-1 py-4 rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${colorMap[color]}`}>
      {icon} {label}
    </button>
  );
}

function CandidateRow({ candidate, isAdmin, currentTab, timeStatus, onSend, onWithdraw, onStart }) {
  const [showSendMenu, setShowSendMenu] = useState(false);
  
  const statusConfig = {
    'PENDING': { 
      label: 'Mới', 
      color: 'bg-slate-100 text-slate-600',
      icon: <UserPlus size={14} className="mr-2" />
    },
    'SENT_TO_BRANCH': { 
      label: 'Đang PV', 
      color: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
      icon: <Clock size={14} className="mr-2" />
    },
    'COMPLETED': { 
      label: 'Xong', 
      color: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      icon: <CheckCircle2 size={14} className="mr-2" />
    }
  };

  return (
    <tr className={`group hover:bg-slate-50/80 transition-all border-l-4 ${timeStatus === 'EXPIRED' ? 'border-l-red-500' : (timeStatus === 'URGENT' ? 'border-l-amber-500' : 'border-l-transparent')}`}>
      <td className="px-8 py-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-500 shadow-sm border border-white">
            {candidate.name.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-black text-slate-800 leading-tight">{candidate.name}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{candidate.id}</div>
          </div>
        </div>
      </td>
      
      <td className="px-6 py-5">
        <div className="text-xs font-black text-indigo-600 uppercase tracking-widest">{candidate.position}</div>
        <div className="text-[10px] text-slate-400 font-bold mt-1">{candidate.source}</div>
      </td>

      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-slate-300" />
          <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{candidate.branch || 'HEAD OFFICE'}</span>
        </div>
        {candidate.interviewer && (
          <div className="text-[10px] text-indigo-400 font-bold mt-1 italic flex items-center gap-1">
             <ArrowRight size={10} /> {candidate.interviewer}
          </div>
        )}
      </td>

      <td className="px-6 py-5">
        <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusConfig[candidate.status].color}`}>
          {statusConfig[candidate.status].icon}
          {statusConfig[candidate.status].label}
        </div>
      </td>

      <td className="px-6 py-5">
        {candidate.deadline ? (
          <div className="flex flex-col">
            <span className={`text-[11px] font-black ${timeStatus === 'EXPIRED' ? 'text-red-600' : (timeStatus === 'URGENT' ? 'text-amber-500' : 'text-slate-600')}`}>
              {new Date(candidate.deadline).toLocaleDateString('vi-VN')}
            </span>
            <span className="text-[10px] text-slate-400 font-bold italic">
              {new Date(candidate.deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ) : (
          <span className="text-slate-300">---</span>
        )}
      </td>

      <td className="px-8 py-5 text-right">
        <div className="flex items-center justify-end gap-2">
          {/* Nút Xem CV luôn hiển thị */}
          <a
            href={candidate.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm border border-white"
            title="Xem CV"
          >
            <ExternalLink size={16} />
          </a>

          {(isAdmin && candidate.status === 'PENDING') && (
            <div className="relative">
              <button
                onClick={() => setShowSendMenu(!showSendMenu)}
                className={`flex items-center gap-2 h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showSendMenu ? 'bg-slate-800 text-white' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700'}`}
              >
                <Send size={14} /> Gửi PV
              </button>
              
              {showSendMenu && (
                <div className="absolute right-0 mt-3 w-72 bg-slate-900 rounded-[30px] shadow-2xl p-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 border border-white/10">
                   <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Clock size={12} /> Cấu hình gửi chi nhánh
                   </div>
                   
                   {/* Deadline Selector */}
                   <div className="mb-6 space-y-3">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block ml-1">Chọn Deadline xử lý</label>
                      <input 
                        type="datetime-local" 
                        id={`deadline-${candidate.id}`}
                        defaultValue={new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-[11px] font-bold outline-none focus:border-indigo-500 transition-all"
                      />
                      <div className="flex gap-2">
                         {[3, 5, 7].map(days => (
                            <button 
                              key={days}
                              type="button"
                              onClick={() => {
                                 const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
                                 document.getElementById(`deadline-${candidate.id}`).value = d;
                              }}
                              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[9px] font-black rounded-lg transition-all border border-slate-700"
                            >
                               {days} Ngày
                            </button>
                         ))}
                      </div>
                   </div>

                   <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Chọn chi nhánh đích</div>
                   <div className="grid grid-cols-2 gap-3">
                      {['TMT', 'XÓM MỚI', 'GÒ XOÀI', 'THỐNG NHẤT'].map(cn => (
                        <button 
                          key={cn}
                          onClick={() => { 
                            const chosenDeadline = document.getElementById(`deadline-${candidate.id}`).value;
                            onSend({ 
                              branch: cn, 
                              interviewer: `Manager ${cn}`,
                              deadline: new Date(chosenDeadline).toISOString()
                            }); 
                            setShowSendMenu(false); 
                          }}
                          className="w-full text-center py-3 bg-slate-800 hover:bg-indigo-600 text-white text-[10px] font-black rounded-xl transition-all uppercase tracking-widest border border-slate-700 shadow-lg"
                        >
                          Phòng {cn}
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </div>
          )}

          {candidate.status === 'SENT_TO_BRANCH' && (
            <button
              onClick={onStart}
              className={`flex items-center gap-2 h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${timeStatus === 'EXPIRED' && !isAdmin ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-orange-500 text-white shadow-orange-100 hover:bg-orange-600'}`}
            >
              <MessageSquare size={14} /> {isAdmin ? 'HRM PV' : 'Bắt đầu PV'}
            </button>
          )}

          {isAdmin && candidate.status === 'SENT_TO_BRANCH' && (
             <button
                onClick={() => { if(confirm('Rút hồ sơ về?')) onWithdraw(); }}
                className={`p-3 rounded-xl border-2 border-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all ${timeStatus === 'EXPIRED' ? 'bg-red-50 text-red-600 border-red-100' : ''}`}
                title="Rút hồ sơ (Withdraw)"
             >
                <RotateCcw size={16} />
             </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function InfoRow({ icon, label, value, color = "text-slate-800" }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-50">
        {icon}
      </div>
      <div className="flex-1">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{label}</span>
        <span className={`text-[12px] font-black truncate block ${color}`}>{value}</span>
      </div>
    </div>
  );
}

// Modal Xem CV Ứng Viên Giản Lược
const EvaluationModal = ({ candidate, onClose }) => {
  if (!candidate) return null;

  const cvPreviewUrl = getEmbedtableUrl(candidate.cvUrl);

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 lg:p-6 shadow-3xl">
        {/* NỘI DUNG CV FULL WIDTH */}
        <div className="flex-1 bg-slate-100/50 relative">
          {cvPreviewUrl ? (
            <iframe 
              src={cvPreviewUrl} 
              className="w-full h-full border-none"
              title="CV Document"
              allow="autoplay"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <FileText size={64} className="mb-6 opacity-20" />
              <p className="font-bold text-lg">Không có Link CV</p>
              <p className="text-sm">Ứng viên này chưa đính kèm file hố sơ.</p>
            </div>
          )}
        </div>
      </div>
  );
};

const FileSearch = ({ size }) => <Users size={size} />;
