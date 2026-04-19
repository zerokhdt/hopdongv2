import { useEffect, useState, useMemo } from 'react';
import { Users, Clock, Calendar, Search, Filter, Download, CheckCircle, X, Eye, Handshake } from 'lucide-react';
import { formatName, formatBranch, formatPosition } from '../../utils/formatters';
import { downloadCSV } from '../../utils/exportCsv';

const InterviewTab = ({ candidates = [], isAdmin: _isAdmin = false, preselectCandidateId, onConsumedPreselect, onViewDetail, onAction, onNavigateSubTab }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', date: '', time: '' });
  const [selectedId, setSelectedId] = useState(null);
  
  // Filter candidates with interview history or upcoming interviews
  const interviewCandidates = useMemo(() => {
    return candidates
      .filter(c => ['Interviewing', 'Sent', 'SENT_TO_BRANCH', 'INTERVIEW_ASSIGNED', 'COMPLETED', 'REJECTED'].includes(c.status))
      .sort((a, b) => new Date(b.updatedAt || b.updated_at || b.createdAt || 0) - new Date(a.updatedAt || a.updated_at || a.createdAt || 0));
  }, [candidates]);
  
  // Mock interview stats
  const interviewStats = [
    { title: 'Tổng số phỏng vấn', value: interviewCandidates.length.toLocaleString(), icon: <Users size={20} />, trend: '+12.5% so với tháng trước', trendColor: 'text-emerald-600' },
    { title: 'Tỷ lệ tuyển dụng %', value: '18.4%', icon: <CheckCircle size={20} />, trend: 'Xu hướng ổn định', trendColor: 'text-on-surface-variant' },
    { title: 'Thời gian tuyển dụng TB', value: '22 Ngày', icon: <Clock size={20} />, trend: 'Hơn 2 ngày so với Q3', trendColor: 'text-error' },
  ];

  // Mock branches
  const branches = [
    { id: 1, name: 'Tất cả chi nhánh' },
    { id: 2, name: 'ACE AN SƯƠNG' },
    { id: 3, name: 'ACE PHAN VĂN HỚN' },
    { id: 4, name: 'ACE HÀ HUY GIÁP' },
    { id: 5, name: 'ACE LÊ VĂN KHƯƠNG' },
    { id: 6, name: 'TRỤ SỞ CHÍNH' },
  ];

  // Mock results filter
  const resultFilters = [
    { id: 1, name: 'Tất cả trạng thái' },
    { id: 2, name: 'Đã tuyển' },
    { id: 3, name: 'Từ chối' },
    { id: 4, name: 'Rút hồ sơ' },
  ];

  // Table data
  const tableData = interviewCandidates.map(candidate => {
    const isCompleted = candidate.status === 'COMPLETED';
    const isRejected = candidate.status === 'REJECTED';
    const isSent = candidate.status === 'Sent' || candidate.status === 'SENT_TO_BRANCH';

    let result = 'Đang chờ';
    let resultColor = 'bg-blue-100 text-blue-700';
    if (isCompleted) { result = 'Đã tuyển'; resultColor = 'bg-green-100 text-green-700'; }
    else if (isRejected) { result = 'Từ chối'; resultColor = 'bg-red-100 text-red-700'; }
    else if (isSent) { result = 'Chờ chi nhánh'; resultColor = 'bg-amber-100 text-amber-700'; }

    return {
      id: candidate.id,
      name: formatName(candidate.name),
      email: candidate.email || '',
      position: formatPosition(candidate.position_name || candidate.position),
      branch: formatBranch(candidate.branch_id || candidate.branch || 'Hội Sở'),
      interviewDate: candidate.interview_scheduled_date ? new Date(candidate.interview_scheduled_date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' }) : (candidate.applied_date || candidate.createdAt ? new Date(candidate.applied_date || candidate.createdAt).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'),
      result,
      resultColor,
      interviewer: 'Sarah Jenkins',
      candidate
    };
  });
  
  // Initialize local state
  const [localData, setLocalData] = useState([]);
  
  const displayData = useMemo(() => [...localData, ...tableData], [localData, tableData]);
  
  useEffect(() => {
    if (!preselectCandidateId) return;
    setSelectedId(preselectCandidateId);
    if (onConsumedPreselect) onConsumedPreselect();
  }, [preselectCandidateId, onConsumedPreselect]);

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.date || !formData.time) {
      alert("Vui lòng điền đủ thông tin!");
      return;
    }
    const newEntry = {
      id: Date.now(),
      name: formData.name,
      email: 'no-email@example.com',
      position: 'Ứng viên mới',
      branch: 'Hội Sở',
      interviewDate: new Date(formData.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + formData.time,
      result: 'Chờ phỏng vấn',
      resultColor: 'bg-amber-100 text-amber-700',
      interviewer: 'Chưa có',
      feedback: 'Chưa có'
    };
    setLocalData([newEntry, ...localData]);
    setIsModalOpen(false);
    setFormData({ name: '', date: '', time: '' });
  };

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7] text-gray-900 p-4 lg:p-6 overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Lịch sử phỏng vấn</h2>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => downloadCSV(displayData, 'lich_su_phong_van')}
            className="bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm px-4 py-2 flex items-center gap-2 font-medium text-sm"
          >
            <Download size={16} />
            Xuất file CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 px-4 py-2 flex items-center gap-2 font-bold text-sm"
          >
            <Calendar size={16} />
            Hẹn lịch phỏng vấn
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {interviewStats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              {stat.icon}
            </div>
            <p className="text-sm font-semibold text-outline mb-2">{stat.title}</p>
            <h3 className="text-3xl font-bold text-on-surface mb-2">{stat.value}</h3>
            <p className={`text-sm font-semibold ${stat.trendColor}`}>{stat.trend}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-gray-50/30">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input 
              type="text"
              placeholder="Tìm theo tên ứng viên hoặc vị trí..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border-none rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <select className="bg-white border-none rounded-lg px-4 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-primary min-w-[140px]">
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            <select className="bg-white border-none rounded-lg px-4 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-primary min-w-[140px]">
              {resultFilters.map(filter => (
                <option key={filter.id} value={filter.id}>{filter.name}</option>
              ))}
            </select>
            <button className="bg-white p-2.5 rounded-lg text-outline hover:text-primary shadow-sm border-none">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-gray-200">
                <th className="px-6 py-4 text-sm font-bold text-gray-500 w-16 text-center">STT</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Họ và tên</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Vị trí</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Chi nhánh</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Ngày phỏng vấn</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Trạng thái</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500 w-[132px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayData.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  className={`${selectedId === row.id ? 'bg-blue-50/50 border-l-4 border-l-[#00288e]' : ''} hover:bg-blue-50/30 transition-colors cursor-pointer`}
                >
                  <td className="px-6 py-4 text-sm text-gray-400 text-center">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="text-[15px] font-semibold text-gray-900 leading-relaxed">{row.name}</div>
                    <div className="text-sm text-gray-500 leading-relaxed">{row.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[#00288e] font-medium leading-relaxed">{row.position}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 leading-relaxed">{row.branch}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 leading-relaxed">{row.interviewDate}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-semibold ${row.resultColor} bg-opacity-10 border border-current`}>
                      {row.result}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {row.candidate ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination/Footer */}
        <div className="px-6 py-4 border-t border-surface-container-low flex justify-between items-center">
          <div className="text-sm text-outline">
            Showing <span className="font-bold text-on-surface">1-{displayData.length}</span> of <span className="font-bold text-on-surface">{interviewCandidates.length + localData.length}</span> interviews
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

      {/* Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">Hẹn lịch phỏng vấn</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleScheduleSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên ứng viên</label>
                <select 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                >
                  <option value="">-- Chọn ứng viên đang chờ --</option>
                  {candidates.filter(c => c.status !== 'COMPLETED' && c.status !== 'REJECTED').map(c => (
                    <option key={c.id} value={c.name}>{formatName(c.name)} - {formatPosition(c.position)}</option>
                  ))}
                  <option value="Ứng viên khác">Ứng viên khác (Nhập tay...)</option>
                </select>
                {formData.name === 'Ứng viên khác' && (
                  <input 
                    type="text" 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="Nhập tên ứng viên..."
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ngày phỏng vấn</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Giờ phỏng vấn</label>
                  <input 
                    type="time" 
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">
                  Lưu lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewTab;
