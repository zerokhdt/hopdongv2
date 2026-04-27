import React, { useMemo, useState, useEffect } from 'react';
import { Download, Printer, Filter, Search, RefreshCw, BarChart3, Users, TrendingUp } from 'lucide-react';
import CandidateDetailModal from '../modals/CandidateDetailModal';
import { formatName, formatBranch, formatPosition } from '../../utils/formatters';
import { downloadCSV } from '../../utils/exportCsv';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebase";

const CandidatesTab = ({ branches = [], isAdmin: _isAdmin = false, branchId: _branchId = '', onViewDetail, onBulkAction, onMock }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "candidates_sheet"));

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
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState({
    position: [],
    branch: [],
    status: [],
    name: ''
  });
  const [openFilter, setOpenFilter] = useState(null);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBranch, setBulkBranch] = useState('');
  useEffect(() => {
      const fetchBranches = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, "branchs"));
  
          const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
  
          setBulkBranches(data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchBranches();
    }, []);

  const handleViewDetails = (candidate) => {
    if (onViewDetail) {
      onViewDetail(candidate);
    } else {
      setSelectedCandidate(candidate);
      setIsModalOpen(true);
    }
  };
  // Calculate stats from candidates
  const totalCandidates = candidates.length;
  const pendingCandidates = candidates.filter(c => c.status === 'PENDING' || c.status === null ).length;
  const sentCandidates = candidates.filter(c => c.status === 'SENT_TO_BRANCH' || c.status === 'Đã chuyển cho chi nhánh' ).length;
  const completedCandidates = candidates.filter(c => c.status === 'COMPLETED' || c.status === 'Nhận việc').length;
  const rejectedCandidates = candidates.filter(c => c.status === 'REJECTED' || c.status === 'Từ chối').length;

  // Mock source data - Sliced to 3 for compact list view
  const sourceData = [
    { name: 'LinkedIn', count: 1240, percentage: 65, color: 'bg-[#00288e]' },
    { name: 'Giới thiệu', count: 482, percentage: 35, color: 'bg-indigo-500' },
    { name: 'TopCV', count: 2109, percentage: 85, color: 'bg-cyan-500' },
  ];

  // Mock branch performance - Sliced to 3 for compact list view
  const branchPerformance = [
    { name: 'HCM - Quận 1', fillRate: 82, vacancies: 24, hires: 12, colorClass: 'bg-[#00288e]' },
    { name: 'Đà Nẵng - Hải Châu', fillRate: 95, vacancies: 8, hires: 9, colorClass: 'bg-emerald-500' },
    { name: 'Hà Nội - Ba Đình', fillRate: 45, vacancies: 18, hires: 4, colorClass: 'bg-amber-500' },
  ];

  // Mock interview pipeline - Sliced to 3 for compact list view
  const interviewPipeline = [
    { role: 'Product Designer', stage: 'Vòng cuối', candidates: 5, due: 'Hôm nay' },
    { role: 'Backend Dev', stage: 'Kiểm tra kỹ thuật', candidates: 9, due: 'Ngày mai' },
    { role: 'Marketing Lead', stage: 'Sàng lọc', candidates: 12, due: 'Tuần sau' },
  ];

  // Sort all candidates by newest first
  const sortedCandidates = [...candidates].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0);
    const dateB = new Date(b.updatedAt || b.createdAt || 0);
    return dateB - dateA;
  });

  // Filter by search term
  const uniquePositions = useMemo(() => [...new Set(candidates.map(c => c.position || 'Không xác định'))].sort(), [candidates]);
  const uniqueBranches = useMemo(() => [...new Set(candidates.map(c => c.branch || c.desiredBranch))].sort(), [candidates]);
  const uniqueStatuses = useMemo(() => [...new Set(candidates.map(c => c.status ))].sort(), [candidates]);

  const toggleFilterValue = (type, value) => {
    setColumnFilters(prev => {
      const current = prev[type];
      const next = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [type]: next };
    });
  };

  const filteredSearchCandidates = useMemo(() => {
    return sortedCandidates.filter(c => {
      // Global search bar
      if (searchTerm) {
        const match = [c.name, c.email, c.phone, c.position, c.branch, c.desiredBranch]
          .some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!match) return false;
      }

      // Column specific filters
      if (columnFilters.name && !c.name?.toLowerCase().includes(columnFilters.name.toLowerCase())) return false;
      
      if (columnFilters.position.length > 0 && !columnFilters.position.includes(c.position || 'Không xác định')) return false;

      if (columnFilters.branch.length > 0 && !columnFilters.branch.includes(c.branch || c.desiredBranch || 'Không xác định')) return false;

      if (columnFilters.status.length > 0 && !columnFilters.status.includes(c.status || 'PENDING')) return false;

      return true;
    });
  }, [sortedCandidates, searchTerm, columnFilters]);

  // History rows from filtered candidates
  const historyRows = filteredSearchCandidates.map(candidate => ({
    name: formatName(candidate.name),
    email: candidate.gmail || 'no-email@example.com',
    position: formatPosition(candidate.position),
    branch: formatBranch(candidate.branch || 'Hội Sở'),
    result: candidate.locked_reason?.trim()
      ? candidate.locked_reason
      : (candidate.status === 'COMPLETED' || candidate.status === 'Nhận việc') ? 'Nhận việc' 
      : (candidate.status === 'REJECTED' || candidate.status === 'Từ chối')? 'Từ chối' 
      : (candidate.status === 'SENT_TO_BRANCH' || candidate.status === 'Đã chuyển cho chi nhánh') ? 'Đã chuyển cho chi nhánh' 
      : (candidate.status === 'INTERVIEW_ASSIGNED' || candidate.status === 'Đã hẹn PV') ? 'Đã phân phỏng vấn' 
      : (candidate.status === 'SAVE' || candidate.status === 'LƯU HỒ SƠ') ? 'Đã phân phỏng vấn' 
      : 'Đang chờ',
    date: candidate.date_of_submission
      ? new Date(candidate.date_of_submission).toLocaleDateString('vi-VN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : 'Hôm nay',
    resultColor: (candidate.status === 'COMPLETED' || candidate.status === 'Nhận việc') ? 'green' :
                (candidate.status === 'REJECTED' || candidate.status === 'Từ chối') ? 'red' :
                (candidate.status === 'SENT_TO_BRANCH' || candidate.status === 'Đã chuyển cho chi nhánh' || candidate.status === 'INTERVIEW_ASSIGNED' || candidate.status === 'Đã hẹn PV') ? 'blue' 
                : 'slate',
    original: candidate
  }));

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7] text-gray-900 pt-2 px-4 pb-4 lg:pt-3 lg:px-6 lg:pb-6 overflow-y-auto font-sans">
      
      {/* Detail Modal (Only if standalone) */}
      {!onViewDetail && (
        <CandidateDetailModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          candidate={selectedCandidate} 
        />
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Trung tâm tuyển dụng</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm kiếm ứng viên..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-[#f2f4f6] text-[15px] font-medium leading-relaxed text-gray-900 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all w-64 border border-transparent focus:border-[#00288e]/20"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors shadow-sm">
            <Filter size={16} />
            Lọc
          </button>
          <button 
            onClick={() =>
              downloadCSV(
                historyRows.map(({ original, resultColor, ...rest }) => rest),
                'danh_sach_ung_vien'
              )
            }
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            <Download size={16} />
            Xuất CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-6 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between transition-shadow hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-gray-500">Tổng ứng viên</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-sm font-semibold">+12%</span>
          </div>
          <div className="mt-3 text-3xl font-bold text-gray-900">{totalCandidates}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between transition-shadow hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-gray-500">Chờ xử lý</span>
            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md text-sm font-semibold">+8%</span>
          </div>
          <div className="mt-3 text-3xl font-bold text-gray-900">{pendingCandidates}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between transition-shadow hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-gray-500">Đang phỏng vấn</span>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-sm font-semibold">+24%</span>
          </div>
          <div className="mt-3 text-3xl font-bold text-gray-900">{sentCandidates}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between transition-shadow hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-gray-500">Đã nhận / Loại</span>
            <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded-md text-sm font-semibold">Kết quả</span>
          </div>
          <div className="mt-3 text-3xl font-bold text-gray-900">{completedCandidates + rejectedCandidates}</div>
        </div>
      </div>

      {/* FULL WIDTH TABLE: Danh sách ứng viên (Chiếm không gian chính) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mb-6 shrink-0">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-white z-10">
          <h3 className="text-base font-medium text-gray-900">Danh sách nhân sự / Ứng viên</h3>
          <div className="flex gap-2">
            <button onClick={onMock} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-amber-500" title="Mock 100 UV">
              <RefreshCw size={18} />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
              <Download size={18} />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
              <Printer size={18} />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto relative pb-20">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={historyRows.length > 0 && selectedIds.length === historyRows.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(historyRows.map(r => r.original.id));
                      else setSelectedIds([]);
                    }}
                  />
                </th>
                <th className="px-2 py-4 text-[11px] font-black text-gray-500 uppercase tracking-widest w-12 text-center">STT</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-widest relative">
                  <div className="flex items-center justify-between">
                    <span>Họ và tên</span>
                    <div className="relative">
                      <Filter 
                        size={12} 
                        className={`cursor-pointer ${columnFilters.name ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        onClick={() => setOpenFilter(openFilter === 'name' ? null : 'name')}
                      />
                      {openFilter === 'name' && (
                        <div className="absolute top-6 left-0 w-48 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-50">
                          <input 
                            type="text" 
                            placeholder="Tìm tên..." 
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none font-bold"
                            value={columnFilters.name}
                            onChange={(e) => setColumnFilters(prev => ({...prev, name: e.target.value}))}
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-widest relative">
                  <div className="flex items-center justify-between">
                    <span>Vị trí</span>
                    <div className="relative">
                      <BarChart3 
                        size={12} 
                        className={`cursor-pointer ${columnFilters.position.length > 0 ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        onClick={() => setOpenFilter(openFilter === 'position' ? null : 'position')}
                      />
                      {openFilter === 'position' && (
                        <div className="absolute top-6 left-0 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 flex flex-col max-h-64">
                          <div className="p-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center text-[10px] font-bold">
                            <span>LỌC VỊ TRÍ</span>
                            <button onClick={() => setColumnFilters(prev => ({...prev, position: []}))} className="text-blue-600">Xóa</button>
                          </div>
                          <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {uniquePositions.map(pos => (
                              <label key={pos} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="w-3 h-3 text-blue-600 rounded"
                                  checked={columnFilters.position.includes(pos)}
                                  onChange={() => toggleFilterValue('position', pos)}
                                />
                                <span className="text-[11px] font-bold text-gray-700 truncate">{pos}</span>
                              </label>
                            ))}
                          </div>
                          <button onClick={() => setOpenFilter(null)} className="m-2 p-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">Đóng</button>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-widest relative">
                  <div className="flex items-center justify-between">
                    <span>Chi nhánh</span>
                    <div className="relative">
                      <Users 
                        size={12} 
                        className={`cursor-pointer ${columnFilters.branch.length > 0 ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        onClick={() => setOpenFilter(openFilter === 'branch' ? null : 'branch')}
                      />
                      {openFilter === 'branch' && (
                        <div className="absolute top-6 left-0 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 flex flex-col max-h-64">
                          <div className="p-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center text-[10px] font-bold">
                            <span>CHI NHÁNH</span>
                            <button onClick={() => setColumnFilters(prev => ({...prev, branch: []}))} className="text-blue-600">Xóa</button>
                          </div>
                          <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {uniqueBranches.map(br => (
                              <label key={br} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="w-3 h-3 text-blue-600 rounded"
                                  checked={columnFilters.branch.includes(br)}
                                  onChange={() => toggleFilterValue('branch', br)}
                                />
                                <span className="text-[11px] font-bold text-gray-700 truncate">{br}</span>
                              </label>
                            ))}
                          </div>
                          <button onClick={() => setOpenFilter(null)} className="m-2 p-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">Đóng</button>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-widest text-center">Ngày nộp</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-widest relative">
                  <div className="flex items-center justify-between gap-2">
                    <span>Trạng thái</span>
                    <div className="relative">
                      <TrendingUp 
                        size={12} 
                        className={`cursor-pointer ${columnFilters.status.length > 0 ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                      />
                      {openFilter === 'status' && (
                        <div className="absolute top-6 right-0 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 flex flex-col">
                          <div className="p-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center text-[10px] font-bold">
                            <span>TRẠNG THÁI</span>
                            <button onClick={() => setColumnFilters(prev => ({...prev, status: []}))} className="text-blue-600">Xóa</button>
                          </div>
                          <div className="p-2 space-y-1">
                            {uniqueStatuses.map(s => (
                              <label key={s} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="w-3 h-3 text-blue-600 rounded"
                                  checked={columnFilters.status.includes(s)}
                                  onChange={() => toggleFilterValue('status', s)}
                                />
                                <span className="text-[11px] font-bold text-gray-700">{s}</span>
                              </label>
                            ))}
                          </div>
                          <button onClick={() => setOpenFilter(null)} className="m-2 p-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">Đóng</button>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historyRows.map((row, idx) => (
                <tr 
                  key={idx} 
                  className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                  onClick={(e) => {
                    // Check if clicked the checkbox
                    if (e.target.type === 'checkbox') return;
                    handleViewDetails(row.original);
                  }}
                >
                  <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      checked={selectedIds.includes(row.original.id)}
                      onChange={(e) => {
                        const id = row.original.id;
                        if (e.target.checked) setSelectedIds(prev => [...prev, id]);
                        else setSelectedIds(prev => prev.filter(x => x !== id));
                      }}
                    />
                  </td>
                  <td className="px-2 py-4 text-sm text-gray-400 text-center">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="text-[15px] font-semibold text-gray-900 leading-relaxed group-hover:text-[#00288e] group-hover:underline underline-offset-2 transition-all">
                      {row.name}
                    </div>
                    <div className="text-sm text-gray-500 leading-relaxed">{row.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[#00288e] font-medium leading-relaxed">
                    {row.position}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 leading-relaxed">{row.branch}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 leading-relaxed text-center">{row.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-semibold ${
                        row.resultColor === 'green' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        row.resultColor === 'red' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        row.resultColor === 'blue' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {row.result}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center">
          <span className="text-sm text-gray-500">Hiển thị 1 đến {historyRows.length} của {totalCandidates} hồ sơ</span>
          <div className="flex gap-1">
            <button className="px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-md transition-colors">Trang trước</button>
            <button className="px-3 py-2 text-sm font-medium bg-[#00288e] text-white rounded-md">1</button>
            <button className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors">2</button>
            <button className="px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-md transition-colors">Trang sau</button>
          </div>
        </div>
      </div>

      {/* BOTTOM WIDGETS: 3 Columns - Compact List View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 pb-6">
        
        {/* 1. Lịch phỏng vấn */}
        <div className="bg-white p-5 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[14px] font-semibold text-gray-900">Lịch phỏng vấn sắp tới</h3>
            <button className="text-[#00288e] text-sm font-medium hover:underline">Xem tất cả</button>
          </div>
          <div className="flex flex-col">
            {interviewPipeline.map((pipe, idx) => (
              <div key={idx} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                <div className="min-w-0 pr-4">
                  <div className="text-[15px] font-medium text-gray-900 leading-relaxed truncate">{pipe.role}</div>
                  <div className="text-sm text-gray-500 leading-relaxed truncate">{pipe.stage} • {pipe.candidates} ứng viên</div>
                </div>
                <span className={`shrink-0 px-2 py-1 text-sm font-semibold rounded-md ${pipe.due === 'Hôm nay' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                  {pipe.due}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Nguồn tuyển dụng */}
        <div className="bg-white p-5 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[14px] font-semibold text-gray-900">Hiệu suất nguồn CV</h3>
            <span className="text-sm text-gray-400">Tuần này</span>
          </div>
          <div className="flex flex-col">
            {sourceData.map((source, idx) => (
              <div key={idx} className="flex items-center py-2.5 border-b border-gray-50 last:border-0">
                <div className="w-20 shrink-0">
                  <div className="text-[15px] font-medium text-gray-900 leading-relaxed truncate">{source.name}</div>
                  <div className="text-sm text-gray-500 leading-relaxed">{source.count} CV</div>
                </div>
                <div className="flex-1 px-3">
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`${source.color} h-full`} style={{ width: `${source.percentage}%` }}></div>
                  </div>
                </div>
                <div className="w-10 shrink-0 text-right text-sm font-semibold text-gray-600">
                  {source.percentage}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Hiệu suất chi nhánh */}
        <div className="bg-white p-5 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[14px] font-semibold text-gray-900">Tỷ lệ lấp đầy chi nhánh</h3>
            <span className="text-sm text-gray-400">Tháng này</span>
          </div>
          <div className="flex flex-col">
            {branchPerformance.map((branch, idx) => (
              <div key={idx} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                <div className="min-w-0 pr-4">
                  <div className="text-[15px] font-medium text-gray-900 leading-relaxed truncate">{branch.name}</div>
                  <div className="text-sm text-gray-500 leading-relaxed truncate">{branch.vacancies} trống • Đã tuyển {branch.hires}</div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-[#00288e] leading-relaxed">{branch.fillRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className="font-bold text-sm bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
            Đã chọn <span className="text-orange-400">{selectedIds.length}</span> hồ sơ
          </div>
          
          <select 
            value={bulkBranch}
            onChange={(e) => setBulkBranch(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-bold text-white outline-none cursor-pointer focus:border-orange-400"
          >
            <option value="">-- Chọn chi nhánh giao việc --</option>
            {branches.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>

          <button 
            disabled={!bulkBranch}
            onClick={() => {
              if (!bulkBranch) return;
              const extra = { branch: bulkBranch, branch_label: bulkBranch, assignment_type: 'branch' };
              onBulkAction(selectedIds, 'SEND', extra).then(success => {
                if (success) {
                  setSelectedIds([]);
                  setBulkBranch('');
                }
              });
            }}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Gửi đi
          </button>
          <button 
            onClick={() => { setSelectedIds([]); setBulkBranch(''); }} 
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Bỏ chọn"
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  );
};

export default CandidatesTab;
