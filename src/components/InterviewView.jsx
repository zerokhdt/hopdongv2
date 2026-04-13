import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Giả sử bạn dùng React Router
import { apiFetch } from '../utils/api';
import { Loader, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';

// Component con cho từng trường thông tin
const InfoField = ({ label, value }) => (
  <div className="mb-3">
    <p className="text-sm font-semibold text-slate-500">{label}</p>
    <p className="text-base text-slate-800">{value || 'N/A'}</p>
  </div>
);

// Component con cho form phỏng vấn
const InterviewForm = ({ candidate, onSubmit, isSaving }) => {
  const [formData, setFormData] = useState({
    status: candidate?.status || 'PENDING',
    interview_note: candidate?.interview_note || '',
    // Thêm các trường khác ở đây
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
      <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Form Dành Cho Người Phỏng Vấn</h3>
      <div className="flex-grow">
        <div className="mb-4">
          <label htmlFor="interview_note" className="block text-sm font-bold text-slate-700 mb-2">Nhận xét và đánh giá</label>
          <textarea
            id="interview_note"
            name="interview_note"
            rows="10"
            value={formData.interview_note}
            onChange={handleChange}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Điền nhận xét chi tiết về ứng viên..."
          ></textarea>
        </div>
        <div className="mb-4">
          <label htmlFor="status" className="block text-sm font-bold text-slate-700 mb-2">Cập nhật trạng thái</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="PENDING">Chờ phỏng vấn</option>
            <option value="PASSED">Đạt</option>
            <option value="FAILED">Không đạt</option>
            <option value="OFFERED">Đã mời nhận việc</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
      >
        {isSaving ? <Loader className="animate-spin mr-2" size={20} /> : <CheckCircle size={20} className="mr-2" />}
        {isSaving ? 'Đang lưu...' : 'Lưu Kết Quả Phỏng Vấn'}
      </button>
    </form>
  );
};


export default function InterviewView() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await apiFetch(`/api/sync?id=${candidateId}`);
        if (data.success) {
          setCandidate(data.data);
        } else {
          throw new Error(data.message || 'Không thể tải dữ liệu ứng viên.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (candidateId) {
      fetchCandidate();
    }
  }, [candidateId]);

  const handleSave = async (formData) => {
    try {
      setIsSaving(true);
      setError('');
      setSaveMessage('');
      const payload = {
        id: candidateId,
        ...formData,
      };
      const data = await apiFetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (data.success) {
        setSaveMessage('Lưu kết quả thành công!');
        // Cập nhật lại trạng thái trên UI
        setCandidate(prev => ({...prev, ...formData}));
      } else {
        throw new Error(data.message || 'Lưu kết quả thất bại.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader className="animate-spin text-blue-500" size={48} /></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <AlertTriangle size={48} className="mb-4" />
        <p className="text-lg font-bold">Lỗi: {error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <ArrowLeft size={18} /> Quay lại
        </button>
      </div>
    );
  }

  if (!candidate) {
    return <div className="text-center mt-10">Không tìm thấy ứng viên.</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-full">
       <button onClick={() => navigate(-1)} className="mb-4 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 font-semibold">
          <ArrowLeft size={18} /> Quay lại danh sách
        </button>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cột thông tin ứng viên */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Chi Tiết Sơ Yếu Ứng Viên</h3>
          <InfoField label="Họ và tên" value={candidate['Họ và tên']} />
          <InfoField label="Ngày ứng tuyển" value={candidate['Timestamp']} />
          <InfoField label="Số điện thoại" value={candidate['SĐT']} />
          <InfoField label="Email" value={candidate['Email Address']} />
          <InfoField label="Vị trí ứng tuyển" value={candidate['Vị trí ứng tuyển']} />
          <InfoField label="Link CV" value={<a href={candidate['Link CV của bạn']} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Xem CV</a>} />
          {/* Thêm các trường thông tin khác từ candidate object */}
        </div>

        {/* Cột form phỏng vấn */}
        <div>
          <InterviewForm candidate={candidate} onSubmit={handleSave} isSaving={isSaving} />
          {saveMessage && <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg flex items-center"><CheckCircle className="mr-2" /> {saveMessage}</div>}
        </div>
      </div>
    </div>
  );
}
