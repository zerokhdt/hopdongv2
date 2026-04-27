import { useMemo, useState, useEffect } from 'react';
import { Building2, Clock, Calendar, Star, Download, Sliders, Eye, X, Handshake } from 'lucide-react';
import { formatName, formatBranch, formatPosition } from '../../utils/formatters';
import { downloadCSV } from '../../utils/exportCsv';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebase";

const BranchManagementTab = ({ isAdmin: _isAdmin = false, onViewDetail, onAction, onNavigateSubTab }) => {
  // Filter candidates sent to branches
  const [candidates, sentCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const q = query(
          collection(db, "candidates_sheet"),
          where("status", "==", "Đã chuyển cho chi nhánh")
        );

        const querySnapshot = await getDocs(q);

        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCandidates(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  const safeSentCandidates = Array.isArray(sentCandidates)
  ? sentCandidates
  : [];
  
  // Mock branch stats
  const branchStats = [
    { title: 'Tổng chuyển chi nhánh', value: safeSentCandidates.length.toLocaleString(), icon: <Building2 size={20} />, color: 'bg-primary-container', trend: '+12% từ tháng trước', trendColor: 'text-green-600' },
    { title: 'Chờ chi nhánh duyệt', value: safeSentCandidates.filter(c => c.status === 'Sent').length.toString(), icon: <Clock size={20} />, color: 'bg-tertiary-fixed/30', textColor: 'text-tertiary', description: 'Thời gian phản hồi TB: 2.4 ngày' },
    { title: 'Lịch phỏng vấn sắp tới', value: '156', icon: <Calendar size={20} />, color: 'bg-secondary-container', textColor: 'text-secondary', description: '8 Lịch hẹn cho ngày mai' },
    { title: 'Tỷ lệ phản hồi chi nhánh', value: '94.2%', icon: <Star size={20} />, color: 'bg-green-100', textColor: 'text-green-700', description: 'Mức hiệu suất tối ưu' },
  ];

  // Mock branch list
  const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(true);
  
    useEffect(() => {
      const fetchBranches = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, "branchs"));
  
          const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
  
          setBranches(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingBranches(false);
        }
      };
      fetchBranches();
    }, []);

  // Table data
  const tableData = sentCandidates.map(candidate => ({
    id: candidate.id,
    name: formatName(candidate.name),
    email: candidate.gmail || '',
    position: formatPosition(candidate.position_name || candidate.position),
    branch: formatBranch(candidate.branch_id || candidate.branch || 'Hội Sở'),
    assignedAt: candidate.assigned_at || candidate.assignedAt || candidate.sent_at || null,
    dateSent: (candidate.assigned_at || candidate.assignedAt || candidate.sent_at || candidate.applied_date || candidate.createdAt) ? new Date(candidate.assigned_at || candidate.assignedAt || candidate.sent_at || candidate.applied_date || candidate.createdAt).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
    branchRecruiter: 'Sarah Jenkins',
    status: candidate.locked_reason
      ? candidate.locked_reason.replace(/^Đã (gửi|giao) chi nhánh\s*['"]?\s*/i, '').replace(/['"]$/, '').trim() || 'Chi nhánh tiếp nhận'
      : (candidate.status === 'Sent' ? 'Chờ duyệt' : 'Đang xem xét'),
    statusColor: candidate.locked_reason ? 'bg-blue-100 text-blue-700' : (candidate.status === 'Sent' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'),
    candidate
  }));

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7] text-gray-900 pt-2 px-4 pb-4 lg:pt-3 lg:px-6 lg:pb-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Điều phối phỏng vấn chi nhánh</h2>
        </div>
        <button 
          onClick={() => downloadCSV(tableData, 'danh_sach_dieu_phoi')}
          className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm px-6 py-2.5 flex items-center gap-2 font-medium text-sm"
        >
          <Download size={18} />
          Xuất CSV
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-6 shrink-0">
        {branchStats.map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between transition-shadow hover:shadow-md">
            <div className="flex justify-between items-start">
              <span className="text-sm font-semibold text-gray-500">{stat.title}</span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-sm font-semibold">+12%</span>
            </div>
            <div className="mt-3 text-3xl font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-500">Lọc theo chi nhánh:</span>
              <div className="relative">
                <select className="appearance-none bg-gray-50 text-gray-700 text-sm font-medium py-2 pl-4 pr-10 rounded-lg focus:ring-0 border border-gray-200 cursor-pointer">
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-500">Trạng thái:</span>
              <div className="flex bg-gray-50 p-1 rounded-lg">
                <button className="px-3 py-2 text-sm font-semibold rounded-md bg-white shadow-sm text-blue-600">Tất cả</button>
                <button className="px-3 py-2 text-sm font-semibold rounded-md text-outline hover:text-on-surface transition-colors">Đang hoạt động</button>
                <button className="px-3 py-2 text-sm font-semibold rounded-md text-outline hover:text-on-surface transition-colors">Hoàn thành</button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-surface-container-high transition-colors text-sm font-semibold text-on-surface-variant">
              <Download size={18} />
              Xuất file
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-surface-container-high transition-colors text-sm font-semibold text-on-surface-variant">
              <Sliders size={18} />
              Cấu hình cột
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-gray-200">
                <th className="px-6 py-4 text-sm font-bold text-gray-500 w-16 text-center">STT</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Ứng viên</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Vị trí ứng tuyển</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Chi nhánh mục tiêu</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Ngày gửi</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Trạng thái</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500 w-[132px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableData.map((row, idx) => (
                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-400 text-center">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="text-[15px] font-semibold text-gray-900 leading-relaxed">{row.name}</div>
                    <div className="text-sm text-gray-500 leading-relaxed">{row.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[#00288e] font-medium leading-relaxed">{row.position}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 leading-relaxed">{row.branch}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 leading-relaxed">{row.dateSent}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-semibold ${row.statusColor} bg-opacity-10 border border-current`}>
                        {row.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onViewDetail && onViewDetail(row.candidate)}
                        className="w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center"
                        title="Xem nhanh CV"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!onAction) return;
                          await onAction(row.id, 'WITHDRAW');
                        }}
                        className="w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-rose-600 flex items-center justify-center"
                        title="Bỏ nhanh CV"
                      >
                        <X size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!onAction) return;
                          const ok = await onAction(row.id, 'TAKEOVER');
                          if (!ok) return;
                          if (onNavigateSubTab) onNavigateSubTab('recruitment-interview');
                          if (onViewDetail) onViewDetail(row.candidate, 'EVALUATE');
                        }}
                        className="w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-indigo-700 flex items-center justify-center"
                        title="HRM phỏng vấn ngay"
                      >
                        <Handshake size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination/Footer */}
        <div className="px-6 lg:px-8 py-4 border-t border-surface-container-low flex justify-between items-center">
          <div className="text-sm text-outline">
            Showing <span className="font-bold text-on-surface">1-{tableData.length}</span> of <span className="font-bold text-on-surface">{sentCandidates.length}</span> candidates
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant">Previous</button>
            <button className="px-3 py-1.5 text-sm rounded-lg bg-primary text-white font-semibold">1</button>
            <button className="px-3 py-1.5 text-sm rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant">2</button>
            <button className="px-3 py-1.5 text-sm rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant">3</button>
            <button className="px-3 py-1.5 text-sm rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchManagementTab;
