import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import TaskManagerView from './components/views/TaskManagerView';
import TaskModal from './components/modals/TaskModal';
import SettingsModal from './components/modals/SettingsModal';
import LoginView from './components/views/LoginView';
import ContractView, { ContractPreview } from './components/views/ContractView';
import EmployeeView from './components/views/EmployeeView';
import PersonnelMovementView from './components/views/PersonnelMovementView';
import PersonnelSummaryView from './components/views/PersonnelSummaryView';
import PersonnelReportView from './components/views/PersonnelReportView';
import MonthlyEvaluationView from './components/views/MonthlyEvaluationView';
import RecruitmentView from './components/views/RecruitmentView';
import InterviewView from './components/views/InterviewView';
import { auth } from './utils/firebase.js';
import { signOut } from 'firebase/auth';
import { apiFetch } from './utils/api.js';
import { generateDemoData } from './utils/mockData.js';

const EMPTY_TASK = {
  title: '', group: '', startDate: '', endDate: '',
  notes: '', links: [], images: [], email: '',
  status: 'TODO', progress: 0, subtasks: [], comments: [],
  priority: 'medium', tags: [], reminder: '', assignee: '', activityLog: []
};

const STATUS_MAP = {
  'done': 'DONE',
  'cancelled': 'CANCELLED',
  'in progress': 'IN_PROGRESS',
  'pending': 'TODO',
  'todo': 'TODO'
};

const normalizeTask = (task) => {
  if (!task) return EMPTY_TASK;
  
  const toArray = (data) => {
    if (Array.isArray(data)) return data;
    if (typeof data !== 'string' || !data.trim()) return [];
    try {
      const p = JSON.parse(data);
      return Array.isArray(p) ? p : [];
    } catch (_e) {
      return [];
    }
  };

  // Chuẩn hóa thời gian về dạng ISO hoặc Milliseconds để so sánh đồng nhất
  let lastUpdated = task.lastUpdated || task["Cập nhật lần cuối"] || 0;
  if (typeof lastUpdated === 'string') {
    try { lastUpdated = new Date(lastUpdated).toISOString(); } catch(_e) { lastUpdated = new Date(0).toISOString(); }
  }

  return {
    ...task,
    id: String(task.id || task.ID || Math.random().toString(36).substr(2, 9)),
    title: String(task.title || ""),
    status: (STATUS_MAP[String(task.status || "TODO").trim().toLowerCase()] || task.status || 'TODO').toString().toUpperCase(),
    progress: Number(task.progress || 0),
    subtasks: toArray(task.subtasks),
    tags: toArray(task.tags),
    comments: toArray(task.comments),
    activityLog: toArray(task.activityLog),
    lastUpdated: lastUpdated
  };
};

const INITIAL_TASKS = [];

