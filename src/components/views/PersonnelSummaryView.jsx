import React, { useMemo } from 'react';
import { Building2, Users, FileText, Download, Printer } from 'lucide-react';
import { formatBranch } from '../../utils/formatters';

export default function PersonnelSummaryView({ employees = [], branches = [] }) {
  const branchesToUse = useMemo(() => {
    if (branches && branches.length > 0) return branches;
    const set = new Set();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [branches, employees]);

  const summaryData = useMemo(() => {
    return branchesToUse.map(branch => {
      const branchStaff = employees.filter(e => 
        String(e.department || '').trim().toLowerCase() === String(branch || '').trim().toLowerCase()
      );
      
      const counts = {
        me: branchStaff.filter(e => 
          /Quản lý|QLCN|TBP|Văn phòng|NVCH|Chủ tịch|Giám đốc|Tổ trưởng|Head office|Chuyên viên/i.test(e.position)
        ).length,
        ime: branchStaff.filter(e => 
          /Giáo viên|GV|Trợ giảng|TA/i.test(e.position) && !/Thỉnh giảng|Part-time|Giao khoán/i.test(e.position)
        ).length,
        security: branchStaff.filter(e => /Bảo vệ/i.test(e.position)).length,
        cleaner: branchStaff.filter(e => /Tạp vụ|Lao công/i.test(e.position)).length,
        visiting: branchStaff.filter(e => /Thỉnh giảng|Part-time|Giao khoán/i.test(e.position)).length,
        other: 0,
        total: branchStaff.length
      };
      
      counts.other = counts.total - (counts.me + counts.ime + counts.security + counts.cleaner + counts.visiting);
      
      return {
        branch,
        ...counts
      };
    });
  }, [employees, branchesToUse]);

  const totals = useMemo(() => {
    return summaryData.reduce((acc, curr) => ({
      me: acc.me + curr.me,
      ime: acc.ime + curr.ime,
      security: acc.security + curr.security,
      cleaner: acc.cleaner + curr.cleaner,
      visiting: acc.visiting + curr.visiting,
      other: acc.other + curr.other,
      total: acc.total + curr.total
    }), { me: 0, ime: 0, security: 0, cleaner: 0, visiting: 0, other: 0, total: 0 });
  }, [summaryData]);

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7] p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Tổng hợp nhân sự hệ thống</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 shadow-sm transition-all text-gray-700">
            <Printer size={16} /> In báo cáo
          </button>
          <button className="px-4 py-2 bg-[#00288e] text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-[#001e6b] shadow-sm transition-all">
            <Download size={16} /> Xuất Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 overflow-y-auto mt-4">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 sticky top-0 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 w-16 text-center">STT</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500">Chi nhánh</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 text-center">ME (QL, TBP, VP)</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 text-center">IME (GV, TG, CH)</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 text-center">Bảo vệ</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 text-center">Tạp vụ</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 text-center">GV thỉnh giảng</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 text-center">Khác</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 text-center">Tổng cộng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summaryData.map((row, idx) => (
              <tr key={row.branch} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4 text-sm text-gray-400 text-center">{idx + 1}</td>
                <td className="px-6 py-4">
                  <div className="text-[15px] font-semibold text-gray-900 leading-relaxed">{formatBranch(row.branch)}</div>
                </td>
                <td className="px-6 py-4 text-[15px] font-semibold text-gray-900 text-center">{row.me}</td>
                <td className="px-6 py-4 text-[15px] font-semibold text-gray-900 text-center">{row.ime}</td>
                <td className="px-6 py-4 text-[15px] font-semibold text-gray-900 text-center">{row.security}</td>
                <td className="px-6 py-4 text-[15px] font-semibold text-gray-900 text-center">{row.cleaner}</td>
                <td className="px-6 py-4 text-[15px] font-semibold text-gray-900 text-center">{row.visiting}</td>
                <td className="px-6 py-4 text-[15px] font-semibold text-gray-900 text-center">{row.other}</td>
                <td className="px-6 py-4 text-sm font-black text-[#00288e] text-center bg-blue-50/30">{row.total}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-black">
              <td className="px-6 py-5 text-sm" colSpan={2}>
                <span className="text-[#00288e] tracking-wider ml-[72px]">TỔNG HỆ THỐNG</span>
              </td>
              <td className="px-6 py-5 text-[15px] text-gray-900 text-center">{totals.me}</td>
              <td className="px-6 py-5 text-[15px] text-gray-900 text-center">{totals.ime}</td>
              <td className="px-6 py-5 text-[15px] text-gray-900 text-center">{totals.security}</td>
              <td className="px-6 py-5 text-[15px] text-gray-900 text-center">{totals.cleaner}</td>
              <td className="px-6 py-5 text-[15px] text-gray-900 text-center">{totals.visiting}</td>
              <td className="px-6 py-5 text-[15px] text-gray-900 text-center">{totals.other}</td>
              <td className="px-6 py-5 text-[15px] text-center text-[#00288e] bg-blue-50/30">{totals.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
