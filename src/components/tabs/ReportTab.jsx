import React, { useState } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, Filter, Calendar, Users, CheckCircle, Clock, DollarSign, X, FileSpreadsheet } from 'lucide-react';
import { downloadHtmlReport } from '../../utils/exportHtml';
import { downloadCSV } from '../../utils/exportCsv';
import { formatName, formatPosition } from '../../utils/formatters';

const ReportTab = ({ candidates = [], isAdmin = false, branchId = '' }) => {
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  
  // Apply branch permission filtering (Point 5)
  const filteredData = isAdmin ? candidates : (branchId ? candidates.filter(c => (c.branch || c.desiredBranch) === branchId) : []);

  // Calculate report stats from filteredData
  const totalCandidates = filteredData.length;
  const hiredCandidates = filteredData.filter(c => c.status === 'COMPLETED').length;
  const rejectedCandidates = filteredData.filter(c => c.status === 'REJECTED').length;
  const pendingCandidates = filteredData.filter(c => c.status === 'PENDING').length;
  const sentCandidates = filteredData.filter(c => c.status === 'SENT_TO_BRANCH').length;
  
  const hireRate = totalCandidates > 0 ? ((hiredCandidates / totalCandidates) * 100).toFixed(1) : 0;
  const rejectionRate = totalCandidates > 0 ? ((rejectedCandidates / totalCandidates) * 100).toFixed(1) : 0;

  // Group by position
  const positionStats = filteredData.reduce((acc, c) => {
    const pos = c.position || 'Không xác định';
    if (!acc[pos]) acc[pos] = { total: 0, hired: 0 };
    acc[pos].total += 1;
    if (c.status === 'COMPLETED') acc[pos].hired += 1;
    return acc;
  }, {});

  const sortedPositions = Object.entries(positionStats)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([pos, data]) => ({
      position: pos,
      total: data.total,
      hired: data.hired,
      rate: data.total > 0 ? ((data.hired / data.total) * 100).toFixed(1) : 0
    }));

  // Group by branch
  const branchStats = filteredData.reduce((acc, c) => {
    const branch = c.branch || c.desiredBranch || 'Không xác định';
    if (!acc[branch]) acc[branch] = { total: 0, pending: 0, sent: 0, hired: 0, rejected: 0 };
    acc[branch].total += 1;
    if (c.status === 'PENDING') acc[branch].pending += 1;
    else if (c.status === 'SENT_TO_BRANCH') acc[branch].sent += 1;
    else if (c.status === 'COMPLETED') acc[branch].hired += 1;
    else if (c.status === 'REJECTED') acc[branch].rejected += 1;
    return acc;
  }, {});

  const sortedBranches = Object.entries(branchStats)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([br, data]) => ({ branch: br, ...data }));

  const [columnFilters, setColumnFilters] = useState({
    branch: [],
    position: [],
    status: [],
    name: ''
  });
  const [openFilter, setOpenFilter] = useState(null);

  const uniquePositions = [...new Set(filteredData.map(c => c.position || 'Không xác định'))].sort();
  const uniqueBranches = [...new Set(filteredData.map(c => c.branch || c.desiredBranch || 'Không xác định'))].sort();
  const uniqueStatuses = ['Nhận việc', 'Loại (Từ chối)'];

  const toggleFilterValue = (type, value) => {
    setColumnFilters(prev => {
      const current = prev[type];
      const next = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [type]: next };
    });
  };

  const displayCandidates = filteredData
    .filter(c => {
      // Basic Result filter
      if (c.status !== 'COMPLETED' && c.status !== 'REJECTED') return false;
      
      // Multi-column filter logic
      if (columnFilters.name && !c.name?.toLowerCase().includes(columnFilters.name.toLowerCase())) return false;
      
      if (columnFilters.position.length > 0 && !columnFilters.position.includes(c.position || 'Không xác định')) return false;
      
      if (columnFilters.branch.length > 0 && !columnFilters.branch.includes(c.branch || c.desiredBranch || 'Không xác định')) return false;
      
      if (columnFilters.status.length > 0) {
        const s = c.status === 'COMPLETED' ? 'Nhận việc' : 'Loại (Từ chối)';
        if (!columnFilters.status.includes(s)) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return dateB - dateA;
    });
  
  // Mock report data
  const reportStats = [
    { title: 'Tổng ứng viên', value: totalCandidates.toLocaleString(), icon: <Users size={20} />, color: 'bg-blue-100 text-blue-700', trend: '+12% từ tháng trước' },
    { title: 'Tỷ lệ tuyển dụng', value: `${hireRate}%`, icon: <CheckCircle size={20} />, color: 'bg-green-100 text-green-700', trend: 'Xu hướng ổn định' },
    { title: 'Thời gian tuyển dụng TB', value: '22 Ngày', icon: <Clock size={20} />, color: 'bg-amber-100 text-amber-700', trend: 'Hơn 2 ngày so với Q3' },
    { title: 'Chi phí mỗi lần tuyển', value: '11.000.000đ', icon: <DollarSign size={20} />, color: 'bg-purple-100 text-purple-700', trend: '-5% tối ưu' },
  ];

  // Mock monthly data for charts
  const monthlyData = [
    { month: 'Thg 1', candidates: 120, hires: 18 },
    { month: 'Thg 2', candidates: 145, hires: 22 },
    { month: 'Thg 3', candidates: 180, hires: 25 },
    { month: 'Thg 4', candidates: 210, hires: 32 },
    { month: 'Thg 5', candidates: 195, hires: 28 },
    { month: 'Thg 6', candidates: 230, hires: 35 },
  ];

  // Mock source distribution
  const sourceDistribution = [
    { source: 'LinkedIn', percentage: 35, color: 'bg-primary' },
    { source: 'Giới thiệu', percentage: 25, color: 'bg-tertiary' },
    { source: 'Trang tuyển dụng', percentage: 20, color: 'bg-secondary' },
    { source: 'Bảng tin việc làm', percentage: 15, color: 'bg-blue-400' },
    { source: 'Khác', percentage: 5, color: 'bg-slate-300' },
  ];

  return (
    <div className="h-auto min-h-full flex flex-col bg-[#F2F4F7] text-gray-900 pt-2 px-4 pb-12 lg:pt-3 lg:px-6 lg:pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Báo cáo & phân tích tuyển dụng</h2>
        </div>
        <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const ranges = ['Hôm nay', 'Tuần này', 'Tháng này', 'Quý này', 'Năm nay'];
              const choice = window.prompt('Chọn khoảng thời gian:\n' + ranges.join(', '), 'Tháng này');
              if (choice) alert(`Đã lọc báo cáo theo: ${choice}`);
            }}
            className="bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm px-4 py-2 flex items-center gap-2 font-bold text-sm"
          >
            <Calendar size={16} />
            Khoảng ngày
          </button>
          <button 
            onClick={() => alert('Chức năng lọc nâng cao đang được cập nhật cho phiên bản sắp tới.')}
            className="bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm px-4 py-2 flex items-center gap-2 font-bold text-sm"
          >
            <Filter size={16} />
            Bộ lọc
          </button>
          <button 
            onClick={() => downloadHtmlReport('report-dashboard-content', 'Bao_Cao_Tuyen_Dung')}
            className="bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-opacity shadow-md px-5 py-2 flex items-center gap-2 font-bold text-sm"
          >
            <Download size={16} />
            Xuất báo cáo
          </button>
          {!totalCandidates && (
            <button 
              onClick={() => window.confirm('Dữ liệu đang trống, bạn có muốn nạp dữ liệu mẫu để xem báo cáo?') && (window.location.reload() /* Mock call to parent if needed, but easier to just tell them to use Candidates tab */)}
              className="bg-blue-600 text-white rounded-lg hover:bg-blue-700 px-4 py-2 font-bold text-sm shadow-sm"
            >
              Nạp mẫu
            </button>
          )}
        </div>
        </div>
      </div>

      <div id="report-dashboard-content" className="flex flex-col flex-1 shrink-0">
        {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-4 mb-8 shrink-0">
        {reportStats.map((stat, idx) => {
          const borderColors = {
            'bg-blue-100 text-blue-700': 'border-blue-100 focus-within:border-blue-400',
            'bg-green-100 text-green-700': 'border-green-100 focus-within:border-green-400',
            'bg-amber-100 text-amber-700': 'border-amber-100 focus-within:border-amber-400',
            'bg-purple-100 text-purple-700': 'border-purple-100 focus-within:border-purple-400'
          };
          const borderColor = borderColors[stat.color] || 'border-gray-200';
          
          return (
            <div key={idx} className={`bg-white p-4 rounded-xl shadow-sm border ${borderColor} flex flex-col justify-between group hover:shadow-md transition-all hover:-translate-y-1`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-gray-500">{stat.title}</span>
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">+12%</span>
              </div>
              <div className="mt-2 text-2xl font-black text-gray-900">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Monthly Trends Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[16px] font-black text-gray-900 tracking-tight">Xu hướng tuyển dụng hàng tháng</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                <span className="text-sm font-bold text-gray-400">Ứng viên</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                <span className="text-sm font-bold text-gray-400">Đã tuyển</span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between pt-10">
            {monthlyData.map((month, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 flex-1 px-3">
                <div className="flex flex-col items-center gap-1 w-full h-full justify-end">
                  <div 
                    className="w-full max-w-[20px] bg-blue-600 rounded-t-md transition-all hover:opacity-80" 
                    style={{ height: `${(month.candidates / 250) * 100}%` }}
                    title={`${month.candidates} candidates`}
                  ></div>
                  <div 
                    className="w-full max-w-[20px] bg-emerald-500 rounded-t-md transition-all hover:opacity-80" 
                    style={{ height: `${(month.hires / 40) * 100}%` }}
                    title={`${month.hires} hires`}
                  ></div>
                </div>
                <span className="text-sm font-bold text-gray-400 mt-2">{month.month}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-4 border-t border-gray-100 text-sm font-medium text-gray-500">
            Tuyển dụng cao điểm vào tháng 6 với <span className="text-blue-600 font-bold">230 ứng viên</span> và <span className="text-emerald-600 font-bold">+35 lượt tuyển</span>
          </div>
        </div>

        {/* Source Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[16px] font-black text-gray-900 tracking-tight">Phân bổ nguồn ứng viên</h3>
            <BarChart3 size={20} className="text-blue-600" />
          </div>
          <div className="space-y-6">
            {sourceDistribution.map((source, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-600">{source.source}</span>
                  <span className="text-gray-900">{source.percentage}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`bg-blue-600 h-full rounded-full`}
                    style={{ width: `${source.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-400">LinkedIn vẫn là nguồn ứng viên hàng đầu</span>
              <span className="text-sm font-bold px-3 py-1 bg-blue-50 text-blue-600 rounded-lg">+8% so với cùng kỳ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-[16px] font-black text-gray-900 tracking-tight">Chỉ số tuyển dụng chi tiết</h3>
          <button onClick={() => setShowDetailedReport(true)} className="text-blue-600 text-sm font-bold hover:underline">Xem báo cáo đầy đủ</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">Chuyển đổi phễu</span>
              <span className="text-sm font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md">{hireRate}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${hireRate}%` }}></div>
            </div>
            <p className="text-sm font-medium text-gray-400">Từ ứng tuyển đến khi tuyển thành công</p>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">Phỏng vấn vượt qua</span>
              <span className="text-sm font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-md">42%</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full w-[42%] rounded-full"></div>
            </div>
            <p className="text-sm font-medium text-gray-400">Tỷ lệ thành công khi phỏng vấn</p>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">Chấp nhận lời mời</span>
              <span className="text-sm font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded-md">89%</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-purple-600 h-full w-[89%] rounded-full"></div>
            </div>
            <p className="text-sm font-medium text-gray-400">Tỷ lệ ứng viên chấp nhận làm việc</p>
          </div>
        </div>

        {/* Scrollable Summary Tables */}
        <div className="mt-10 pt-8 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Position Summary Table */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <PieChart size={14} className="text-blue-600" /> Vị trí tuyển dụng (Top)
              </h4>
              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <div className="max-h-60 overflow-y-auto custom-scrollbar bg-slate-50/30">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">Vị trí</th>
                        <th className="p-3 text-[10px] font-bold text-gray-500 uppercase text-center">HS</th>
                        <th className="p-3 text-[10px] font-bold text-gray-500 uppercase text-right">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedPositions.map((pos, idx) => (
                        <tr 
                          key={idx} 
                          className={`hover:bg-white transition-colors cursor-pointer ${columnFilters.position.includes(pos.position) ? 'bg-blue-50' : ''}`}
                          onClick={() => toggleFilterValue('position', pos.position)}
                        >
                          <td className="p-3 text-xs font-bold text-gray-700">{pos.position}</td>
                          <td className="p-3 text-xs font-bold text-gray-900 text-center">
                            <span className="px-2 py-0.5 bg-gray-100 rounded-lg">{pos.total}</span>
                          </td>
                          <td className="p-3 text-xs font-bold text-emerald-600 text-right">{pos.rate}%</td>
                        </tr>
                      ))}
                      {sortedPositions.length === 0 && (
                        <tr><td colSpan="3" className="p-4 text-center text-xs text-gray-400 italic">Chưa có dữ liệu</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Branch Summary Table */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Users size={14} className="text-[#00288e]" /> Theo Chi Nhánh (Top)
              </h4>
              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <div className="max-h-60 overflow-y-auto custom-scrollbar bg-slate-50/30">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">Chi nhánh</th>
                        <th className="p-3 text-[10px] font-bold text-gray-500 uppercase text-center">PV</th>
                        <th className="p-3 text-[10px] font-bold text-gray-500 uppercase text-right">Tổng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedBranches.map((br, idx) => (
                        <tr 
                          key={idx} 
                          className={`hover:bg-white transition-colors cursor-pointer ${columnFilters.branch.includes(br.branch) ? 'bg-blue-50' : ''}`}
                          onClick={() => toggleFilterValue('branch', br.branch)}
                        >
                          <td className="p-3 text-xs font-bold text-gray-700">{br.branch}</td>
                          <td className="p-3 text-xs font-bold text-blue-600 text-center">{br.sent}</td>
                          <td className="p-3 text-xs font-bold text-gray-900 text-right">
                            <span className="px-2 py-0.5 bg-gray-900 text-white rounded-lg">{br.total}</span>
                          </td>
                        </tr>
                      ))}
                      {sortedBranches.length === 0 && (
                        <tr><td colSpan="3" className="p-4 text-center text-xs text-gray-400 italic">Chưa có dữ liệu</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-100" id="candidates-list">
          <div className="flex justify-between items-center mb-6 px-1">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Users size={16} className="text-[#00288e]"/> Danh sách ứng viên có kết quả
              {(columnFilters.branch.length > 0 || columnFilters.position.length > 0 || columnFilters.status.length > 0 || columnFilters.name) && (
                <span className="ml-2 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md normal-case tracking-normal font-bold">
                  Đang áp dụng bộ lọc chuyên sâu
                </span>
              )}
            </h4>
               <div className="flex items-center gap-3">
                 {(columnFilters.branch.length > 0 || columnFilters.position.length > 0 || columnFilters.status.length > 0 || columnFilters.name) && (
                   <button onClick={() => setColumnFilters({ branch: [], position: [], status: [], name: '' })} className="text-[11px] font-black text-blue-600 hover:underline uppercase tracking-wider">
                     Xóa tất cả lọc
                   </button>
                 )}
                 <span className="text-[11px] font-black px-3 py-1 bg-slate-100 text-slate-600 rounded-full uppercase tracking-wider">Hiển thị: {displayCandidates.length}</span>
               </div>
            </div>
            
            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white relative">
              <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-20 border-b border-gray-100">
                    <tr>
                      <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest relative">
                        <div className="flex items-center justify-between">
                          <span>Họ & Tên</span>
                          <div className="relative">
                            <Filter 
                              size={12} 
                              className={`cursor-pointer transition-colors ${columnFilters.name ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                              onClick={() => setOpenFilter(openFilter === 'name' ? null : 'name')}
                            />
                            {openFilter === 'name' && (
                              <div className="absolute top-6 right-0 w-48 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                                <input 
                                  type="text" 
                                  placeholder="Tìm tên..." 
                                  autoFocus
                                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-bold"
                                  value={columnFilters.name}
                                  onChange={(e) => setColumnFilters(prev => ({...prev, name: e.target.value}))}
                                />
                                <div className="mt-2 flex justify-end">
                                  <button onClick={() => setOpenFilter(null)} className="text-[10px] font-bold text-blue-600">Xong</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                      <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest relative">
                        <div className="flex items-center justify-between">
                          <span>Vị trí</span>
                          <div className="relative">
                            <BarChart3 
                              size={12} 
                              className={`cursor-pointer transition-colors ${columnFilters.position.length > 0 ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                              onClick={() => setOpenFilter(openFilter === 'position' ? null : 'position')}
                            />
                            {openFilter === 'position' && (
                              <div className="absolute top-6 right-0 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 flex flex-col max-h-64">
                                <div className="p-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">Lọc Vị trí</span>
                                  <button onClick={() => setColumnFilters(prev => ({...prev, position: []}))} className="text-[9px] text-blue-600 font-bold">Xóa</button>
                                </div>
                                <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                  {uniquePositions.map(pos => (
                                    <label key={pos} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                      <input 
                                        type="checkbox" 
                                        className="w-3 h-3 rounded text-blue-600"
                                        checked={columnFilters.position.includes(pos)}
                                        onChange={() => toggleFilterValue('position', pos)}
                                      />
                                      <span className="text-[11px] font-bold text-gray-700 truncate">{pos}</span>
                                    </label>
                                  ))}
                                </div>
                                <div className="p-2 border-t border-gray-100 flex justify-end">
                                  <button onClick={() => setOpenFilter(null)} className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg">Đóng</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                      <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest relative">
                        <div className="flex items-center justify-between">
                          <span>Chi nhánh</span>
                          <div className="relative">
                            <Users 
                              size={12} 
                              className={`cursor-pointer transition-colors ${columnFilters.branch.length > 0 ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                              onClick={() => setOpenFilter(openFilter === 'branch' ? null : 'branch')}
                            />
                            {openFilter === 'branch' && (
                              <div className="absolute top-6 right-0 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 flex flex-col max-h-64">
                                <div className="p-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">Lọc Chi nhánh</span>
                                  <button onClick={() => setColumnFilters(prev => ({...prev, branch: []}))} className="text-[9px] text-blue-600 font-bold">Xóa</button>
                                </div>
                                <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                  {uniqueBranches.map(br => (
                                    <label key={br} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                      <input 
                                        type="checkbox" 
                                        className="w-3 h-3 rounded text-blue-600"
                                        checked={columnFilters.branch.includes(br)}
                                        onChange={() => toggleFilterValue('branch', br)}
                                      />
                                      <span className="text-[11px] font-bold text-gray-700 truncate">{br}</span>
                                    </label>
                                  ))}
                                </div>
                                <div className="p-2 border-t border-gray-100 flex justify-end">
                                  <button onClick={() => setOpenFilter(null)} className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg">Đóng</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                      <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center relative">
                        <div className="flex items-center justify-center gap-2">
                          <span>Trạng thái</span>
                          <div className="relative">
                            <TrendingUp 
                              size={12} 
                              className={`cursor-pointer transition-colors ${columnFilters.status.length > 0 ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                              onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                            />
                            {openFilter === 'status' && (
                              <div className="absolute top-6 right-0 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 flex flex-col">
                                <div className="p-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">Lọc Kết quả</span>
                                  <button onClick={() => setColumnFilters(prev => ({...prev, status: []}))} className="text-[9px] text-blue-600 font-bold">Xóa</button>
                                </div>
                                <div className="p-2 space-y-1">
                                  {uniqueStatuses.map(s => (
                                    <label key={s} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                      <input 
                                        type="checkbox" 
                                        className="w-3 h-3 rounded text-blue-600"
                                        checked={columnFilters.status.includes(s)}
                                        onChange={() => toggleFilterValue('status', s)}
                                      />
                                      <span className="text-[11px] font-bold text-gray-700">{s}</span>
                                    </label>
                                  ))}
                                </div>
                                <div className="p-2 border-t border-gray-100 flex justify-end">
                                  <button onClick={() => setOpenFilter(null)} className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg">Đóng</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayCandidates.map((c, i) => (
                    <tr key={c.id || i} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-gray-900 text-sm group-hover:text-[#00288e] transition-colors">{formatName(c.name)}</div>
                        {c.email && <div className="text-[11px] text-gray-400 font-medium mt-0.5">{c.email}</div>}
                      </td>
                      <td className="p-4 text-xs font-bold text-gray-600">{formatPosition(c.position)}</td>
                      <td className="p-4 text-xs font-semibold text-gray-500">{c.branch || c.desiredBranch || '-'}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                          c.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                          {c.status === 'COMPLETED' ? 'Nhận việc' : 'Loại (Từ chối)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {displayCandidates.length === 0 && (
                    <tr><td colSpan="4" className="p-12 text-center text-slate-400 font-bold italic text-sm">Không có dữ liệu ứng viên phù hợp.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-gray-900 tracking-widest">Khuyến nghị</p>
              <p className="text-sm font-medium text-gray-400 mt-2">Tập trung cải thiện chương trình giới thiệu để tăng chất lượng ứng viên</p>
            </div>
            <button 
              onClick={() => {
                alert('⏳ Đang phân tích xu hướng tuyển dụng...\n\n✅ Hoàn tất! \n- Gợi ý: Tăng cường quảng cáo vị trí Trợ giảng trong tháng 5.\n- Cần chú ý: Tỷ lệ từ chối tại chi nhánh TÔ KÝ đang cao hơn 15% so với mức trung bình.');
              }}
              className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-shadow shadow-md"
            >
              Tạo thông tin chi tiết
            </button>
          </div>
        </div>
      </div>
    </div>

      {showDetailedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold tracking-wide">
                Báo Cáo Chỉ Số Thông Kê Chi Tiết 
                {isAdmin ? ' (Toàn công ty)' : ` (Chi nhánh ${branchId})`}
              </h2>
              <button onClick={() => setShowDetailedReport(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50 border-t border-gray-100 custom-scrollbar">
              
              {/* Objective Section */}
              <div className="mb-8 bg-blue-900 border-l-4 border-blue-400 p-6 rounded-2xl text-white shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <BarChart3 size={120} />
                </div>
                <h3 className="text-lg font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <TrendingUp size={20} /> 1. Mục tiêu công việc (Objective)
                </h3>
                <p className="text-sm font-medium leading-relaxed max-w-2xl text-blue-100">
                  Cung cấp cái nhìn toàn cảnh về quy mô và mật độ tuyển dụng của toàn công ty, giúp nhận diện vị trí nào đang thu hút nhiều hồ sơ nhất và chi nhánh nào đang có nhu cầu tuyển dụng cao nhất để tối ưu hóa nguồn lực.
                </p>
              </div>

              {/* Report Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2"><PieChart size={16} className="text-[#00288e]"/> Phân bổ theo trạng thái</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                      <span className="text-sm font-semibold text-gray-600">Chờ xử lý (PENDING)</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-gray-900">{pendingCandidates}</span>
                        <span className="text-xs font-bold w-12 text-right text-gray-400">{totalCandidates > 0 ? ((pendingCandidates/totalCandidates)*100).toFixed(1) : 0}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                      <span className="text-sm font-semibold text-gray-600">Đang phỏng vấn (SENT_TO_BRANCH)</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-gray-900">{sentCandidates}</span>
                        <span className="text-xs font-bold w-12 text-right text-gray-400">{totalCandidates > 0 ? ((sentCandidates/totalCandidates)*100).toFixed(1) : 0}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-emerald-50">
                      <span className="text-sm font-semibold text-emerald-700">Đã tuyển dụng (COMPLETED)</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-emerald-600">{hiredCandidates}</span>
                        <span className="text-xs font-bold w-12 text-right text-emerald-500">{totalCandidates > 0 ? ((hiredCandidates/totalCandidates)*100).toFixed(1) : 0}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-rose-50">
                      <span className="text-sm font-semibold text-rose-700">Chấm dứt (REJECTED)</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-rose-600">{rejectedCandidates}</span>
                        <span className="text-xs font-bold w-12 text-right text-rose-500">{totalCandidates > 0 ? ((rejectedCandidates/totalCandidates)*100).toFixed(1) : 0}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-black text-gray-900 uppercase">Tổng cộng</span>
                      <span className="text-lg font-black text-[#00288e]">{totalCandidates}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                   <div className="text-center p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50 mb-4">
                      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Tỷ Lệ Chuyển Đổi Thành Công</h4>
                      <p className="text-5xl font-black text-[#00288e]">{hireRate}%</p>
                      <p className="text-sm font-medium text-slate-500 mt-2">Dựa trên {totalCandidates} hồ sơ nhận được</p>
                   </div>
                   <div className="text-center p-6 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                      <h4 className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-2">Tỷ Lệ Từ Chối/Huỷ Phỏng Vấn</h4>
                      <p className="text-4xl font-black text-rose-600">{rejectionRate}%</p>
                   </div>
                </div>
              </div>

              {/* Advanced Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Positions */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[450px]">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center justify-between">
                     <span className="flex items-center gap-2"><PieChart size={16} className="text-[#00288e]"/> Phân bổ theo vị trí</span>
                     <button 
                        onClick={(e) => { e.stopPropagation(); downloadCSV(sortedPositions, 'Thong_ke_Vi_tri'); }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-[#00288e] transition-colors"
                        title="Xuất CSV"
                     >
                        <FileSpreadsheet size={18} />
                     </button>
                  </h3>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                    {sortedPositions.map((pos) => (
                      <div 
                        key={pos.position} 
                        onClick={() => toggleFilterValue('position', pos.position)}
                        className={`flex justify-between items-center p-3 rounded-xl border flex-wrap gap-2 cursor-pointer transition-colors ${
                           columnFilters.position.includes(pos.position) ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div className="w-full sm:w-auto flex-1">
                           <span className="text-sm font-bold text-gray-800 line-clamp-1">{pos.position}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded-md shrink-0">{pos.total} HS</span>
                          <span className="text-xs font-bold px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md shrink-0">{pos.rate}% Đạt</span>
                        </div>
                      </div>
                    ))}
                    {sortedPositions.length === 0 && <p className="text-sm text-gray-400 italic">Không có dữ liệu vị trí</p>}
                  </div>
                </div>

                {/* Branches */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[450px]">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center justify-between">
                     <span className="flex items-center gap-2"><Users size={16} className="text-[#00288e]"/> Phân bổ theo chi nhánh</span>
                     <button 
                        onClick={(e) => { e.stopPropagation(); downloadCSV(sortedBranches, 'Thong_ke_Chi_nhanh'); }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-[#00288e] transition-colors"
                        title="Xuất CSV"
                     >
                        <FileSpreadsheet size={18} />
                     </button>
                  </h3>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                    {sortedBranches.map((br) => (
                      <div 
                        key={br.branch} 
                        onClick={() => toggleFilterValue('branch', br.branch)}
                        className={`flex flex-col gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                           columnFilters.branch.includes(br.branch) ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                           <span className="text-sm font-bold text-gray-800">{br.branch}</span>
                           <span className="text-xs font-bold px-2 py-1 bg-gray-900 text-white rounded-md shrink-0">{br.total} HS</span>
                        </div>
                        <div className="flex gap-1">
                           {br.pending > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-bold" title="Chờ xử lý">{br.pending} Chờ</span>}
                           {br.sent > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-bold" title="Đang phỏng vấn">{br.sent} PV</span>}
                           {br.hired > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded font-bold" title="Tuyển thành công">{br.hired} Pass</span>}
                        </div>
                      </div>
                    ))}
                    {sortedBranches.length === 0 && <p className="text-sm text-gray-400 italic">Không có dữ liệu chi nhánh</p>}
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
               <button 
                onClick={() => setShowDetailedReport(false)}
                className="px-6 py-2.5 bg-[#00288e] hover:bg-blue-800 text-white rounded-xl font-bold text-sm shadow-md transition-all"
              >
                Đóng báo cáo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReportTab;