export default function App() {
  const isContractPreview = window.location.search.includes('preview=contract');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('task-manager');
  const [activeGroup, setActiveGroup] = useState('ALL');
  const [isAddingTask, setIsAddingTask] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [contractEmployeeId, setContractEmployeeId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  
  // State quản lý đóng/mở Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [employees, setEmployees] = useState(() => {
    try {
      const raw = localStorage.getItem('ace_hrm_employees_v1');
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
    } catch (_e) {
      return [];
    }
  });

  const teamMembers = employees.map(emp => emp.name);
  
  const [colorConfig, setColorConfig] = useState({
    statuses: { 'TODO': 'slate', 'IN_PROGRESS': 'blue', 'DONE': 'green', 'CANCELLED': 'red' },
    groups: { 'TRUNG MỸ TÂY': 'blue', 'NGUYỄN ẢNH THỦ': 'orange', 'NHÂN SỰ': 'purple', 'Gia đình': 'pink' }
  });

  const [groups, setGroups] = useState([]);

  const [movements, setMovements] = useState([]);

  useEffect(() => {
    try {
      localStorage.setItem('ace_hrm_employees_v1', JSON.stringify(employees));
    } catch (_e) {}
  }, [employees]);

  useEffect(() => {
    const raw = localStorage.getItem('ace_hrm_font_scale');
    if (raw) {
      document.documentElement.style.setProperty('--base-scale', raw);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchTasks = async () => {
        try {
          const token = localStorage.getItem('token') || ''
          const resp = await apiFetch('/api/tasks/list', { headers: { Authorization: `Bearer ${token}` } })
          if (resp.ok) {
            const data = await resp.json()
            if (data?.ok && Array.isArray(data.tasks)) {
              setTasks(data.tasks.map(normalizeTask))
              return
            }
          }
        } catch (_e) {
          console.error("Auto-fetch tasks failed:", _e);
        }
      };
      fetchTasks();
    }
  }, [isLoggedIn]);

  const handleLogin = (token) => {
    try { localStorage.setItem('token', String(token || '')) } catch (_e) {}
    setUserRole(localStorage.getItem('user_role') || 'user');
    setIsLoggedIn(true);
  };

  const handleCreateContractForEmployee = (emp) => {
    const id = String(emp?.id || '').trim()
    if (!id) return
    setContractEmployeeId(id)
    setActiveTab('contract')
  }

  const handleSelectCandidate = (candidateId) => {
    setSelectedCandidateId(candidateId);
    setActiveTab('interview');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user_branch');
    localStorage.removeItem('user_role');
    signOut(auth).catch(console.error);
    setTasks([]);
  };

  useEffect(() => {
    // Firebase Auth session check is handled by the SDK
  }, [])


  const onSyncPull = async (silent = false) => {
    try {
      const token = localStorage.getItem('token') || ''
      const resp = await apiFetch('/api/tasks/list', { headers: { Authorization: `Bearer ${token}` } })
      if (resp.ok) {
        const data = await resp.json()
        if (data?.ok && Array.isArray(data.tasks)) {
          setTasks(data.tasks.map(normalizeTask))
          if (!silent) alert("Đã tải dữ liệu mới nhất từ Firebase về máy.")
          return
        }
      }
    } catch (e) {
      if (!silent) alert("Lỗi tải dữ liệu: " + e.message);
    }
  };

  const onSyncPush = async (silent = false) => {
    try {
      const token = localStorage.getItem('token') || ''
      const resp = await apiFetch('/api/tasks/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tasks }),
      })
      if (resp.ok) {
        const data = await resp.json()
        if (data?.ok) {
          if (!silent) alert(`Đã đẩy dữ liệu lên Firebase thành công!`)
          return
        }
      }
    } catch (e) {
      if (!silent) alert("Lỗi kết nối: " + e.message);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    const tick = () => { onSyncPull(true); };
    const timer = setInterval(tick, 20000);
    try { window.addEventListener('focus', tick); } catch (_e) {}
    try {
      const onVis = () => { if (!document.hidden) tick(); };
      document.addEventListener('visibilitychange', onVis);
      return () => {
        clearInterval(timer);
        try { window.removeEventListener('focus', tick); } catch (_e) {}
        try { document.removeEventListener('visibilitychange', onVis); } catch (_e) {}
      };
    } catch (_e) {
      return () => clearInterval(timer);
    }
  }, [isLoggedIn]);

  const handleAddGroup = (groupName) => {
    if (groupName && !groups.includes(groupName)) {
      setGroups([...groups, groupName]);
    }
  };

  const handleUseDemoData = () => {
    const demo = generateDemoData();
    
    const keysToClear = [
      'ace_hrm_employees_v1',
      'ace_recruitment_candidates_v1',
      'ace_contract_issue_log_v1',
      'ace_hrm_movements_v1',
      'ace_mock_movements',
      'ace_position_contract_mapping_v1',
      'ace_hrm_font_scale',
      'ace_hrm_mask_salary',
    ];
    keysToClear.forEach((k) => {
      try { localStorage.removeItem(k); } catch (_e) {}
    });

    try { localStorage.setItem('ace_demo_mode', '1'); } catch (_e) {}
    try { localStorage.setItem('ace_hrm_employees_v1', JSON.stringify(demo.employees)); } catch (_e) {}
    try { localStorage.setItem('ace_recruitment_candidates_v1', JSON.stringify(demo.candidates)); } catch (_e) {}
    try { localStorage.setItem('ace_contract_issue_log_v1', JSON.stringify(demo.contracts || [])); } catch (_e) {}
    try { localStorage.setItem('ace_hrm_movements_v1', JSON.stringify(demo.movements || [])); } catch (_e) {}
    try { localStorage.setItem('ace_position_contract_mapping_v1', JSON.stringify(demo.positionMappings || {})); } catch (_e) {}
    try { localStorage.setItem('ace_hrm_font_scale', '1.0'); } catch (_e) {}
    
    // Cập nhật state hiện tại (để thấy thay đổi ngay nếu không load lại kịp)
    setEmployees(demo.employees);
    setGroups(demo.branches);
    setColorConfig(demo.colorConfig);
    if (typeof setMovements === 'function') setMovements(demo.movements);
    
    // Refresh để đảm bảo tính nhất quán (RecruitmentView, Sidebar, etc. đều nạp lại)
    setTimeout(() => {
      alert('ĐÃ GHI ĐÈ TOÀN HỆ THỐNG: 300 nhân viên, 180 ứng viên, 50 biến động nhân sự và cấu hình hợp đồng mẫu đã được nạp. Hệ thống sẽ khởi động lại.');
      window.location.reload();
    }, 500);
  };

  const filteredTasks = activeGroup === 'ALL' 
    ? tasks 
    : tasks.filter(t => t.group === activeGroup);

  const reminderCount = tasks.filter(t => {
    if (!t.reminder) return false;
    const r = new Date(t.reminder);
    const now = new Date();
    return r > now && r < new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }).length;

  const getRequestMeta = () => {
    const originUsername = String(localStorage.getItem('saved_username') || '').trim();
    const originRole = String(localStorage.getItem('user_role') || '').trim() || 'user';
    const originBranch = String(localStorage.getItem('user_branch') || '').trim();
    return { originUsername, originRole, originBranch, createdAt: new Date().toISOString() };
  };

  const handleCreateTask = (newTask) => {
    const nowIso = new Date().toISOString();
    const taskWithId = {
      ...newTask,
      id: 't' + Date.now().toString(),
      lastUpdated: nowIso,
      requestMeta: newTask?.requestMeta || getRequestMeta(),
    };
    setTasks(prev => [...prev, taskWithId]);
    setIsAddingTask(false);
    try {
      const token = localStorage.getItem('token') || ''
      apiFetch('/api/tasks/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ task: taskWithId }),
      }).catch(() => {})
    } catch (_e) {}
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const resp = await apiFetch('/api/notifications/poll');
        if (!resp.ok) return;
        const data = await resp.json();
        const list = Array.isArray(data?.notifications) ? data.notifications : [];
        if (cancelled || list.length === 0) return;

        const ids = [];
        list.forEach(n => {
          ids.push(n.id);
          const kind = String(n.kind || '').trim();
          const title = n.payload?.title || '';
          if (kind === 'TASK_DONE') {
            const actor = n.payload?.actor || '';
            const group = n.payload?.fromGroup || '';
            const msg = `Task đã hoàn thành: ${title}${group ? ` (${group})` : ''}${actor ? ` - bởi ${actor}` : ''}`;
            try { window.alert(msg); } catch (_e) {}
          } else if (kind === 'TASK_DONE_REQUEST') {
            const actor = n.payload?.actor || '';
            const group = n.payload?.fromGroup || '';
            const msg = `Chi nhánh đã báo hoàn thành task: ${title}${group ? ` (${group})` : ''}${actor ? ` - bởi ${actor}` : ''}`;
            try { window.alert(msg); } catch (_e) {}
            try { localStorage.setItem('ace_task_switch_to_done_admin', '1'); } catch (_e) {}
            try { setActiveTab('task-manager'); } catch (_e) {}
          } else if (kind === 'TASK_DONE_APPROVED') {
            const msg = `HRM đã duyệt hoàn thành: ${title}`;
            try { window.alert(msg); } catch (_e) {}
          } else if (kind === 'TASK_DONE_REJECTED') {
            const msg = `HRM từ chối hoàn thành: ${title}`;
            try { window.alert(msg); } catch (_e) {}
          }
        });
        if (ids.length > 0) {
          const token = localStorage.getItem('token') || '';
          apiFetch('/api/notifications/ack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ids }),
          }).catch(() => {});
        }
      } catch (_e) {}
    };
    const timer = setInterval(tick, 3000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isLoggedIn]);

  if (isContractPreview) {
    const data = JSON.parse(localStorage.getItem('preview_data') || '{}');
    const contractTypeId = localStorage.getItem('preview_contract_type') || '';
    const position = localStorage.getItem('preview_position') || '';
    const agreementTypeId = localStorage.getItem('preview_agreement_type') || '';
    const commitmentTypeId = localStorage.getItem('preview_commitment_type') || '';

    return (
      <ContractPreview 
        data={data} 
        contractTypeId={contractTypeId}
        position={position}
        agreementTypeId={agreementTypeId}
        commitmentTypeId={commitmentTypeId}
        onEdit={() => window.close()} 
        onPrint={() => window.print()} 
      />
    );
  }

  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-white text-slate-800 font-sans overflow-hidden">
      
      {/* SIDEBAR WRAPPER - Xử lý hiệu ứng thu gọn / mở rộng */}
      <div 
        className={`transition-all duration-300 ease-in-out flex-shrink-0 z-20 ${
          isSidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="w-full h-full">
          <Sidebar 
            activeTab={activeTab} setActiveTab={setActiveTab} 
            groups={groups} tasks={tasks}
            activeGroup={activeGroup} setActiveGroup={setActiveGroup} 
            onAddGroup={handleAddGroup} 
            onOpenSettings={() => setIsSettingsOpen(true)}
            userRole={userRole}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            onLogout={handleLogout}
            onSyncPull={onSyncPull}
            onSyncPush={onSyncPush}
            reminderCount={reminderCount}
            onAddTask={() => {
              const now = new Date();
              const end = new Date();
              end.setHours(23, 59, 59, 999);
              
              const tzOffset = now.getTimezoneOffset() * 60000;
              const startStr = new Date(now - tzOffset).toISOString().slice(0, 16);
              const endStr = new Date(end - tzOffset).toISOString().slice(0, 16);
              
              const reminderDate = new Date(now.getTime() - 60 * 60000);
              const reminderStr = new Date(reminderDate - tzOffset).toISOString().slice(0, 16);
  
              setIsAddingTask({ 
                ...EMPTY_TASK, 
                group: activeGroup === 'ALL' ? '' : activeGroup,
                startDate: startStr, 
                endDate: endStr,
                reminder: reminderStr,
                reminderType: '1h'
              });
            }}
          />
        </div>
      </div>

      {/* KHU VỰC NỘI DUNG CHÍNH */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
        
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#F2F4F7]">
          {activeTab === 'task-manager' && (
            <TaskManagerView 
              tasks={filteredTasks} 
              setTasks={setTasks}
              onPersistTask={(task) => {
                try {
                  const token = localStorage.getItem('token') || ''
                  const normalized = {
                    ...task,
                    requestMeta: task?.requestMeta || getRequestMeta(),
                  };
                  const group = String(normalized.group || '').trim();
                  const progressNum = typeof normalized.progress === 'number' ? normalized.progress : Number(normalized.progress || 0);
                  if (progressNum === 100 && String(normalized.status || '').trim() !== 'DONE') {
                    normalized.status = 'DONE';
                    normalized.lastUpdated = new Date().toISOString();
                  }
                  const isDone = String(normalized.status || '').trim() === 'DONE';
                  const alreadyDoneGroup = group.endsWith('__DONE');
                  if (isDone && group && !alreadyDoneGroup) {
                    try {
                      if (String(localStorage.getItem('user_role') || '').trim() !== 'admin') {
                        localStorage.setItem('ace_task_switch_to_done', '1');
                      }
                    } catch (_e) {}
                    apiFetch('/api/tasks/complete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ id: normalized.id }),
                    })
                      .then(r => r.json().then(j => ({ ok: r.ok, body: j })))
                      .then(({ ok, body }) => {
                        if (!ok || !body?.ok || !body?.task) return;
                        setTasks(prev => prev.map(t => t.id === body.task.id ? normalizeTask(body.task) : t));
                      })
                      .catch(() => {});
                    return;
                  }
                  apiFetch('/api/tasks/upsert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ task: normalized }),
                  }).catch(() => {})
                } catch (_e) {}
              }}
              onDeleteTask={(id) => {
                try {
                  const token = localStorage.getItem('token') || ''
                  apiFetch('/api/tasks/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ id }),
                  }).catch(() => {})
                } catch (_e) {}
              }}
              onOpenEmployeeRequests={() => setActiveTab('personnel')}
              onOpenPersonnelMovements={() => setActiveTab('personnel-movements')}
              colorConfig={colorConfig} 
              teamMembers={teamMembers} 
              userRole={userRole} 
              branchId={localStorage.getItem('user_branch')}
              employees={employees}
              setEmployees={setEmployees}
              movements={movements}
              setMovements={setMovements}
            />
          )}
          {activeTab === 'contract' && (
            <ContractView 
              onLogout={handleLogout} 
              employees={employees}
              userRole={userRole}
              initialEmployeeId={contractEmployeeId}
            />
          )}
          {activeTab === 'personnel-evaluation' && (
            <MonthlyEvaluationView
              userRole={userRole}
              branches={groups}
              employees={employees}
            />
          )}
          {activeTab === 'personnel' && (
            <EmployeeView 
              employees={employees} 
              setEmployees={setEmployees} 
              userRole={userRole} 
              branchId={localStorage.getItem('user_branch')}
              movements={movements}
              branches={groups}
              onCreateContract={handleCreateContractForEmployee}
            />
          )}
          {activeTab === 'personnel-summary' && (
            <PersonnelSummaryView 
              employees={employees} 
              branches={groups}
            />
          )}
          {activeTab === 'personnel-report' && (
            <PersonnelReportView 
              employees={employees} 
              setEmployees={setEmployees}
              branches={groups}
            />
          )}
          {activeTab === 'personnel-movements' && (
            <PersonnelMovementView 
              employees={employees} 
              setEmployees={setEmployees} 
              movements={movements}
              setMovements={setMovements}
              userRole={userRole} 
              branchId={localStorage.getItem('user_branch')}
            />
          )}
          {activeTab === 'personnel-contracts' && (
            <ContractView 
              onLogout={handleLogout} 
              employees={employees}
              userRole={userRole}
              initialMode="workflow"
              branch={localStorage.getItem('user_branch')}
              setTasks={setTasks}
            />
          )}
          {(activeTab === 'recruitment' || activeTab.startsWith('recruitment-')) && (
            <RecruitmentView 
              userRole={userRole}
              branchId={localStorage.getItem('user_branch')}
              employees={employees}
              onSelectCandidate={handleSelectCandidate}
              subTab={activeTab}
              onNavigateSubTab={setActiveTab}
            />
          )}
          {activeTab === 'interview' && (
            <InterviewView 
              candidateId={selectedCandidateId}
              onBack={() => setActiveTab('recruitment')}
            />
          )}
          {activeTab === 'info' && (
            <div className="p-6 h-full bg-[#F2F4F7]">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500 h-full flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold text-slate-700 mb-2">Info</h2>
                <p>Quản lý tài liệu và thông tin nội bộ của Mẹ Moon.</p>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {isAddingTask && (
        <TaskModal
          task={isAddingTask}
          onClose={() => setIsAddingTask(null)}
          onSave={handleCreateTask}
          teamMembers={teamMembers}
          groups={groups}
          userRole={userRole}
        />
      )}
      {isSettingsOpen && (
        <SettingsModal 
          currentConfig={colorConfig}
          onSave={setColorConfig}
          onClose={() => setIsSettingsOpen(false)}
          groups={groups}
          onUseDemoData={handleUseDemoData}
        />
      )}
    </div>
  );
}
