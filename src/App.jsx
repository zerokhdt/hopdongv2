import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TaskManagerView from './components/TaskManagerView';
import TaskModal from './components/TaskModal';
import SettingsModal from './components/SettingsModal';
import LoginView from './components/LoginView';
import ContractView, { ContractPreview } from './components/ContractView';
import EmployeeView from './components/EmployeeView';
import PersonnelMovementView from './components/PersonnelMovementView';
import PersonnelSummaryView from './components/PersonnelSummaryView';
import PersonnelReportView from './components/PersonnelReportView';
import MonthlyEvaluationView from './components/MonthlyEvaluationView';
import RecruitmentView from './components/RecruitmentView';
import { SEED_DATA } from './data/employees_seed';
import { supabase } from './utils/supabase.js';
import { apiFetch } from './utils/api.js';

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

const INITIAL_TASKS = [
  { id: 't1', title: 'Kiểm tra hợp đồng đến hạn (HRM)', group: 'XÓM MỚI', status: 'TODO', priority: 'high', assignee: 'Thanh Hải', notes: 'HRM báo: Vui lòng kiểm tra danh sách hợp đồng sẽ hết hạn trong tháng tới và chuẩn bị hồ sơ tái ký.', subtasks: [{ id: 'st1', title: 'Lập danh sách nhân viên hết hạn HĐ', isCompleted: false }] },
  { id: 't2', title: 'Cập nhật thông tin nhân viên mới (HRM)', group: 'THỐNG NHẤT', status: 'IN_PROGRESS', priority: 'medium', assignee: 'Jessie', notes: 'HRM báo: Cập nhật CCCD, địa chỉ tạm trú và số tài khoản ngân hàng cho nhân viên mới tuyển.', subtasks: [] },
  { id: 't3', title: 'Sắp xếp phỏng vấn Giáo viên (HRM)', group: 'GÒ XOÀI', status: 'TODO', priority: 'critical', assignee: 'Quyên', notes: 'HRM báo: Sắp xếp lịch phỏng vấn cho 3 ứng viên vị trí Giáo viên Tiếng Anh tại chi nhánh.', subtasks: [] },
  { id: 't4', title: 'Nộp file cứng hồ sơ nhân sự (HRM)', group: 'HEAD OFFICE', status: 'DONE', priority: 'low', assignee: 'Ms. Chinh', notes: 'HRM báo: Thu thập và nộp bản cứng hồ sơ của các chi nhánh về văn phòng trung tâm.', subtasks: [] },
  { id: 't5', title: 'Rà soát hồ sơ phỏng vấn (HRM)', group: 'XÓM MỚI', status: 'TODO', priority: 'medium', assignee: 'Lê Văn Tám', notes: 'HRM báo: Kiểm tra lại các file mềm hồ sơ phỏng vấn tuần qua.', subtasks: [] },
];

