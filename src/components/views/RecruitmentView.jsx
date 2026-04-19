import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserSearch, Send, FileCheck, CheckCircle2, XCircle, 
  MessageSquare, Video, Star, Clock, Building2, UserCircle, 
  ExternalLink, ArrowRight, UserPlus, FileText, Search, 
  Filter, History, AlertTriangle, RotateCcw, Users, RefreshCw, X, Ban
} from 'lucide-react';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../utils/firebase'; // Import từ file cấu hình mới
import { fetchBranches, saveInterview, updateCandidateStatus, createAccessToken } from '../../utils/supabase-api';
import { apiFetch, fetchGoogleScript } from '../../utils/api';
import CandidatesTab from '../tabs/CandidatesTab';
import BranchManagementTab from '../tabs/BranchManagementTab';
import InterviewTab from '../tabs/InterviewTab';
import ReportTab from '../tabs/ReportTab';
import CandidateDetailModal from '../modals/CandidateDetailModal';
import Binterviewed from '../modals/Binterviewed';
import { generateMockCandidates } from '../../utils/mockGenerator';

/* global __initial_auth_token */
// Helper to convert Google Drive link to Preview link (dành cho iframe nếu cần)
const _getEmbedtableUrl = (url) => {
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

export default function RecruitmentView({ userRole, branchId, employees: _employees, onSelectCandidate: _onSelectCandidate, subTab = 'recruitment-candidates', onNavigateSubTab }) {
  const isAdmin = userRole === 'admin';
  const isDemoMode = String(localStorage.getItem('ace_demo_mode') || '').trim() === '1';
  const [user, setUser] = useState(null);
  // Map subTab to internal tab for candidate filtering
  const internalTab = subTab === 'recruitment-candidates' ? 'pipeline' :
                     subTab === 'recruitment-branch' ? 'monitoring' :
                     subTab === 'recruitment-interview' ? 'my-interviews' :
                     subTab === 'recruitment-report' ? 'completed' : subTab;
  const [interviewEnabled] = useState(true); // Bật chức năng phỏng vấn cho tất cả
  
  // Trạng thái cho Modal (có thể là 'VIEW' hoặc 'EVALUATE')
  const [modalState, setModalState] = useState({ isOpen: false, candidate: null, mode: 'VIEW' });
  
  // Trạng thái bộ lọc
  const [searchTerm] = useState('');
  const [filterBranch, _setFilterBranch] = useState('');
  const [filterPosition, _setFilterPosition] = useState('');
  const [_filterSalary, _setFilterSalary] = useState('');
  const [_filterDate, _setFilterDate] = useState('');
  const [_filterStatus, _setFilterStatus] = useState('');
  
  const [_isSyncing, setIsSyncing] = useState(false);
  const [preselectCandidateId, setPreselectCandidateId] = useState(null);
  const [branches, setBranches] = useState([]);
  const [candidates, setCandidates] = useState(() => {
    const saved = localStorage.getItem('ace_recruitment_candidates_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const handleMockCandidates = () => {
    if (window.confirm('Bạn có chắc chắn muốn nạp 100 ứng viên mẫu để demo tuyển dụng?')) {
      const mock = generateMockCandidates(100);
      setCandidates(mock);
      localStorage.setItem('ace_recruitment_candidates_v1', JSON.stringify(mock));
      alert('Đã tạo thành công 100 ứng viên mẫu!');
    }
  };

  // Fetch candidates from Supabase (replaces Google Sheet)
  const fetchLiveCandidates = async () => {
    setIsSyncing(true);
    try {
      if (isDemoMode) {
        const saved = localStorage.getItem('ace_recruitment_candidates_v1');
        const parsed = saved ? JSON.parse(saved) : [];
        setCandidates(parsed);
        const set = new Set();
        (Array.isArray(parsed) ? parsed : []).forEach((c) => {
          const vals = [c?.branch_assigned, c?.branch, c?.desiredBranch].filter(Boolean);
          vals.forEach(v => set.add(String(v)));
        });
        const demoBranches = Array.from(set).sort().map((id) => ({ id, name: id }));
        setBranches(demoBranches);
        return;
      }
      const params = new URLSearchParams();
      if (filterBranch) params.set('branch', filterBranch);
      const resp = await apiFetch(`/api/candidates-sheet/list?${params.toString()}`);
      const payload = await resp.json();
      const data = payload?.data || [];

      const transformedCandidates = (Array.isArray(data) ? data : []).map((row) => ({
        id: row.id,
        rowIndex: row.id,
        name: row.name,
        position: row.position,
        phone: row.phone,
        email: row.gmail,
        branch: row.branch,
        cvUrl: row.cv_url,
        videoLink: row.video_url,
        status: row.status || 'PENDING',
        locked: false,
        locked_reason: null,
        rawData: row.raw_data || row || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      
      setCandidates(transformedCandidates);
    } catch (e) {
      console.error("Lỗi fetch candidates từ Supabase:", e);
      // Fallback logic could go here
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchLiveCandidates(); // Fetch data when component mounts
    if (!isDemoMode) {
      fetchBranches()
        .then(setBranches)
        .catch(() => setBranches([]));
    }

    // Existing Auth setup
    const initAuth = async () => {
      try {
        const apiKey = String(import.meta?.env?.VITE_FIREBASE_API_KEY || '').trim();
        if (!apiKey) return;
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Lỗi xác thực Firebase:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Cập nhật candidate status (Supabase version)
  const handleAction = async (candidateId, action, extra = {}) => {
    // Lưu ý: Firebase user chỉ dùng cho audit log (assigned_by), không phải xác thực.
    // Auth thực sự được kiểm soát bởi userRole ở component cha.
    // Không block hành động nếu user Firebase chưa load xong.
    
    const c = candidates.find(can => can.id === candidateId);
    if (!c) return false;

    const now = new Date().toISOString();

    try {
      // Logic cập nhật Local State (Rất quan trọng cho Demo mượt mà)
      const updateLocal = (id, newStatus, extraData) => {
        setCandidates(prev => {
          const updated = prev.map(can => {
            if (can.id === id) {
              return { 
                ...can, 
                status: newStatus, 
                ...extraData, 
                updatedAt: now,
                updated_at: now
              };
            }
            return can;
          });
          localStorage.setItem('ace_recruitment_candidates_v1', JSON.stringify(updated));
          return updated;
        });
      };

      if (action === 'SEND') {
        const isInternal = extra.branch === 'HRM_INTERNAL' || extra.assignment_type === 'internal';
        if (c.locked) {
          alert('Ứng viên đang bị khoá. Vui lòng Thu hồi/Mở khoá trước khi điều phối lại.');
          return false;
        }

        const assignedBranch = isInternal ? null : extra.branch;
        const lockedReason = isInternal ? null : `Đã gửi chi nhánh ‘${String(extra.branch_label || extra.branch || '').trim()}’`;
        const nextStatus = isInternal ? 'INTERVIEW_ASSIGNED' : 'SENT_TO_BRANCH';

        let branchAccessToken = null;
        if (!isDemoMode && !isInternal && assignedBranch) {
          try {
            const token = await createAccessToken({
              candidate_id: candidateId,
              branch_id: assignedBranch,
              interviewer_email: extra.interviewer_email || user?.email || 'hrm@ace.local',
              expires_hours: 72
            });
            branchAccessToken = token?.token || null;
          } catch {
            branchAccessToken = null;
          }
        } else if (isInternal) {
          branchAccessToken = null;
        } else if (!isInternal && assignedBranch) {
          branchAccessToken = 'demo-token';
        }

        if (!isDemoMode) {
          await updateCandidateStatus(candidateId, nextStatus, {
            branch_assigned: assignedBranch,
            assigned_at: now,
            branch_access_token: branchAccessToken,
            assigned_by: user?.email || user?.displayName || null,
            interviewer: isInternal ? (user?.email || user?.displayName || 'HRM') : undefined,
            workflow_status: isInternal ? 'INTERVIEW_SCHEDULED' : 'SENT_TO_BRANCH'
          });
        }

        updateLocal(candidateId, nextStatus, {
          branch: assignedBranch,
          branch_assigned: assignedBranch,
          assigned_at: now,
          locked: isInternal ? false : true,
          locked_reason: lockedReason,
          branch_access_token: branchAccessToken
        });

        if (!isDemoMode && !isInternal && assignedBranch) {
          const branchName = String(
            extra.branch_label ||
            branches.find((b) => b.id === assignedBranch)?.name ||
            assignedBranch
          ).trim();
          const fallbackEmail = String(import.meta?.env?.VITE_GAS_FALLBACK_EMAIL || 'ace.hrm@gmail.com').trim();
          const rawRecipients = String(extra.branch_email || c.branch_email || fallbackEmail).trim();
          const recipients = rawRecipients
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);

          const gasPayload = {
            template: 'BRANCH_ASSIGNMENT',
            language: 'vi',
            recipients,
            candidateData: {
              id: candidateId,
              candidate_id: candidateId,
              candidate_name: c.name || c.candidate_name || 'Ứng viên',
              position: c.position || c.jobTitle || '',
              phone: c.phone || c.phoneNumber || '',
              email: c.email || '',
              applied_at: c.createdAt
                ? new Date(c.createdAt).toLocaleString('vi-VN')
                : new Date(now).toLocaleString('vi-VN'),
              cv_url: c.cvUrl || c.cvLink || c.cv_url || '',
              video_url: c.video_url || c.videoUrl || '',
              branch_name: branchName
            }
          };

          // Fire-and-forget: không block UI, GAS gửi mail chạy ngầm sau khi Supabase ghi xong
          fetchGoogleScript('sendRecruitmentEmail', gasPayload).catch(() => {
            console.warn('[GAS] Gửi email chi nhánh không thành công, sẽ được GAS trong Google Sheets xử lý lại.');
          });
        }

        if (isDemoMode && !isInternal) {
          // Demo mode: không gọi GAS thật, chỉ log
          console.log(`[DEMO] Giả lập gửi email cho chi nhánh: ${extra.branch_label || assignedBranch}`);
        }
        
        setPreselectCandidateId(candidateId);
      }
      else if (action === 'WITHDRAW') {
        if (!isDemoMode) {
          await updateCandidateStatus(candidateId, 'PENDING', {
            assignment_type: null,
            branch_assigned: null,
            assigned_at: null,
            assigned_by: null,
            branch_access_token: null,
            workflow_status: 'NEW'
          }).catch(() => {});
        }
        updateLocal(candidateId, 'PENDING', {
          assignment_type: null,
          branch: null,
          branch_assigned: null,
          assigned_at: null,
          locked: false,
          locked_reason: null,
          branch_access_token: null
        });
      }
      else if (action === 'TAKEOVER') {
        if (!isDemoMode) {
          await updateCandidateStatus(candidateId, 'INTERVIEW_ASSIGNED', {
            branch_assigned: null,
            assigned_at: now,
            assigned_by: user?.email || user?.displayName || null,
            interviewer: user?.email || user?.displayName || 'HRM',
            interview_scheduled_date: now,
            interview_notes: 'HRM tiếp nhận phỏng vấn (bỏ qua quyền chi nhánh).',
            workflow_status: 'INTERVIEW_SCHEDULED'
          }).catch(() => {});
        }
        updateLocal(candidateId, 'INTERVIEW_ASSIGNED', {
          assignment_type: 'internal',
          branch: null,
          branch_assigned: null,
          assigned_at: now,
          locked: false,
          locked_reason: null,
          interviewer: user?.email || user?.displayName || 'HRM',
          interview_scheduled_date: now,
          interview_notes: 'HRM tiếp nhận phỏng vấn (bỏ qua quyền chi nhánh).'
        });
        setPreselectCandidateId(candidateId);
      }
      else if (action === 'COMPLETE') {
        if (!isDemoMode) {
          await saveInterview({
            candidate_id: candidateId,
            interviewer_email: extra.interviewer_email || c.interviewer_email,
            interview_date: extra.interview_date || now,
            technical_score: extra.technical_score,
            communication_score: extra.communication_score,
            attitude_score: extra.attitude_score,
            overall_score: extra.overall_score,
            decision: extra.decision,
            notes: extra.note
          }).catch(() => {});
        }
        updateLocal(candidateId, 'COMPLETED', extra);
      }
      else if (action === 'SCHEDULE') {
        if (!isDemoMode) {
          await updateCandidateStatus(candidateId, 'SENT_TO_BRANCH', {
            interview_scheduled_date: extra.interview_scheduled_date,
            interview_notes: extra.interview_scheduled_date ? `Chi nhánh hẹn phỏng vấn lúc: ${extra.interview_scheduled_date}` : undefined
          }).catch(() => {});
        }
        updateLocal(candidateId, 'SENT_TO_BRANCH', { interview_scheduled_date: extra.interview_scheduled_date, note: extra.interview_scheduled_date ? `Chi nhánh hẹn phỏng vấn lúc: ${extra.interview_scheduled_date}` : undefined });
      }
      else if (action === 'REJECT') {
        if (!isDemoMode) {
          await updateCandidateStatus(candidateId, 'REJECTED', {
            final_decision: 'REJECTED',
            final_decision_by: user?.email || user?.displayName || null,
            final_decision_at: now,
            workflow_status: 'REJECTED',
            interview_notes: String(extra.reason || 'Không đạt yêu cầu')
          }).catch(() => {});
        }
        updateLocal(candidateId, 'REJECTED', { reject_reason: extra.reason });
      }
      else if (action === 'UNLOCK') {
        const reason = String(extra.reason || '').trim();
        if (!reason) {
          alert('Vui lòng nhập lý do thu hồi/mở khoá.');
          return false;
        }
        if (!isDemoMode) {
          await updateCandidateStatus(candidateId, 'PENDING', {
            branch_assigned: null,
            assigned_at: null,
            assigned_by: null,
            branch_access_token: null,
            workflow_status: 'NEW',
            interview_notes: reason,
            final_decision: null,
            final_decision_by: null,
            final_decision_at: null
          });
        }
        updateLocal(candidateId, 'PENDING', {
          assignment_type: null,
          branch: null,
          branch_assigned: null,
          assigned_at: null,
          locked: false,
          locked_reason: null
        });
      }
      
      // Refresh candidates list from server if possible
      if (!isDemoMode) await fetchLiveCandidates();
      return true;
      
    } catch (e) {
      console.error("Lỗi cập nhật:", e);
      alert(`Lỗi: ${e.message}`);
      return false;
    }
  };

  const handleBulkAction = async (candidateIds, action, extra = {}) => {
    if (!user) return false;
    // For demo/simplicity, loop through handleAction
    let successCount = 0;
    for (const id of candidateIds) {
      const res = await handleAction(id, action, extra);
      if (res) successCount++;
    }
    alert(`Đã xử lý hàng loạt thành công ${successCount}/${candidateIds.length} hồ sơ!`);
    return true;
  };

  const _getTimeStatus = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    if (diff < 0) return 'EXPIRED';
    if (diff < 12 * 60 * 60 * 1000) return 'URGENT';
    return 'NORMAL';
  };

  const _filteredCandidates = useMemo(() => {
    let list = candidates;
    
    // Lọc theo Tab
    if (internalTab === 'pipeline') {
      list = list.filter(c => c.status === 'PENDING');
    } else if (internalTab === 'monitoring') {
      list = list.filter(c => c.status === 'SENT_TO_BRANCH' || (c.status === 'COMPLETED' && c.interviewer !== 'HRM Admin'));
    } else if (internalTab === 'my-interviews') {
      if (isAdmin) {
        list = list.filter(c => c.interviewer === 'HRM Admin' || c.status === 'PENDING');
      } else {
        list = list.filter(c => (c.branch === branchId || c.interviewer === (branchId ? `Manager ${branchId}` : 'Manager')) && c.status === 'SENT_TO_BRANCH');
      }
    } else if (internalTab === 'completed') {
      list = list.filter(c => c.status === 'COMPLETED' || c.status === 'REJECTED');
    }

    // Lọc theo Search (Tên, ID)
    if (searchTerm) {
      list = list.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Lọc theo Chi nhánh
    if (filterBranch) {
      list = list.filter(c => (c.branch || 'HEAD OFFICE') === filterBranch);
    }
    
    // Lọc theo Vị trí
    if (filterPosition) {
      list = list.filter(c => c.position?.toLowerCase().includes(filterPosition.toLowerCase()));
    }

    // Sắp xếp: Mới nhất lên đầu
    return [...list].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return dateB - dateA;
    });
  }, [candidates, internalTab, searchTerm, filterBranch, filterPosition, isAdmin, branchId]);

  const handleViewCandidate = (candidate, mode = 'VIEW') => {
    setModalState({ isOpen: true, candidate, mode });
  };

  // Render appropriate component based on subTab
  const renderContent = () => {
    const commonProps = { candidates, branches, isAdmin, branchId, onViewDetail: handleViewCandidate, onAction: handleAction, onBulkAction: handleBulkAction, onNavigateSubTab };
    switch (subTab) {
      case 'recruitment-candidates':
        return <CandidatesTab {...commonProps} onMock={handleMockCandidates} />;
      case 'recruitment-branch':
        return <BranchManagementTab {...commonProps} />;
      case 'recruitment-interview':
        return <InterviewTab {...commonProps} preselectCandidateId={preselectCandidateId} onConsumedPreselect={() => setPreselectCandidateId(null)} />;
      case 'recruitment-report':
        return <ReportTab {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-auto min-h-full flex flex-col bg-[#F2F4F7] pt-2 px-4 pb-4 lg:pt-3 lg:px-6 lg:pb-6">
      {renderContent()}

      {/* MODAL CHI TIẾT & ĐÁNH GIÁ */}
      {modalState.mode === 'B_interviewed' ? (
        <Binterviewed
          isOpen={modalState.isOpen}
          candidate={modalState.candidate}
          onClose={() => setModalState({ isOpen: false, candidate: null, mode: 'VIEW' })}
          disabledSubmit={!interviewEnabled && !isAdmin}
          onShowDetail={(candidate) => setModalState({ isOpen: true, candidate, mode: 'VIEW' })}
          onSubmit={(results) => {
            if (!interviewEnabled && !isAdmin) {
              alert('Chức năng phỏng vấn hiện đang tắt. Chỉ tài khoản admin có thể xem dữ liệu.');
              return;
            }
            handleAction(modalState.candidate.id, 'COMPLETE', {
              ...results,
              interviewer: isAdmin ? 'HRM Admin' : (branchId ? `Manager ${branchId}` : 'Manager'),
            });
            setModalState({ isOpen: false, candidate: null, mode: 'VIEW' });
          }}
        />
      ) : (
        <CandidateDetailModal
          isOpen={modalState.isOpen}
          candidate={modalState.candidate}
          mode={modalState.mode}
          isHRM={isAdmin}
          branches={branches}
          onClose={() => setModalState({ isOpen: false, candidate: null, mode: 'VIEW' })}
          onSubmitEval={(results) => {
            if (!interviewEnabled && !isAdmin) {
              alert('Chức năng phỏng vấn hiện đang tắt. Chỉ tài khoản admin có thể xem dữ liệu.');
              return;
            }
            handleAction(modalState.candidate.id, 'COMPLETE', {
              ...results,
              interviewer: isAdmin ? 'HRM Admin' : (branchId ? `Manager ${branchId}` : 'Manager'),
            });
            setModalState({ isOpen: false, candidate: null, mode: 'VIEW' });
          }}
          onAssign={async (assignment) => {
            const ok = await handleAction(modalState.candidate.id, 'SEND', assignment);
            if (ok) {
              const isInternal = assignment?.branch === 'HRM_INTERNAL' || assignment?.assignment_type === 'internal';
              if (onNavigateSubTab && isInternal) {
                setModalState({ isOpen: false, candidate: null, mode: 'VIEW' });
                onNavigateSubTab('recruitment-interview');
              }
            }
            return ok;
          }}
          onBranchAction={(action, extra) => {
            handleAction(modalState.candidate.id, action, extra);
          }}
        />
      )}
    </div>
  );
}