export default function App() {
  const isContractPreview = window.location.search.includes('preview=contract');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [activeTab, setActiveTab] = useState('task-manager');
  const [activeGroup, setActiveGroup] = useState('ALL');
  const [isAddingTask, setIsAddingTask] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [contractEmployeeId, setContractEmployeeId] = useState('');
  
  const [employees, setEmployees] = useState(() => {
    try {
      const raw = localStorage.getItem('ace_hrm_employees_v1');
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_DATA.employees;
    } catch (_e) {
      return SEED_DATA.employees;
    }
  });

  const teamMembers = employees.map(emp => emp.name);
  
  const [colorConfig, setColorConfig] = useState({
    statuses: { 'TODO': 'slate', 'IN_PROGRESS': 'blue', 'DONE': 'green', 'CANCELLED': 'red' },
    groups: { 'TRUNG MỸ TÂY': 'blue', 'NGUYỄN ẢNH THỦ': 'orange', 'NHÂN SỰ': 'purple', 'Gia đình': 'pink' }
  });

  const [groups, setGroups] = useState(SEED_DATA.branches);

  // Đã bỏ việc lưu vào localStorage để đảm bảo clean dữ liệu khi F5

  useEffect(() => {
    try {
      localStorage.setItem('ace_hrm_employees_v1', JSON.stringify(employees));
    } catch (_e) {}
  }, [employees]);

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
          const resp2 = await apiFetch('/api/sync');
          if (!resp2.ok) throw new Error(`HTTP Error ${resp2.status}`);
          const data2 = await resp2.json();
          if ((data2.status === 'success' || data2.success === true) && data2.tasks && data2.tasks.length > 0) {
            setTasks(data2.tasks.map(normalizeTask));
          }
        } catch (_e) {
          console.error("Auto-fetch tasks failed:", _e);
          // Gợi ý cho người dùng kiểm tra cấu hình
          if (location.hostname.includes('vercel.app')) {
            console.warn("Mẹo: Đảm bảo bạn đã thêm VITE_SCRIPT_URL và VITE_SYNC_SECRET vào Environment Variables trên Vercel Dashboard.");
          }
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

  const [movements, setMovements] = useState([
    { id: 'MOV1', type: 'ONBOARDING', employeeName: 'Trần Văn A', status: 'APPROVED', branchId: 'TRUNG MỸ TÂY', createdAt: '2024-01-10T09:00:00Z', details: { name: 'Trần Văn A', position: 'Giáo viên', department: 'TRUNG MỸ TÂY', startDate: '2024-01-15' } },
    { id: 'MOV2', type: 'LEAVE', employeeName: 'Huỳnh Ngọc Bảo Lâm', status: 'APPROVED', branchId: 'NGUYỄN ẢNH THỦ', createdAt: '2024-03-27T14:30:00Z', details: { from: '2024-04-10', to: '2024-04-11', days: 2, reason: 'Nghỉ phép năm' } },
    { id: 'MOV3', type: 'CAREER_CHANGE', employeeName: 'Nguyễn Trường Thanh Trí', status: 'APPROVED', branchId: 'LIÊN KHU 4-5', createdAt: '2023-12-15T11:20:00Z', details: { newRole: 'Quản lý chi nhánh', branch: 'LIÊN KHU 4-5' } },
    { id: 'MOV4', type: 'LEAVE', employeeName: 'Ms. Chinh', status: 'APPROVED', branchId: 'HQ', createdAt: '2024-03-20T08:00:00Z', details: { from: '2024-05-01', to: '2024-10-28', days: 180, reason: 'Nghỉ thai sản' } },
  ]);

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_branch');
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    if (supabase && supabase.auth) supabase.auth.signOut();
  };

  useEffect(() => {
    if (!supabase || !supabase.auth) return
    supabase.auth.getSession().then(() => {})
  }, [])


  const onSyncPull = async (silent = false) => {
    try {
      const token = localStorage.getItem('token') || ''
      const resp = await apiFetch('/api/tasks/list', { headers: { Authorization: `Bearer ${token}` } })
      if (resp.ok) {
        const data = await resp.json()
        if (data?.ok && Array.isArray(data.tasks)) {
          setTasks(data.tasks.map(normalizeTask))
          if (!silent) alert("Đã tải dữ liệu mới nhất từ Supabase về máy.")
          return
        }
      }
      const resp2 = await apiFetch('/api/sync');
      const data2 = await resp2.json();
      if ((data2.status === 'success' || data2.success === true) && data2.tasks) {
        setTasks(data2.tasks.map(normalizeTask));
        if (!silent) alert("Đã tải dữ liệu mới nhất từ Sheet về máy.");
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
          if (!silent) alert(`Đã đẩy dữ liệu lên Supabase thành công!`)
          return
        }
      }
      const resp2 = await apiFetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });
      const data2 = await resp2.json();
      if ((data2.status === 'success' || data2.success === true) && data2.tasks) {
        setTasks(data2.tasks.map(normalizeTask));
        if (!silent) alert(`Đã đẩy dữ liệu lên Sheet thành công!`);
      } else if (!silent) {
        alert("Lỗi đẩy dữ liệu: " + (data2.message || "Không xác định"));
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
        const token = String(localStorage.getItem('token') || '').trim();
        if (!token) return;
        const resp = await apiFetch('/api/notifications/poll', { headers: { Authorization: `Bearer ${token}` } });
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
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        groups={groups} tasks={tasks}
        activeGroup={activeGroup} setActiveGroup={setActiveGroup} 
        onAddGroup={handleAddGroup} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        userRole={userRole}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        <Header 
          userRole={userRole}
          onAddTask={() => {
            const now = new Date();
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            
            const tzOffset = now.getTimezoneOffset() * 60000;
            const startStr = new Date(now - tzOffset).toISOString().slice(0, 16);
            const endStr = new Date(end - tzOffset).toISOString().slice(0, 16);
            
            // Tính toán mặc định nhắc nhở trước 1h
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
          reminderCount={reminderCount} 
          onSyncPull={onSyncPull}
          onSyncPush={onSyncPush}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-hidden bg-[#F2F4F7]">
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
          {activeTab === 'recruitment' && (
            <RecruitmentView 
              userRole={userRole}
              branchId={localStorage.getItem('user_branch')}
              employees={employees}
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
        />
      )}
    </div>
  );
}
