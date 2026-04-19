import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom'; // Giả sử bạn dùng React Router

import { fetchCandidateDetails, saveInterview } from '../../utils/supabase-api';
import { storage } from '../../utils/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Loader, AlertTriangle, CheckCircle, ArrowLeft, Upload, X } from 'lucide-react';
// Nếu bạn không dùng SplitPane ở phiên bản này, có thể bỏ import dưới
// import SplitPane from 'react-split-pane';
// import 'react-split-pane/dist/react-split-pane.css';

// Component con cho từng trường thông tin
const InfoField = ({ label, value }) => (
  <div className="mb-3">
    <p className="text-sm font-semibold text-slate-500">{label}</p>
    <p className="text-base text-slate-800">{value || 'N/A'}</p>
  </div>
);

// Component con cho form phỏng vấn
const InterviewForm = ({ candidate, onSubmit, isSaving }) => {
  const [formData, setFormData] = useState(() => {
    const userBranch = typeof window !== 'undefined' ? localStorage.getItem('user_branch') || '' : '';
    return {
      status: candidate?.status || 'PENDING',
      interview_note: candidate?.interview_note || '',
      photoUrl: candidate?.photoUrl || '',
      // Các field từ template HTML - mapping từ candidate object
      name: candidate?.['Họ và tên ứng viên'] || candidate?.['Họ và tên'] || '',
      position: candidate?.['Vị trí ứng tuyển'] || '',
      phone: candidate?.['Số điện thoại'] || candidate?.['SĐT'] || '',
      address: candidate?.['Địa chỉ'] || '',
      school: candidate?.['Trường'] || '',
      major: candidate?.['Chuyên ngành'] || '',
      housing: candidate?.['Loại nhà ở'] || '',
      reason: candidate?.['Lý do nghỉ việc'] || '',
      degree: '',
      engCert: '',
      tesol: '',
      pedagogy: '',
      engLevel: '',
      engNote: '',
      appearance: '',
      experience: '',
      note: '',
      salaryWant: '',
      salaryOk: '',
      salaryProb: '',
      timeProb: '',
      interviewer: '',
      branch: userBranch,
    };
  });
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    // Kiểm tra loại file
    if (!selectedFile.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh (JPEG, PNG, etc.)');
      return;
    }
    
    // Kiểm tra kích thước (tối đa 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert('Kích thước file quá lớn. Vui lòng chọn ảnh dưới 5MB.');
      return;
    }
    
    setFile(selectedFile);
    // Xem trước ảnh
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({ ...prev, photoUrl: e.target.result }));
    };
    reader.readAsDataURL(selectedFile);
  };

  const removePhoto = () => {
    setFile(null);
    setFormData(prev => ({ ...prev, photoUrl: '' }));
  };

  const uploadImage = async () => {
    if (!file) return null;
    
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const storageRef = ref(storage, `interview_photos/${candidate?.rowIndex || 'unknown'}_${Date.now()}_${file.name}`);
      
      // Simulate progress (Firebase Storage không có progress callback mặc định)
      const uploadTask = uploadBytes(storageRef, file);
      // Giả lập progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      await uploadTask;
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Upload ảnh thất bại:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalPhotoUrl = formData.photoUrl;
    
    if (file) {
      try {
        finalPhotoUrl = await uploadImage();
      } catch (_error) {
        alert('Không thể upload ảnh. Vui lòng thử lại hoặc tiếp tục không có ảnh.');
        return;
      }
    }
    
    onSubmit({ ...formData, photoUrl: finalPhotoUrl });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-10 rounded-3xl border border-[#37352f]/10 shadow-xl h-full flex flex-col">
      <h3 className="text-2xl font-bold text-[#37352f] mb-8 pb-4 border-b border-[#37352f]/10 text-center uppercase tracking-tight">Phiếu Đánh giá Phỏng vấn</h3>
      <div className="flex-grow overflow-auto">
        <table className="w-full border-collapse border border-[#37352f]/20 text-sm table-fixed">
          <tbody>
            {/* Hàng 1: Họ tên, Vị trí, Ảnh */}
            <tr style={{ height: '60px' }}>
              <td className="border border-[#37352f]/20 p-3 bg-[#f7f6f3] font-bold w-1/4 text-[#37352f]">Họ và Tên Ứng viên</td>
              <td className="border border-gray-800 p-2 w-1/2" colSpan="2">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  readOnly
                  className="w-full border-none bg-transparent font-bold text-blue-600 outline-none"
                />
              </td>
              <td rowSpan="3" className="border border-gray-800 p-3 text-center align-top w-1/4 bg-slate-50">
                <div className="flex flex-col items-center">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ảnh chân dung ứng viên</label>
                  <div className="w-full border-2 border-dashed border-slate-300 bg-white rounded-lg p-2 text-center hover:border-blue-400 transition-colors">
                    {formData.photoUrl ? (
                      <div className="relative">
                        <img src={formData.photoUrl} alt="Trực quan" className="max-h-40 mx-auto rounded-lg object-contain" />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="py-2">
                        <Upload className="mx-auto mb-1 text-[#37352f]/40" size={20} />
                        <p className="text-sm text-[#37352f]/40 mb-2 leading-tight">Kéo thả ảnh vào đây<br/>hoặc click để chọn</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          id="photoUpload"
                        />
                        <label
                          htmlFor="photoUpload"
                          className="inline-block px-4 py-2 bg-[#37352f] text-white text-sm font-bold rounded-lg hover:bg-[#37352f]/90 cursor-pointer transition-all"
                        >
                          Chọn ảnh
                        </label>
                      </div>
                    )}
                  </div>
                  {isUploading && (
                    <div className="mt-2 w-full">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Đang tải... {uploadProgress}%</p>
                    </div>
                  )}
                </div>
              </td>
            </tr>
            {/* Hàng 2: Vị trí */}
            <tr style={{ height: '60px' }}>
              <td className="border border-[#37352f]/20 p-3 bg-[#f7f6f3] font-bold text-[#37352f]">Vị trí ứng tuyển:</td>
              <td className="border border-gray-800 p-2" colSpan="2">
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  readOnly
                  className="w-full border-none bg-transparent outline-none"
                />
              </td>
            </tr>
            {/* Hàng 3: SĐT */}
            <tr style={{ height: '60px' }}>
              <td className="border border-[#37352f]/20 p-3 bg-[#f7f6f3] font-bold text-[#37352f]">Số điện thoại liên hệ:</td>
              <td className="border border-gray-800 p-2" colSpan="2">
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  readOnly
                  className="w-full border-none bg-transparent outline-none"
                />
              </td>
            </tr>
            
            {/* Hàng 4: Nơi ở hiện tại */}
            <tr>
              <td className="border border-gray-800 p-2 bg-yellow-100 font-bold">Địa chỉ hiện tại:</td>
              <td className="border border-gray-800 p-2" colSpan="3">
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full border-none bg-transparent outline-none"
                />
              </td>
            </tr>
            {/* Hàng 5: Loại nhà ở */}
            <tr>
              <td className="border border-gray-800 p-2 bg-yellow-100 font-bold">Hình thức cư trú:</td>
              <td className="border border-gray-800 p-2" colSpan="3">
                <input
                  type="text"
                  name="housing"
                  value={formData.housing}
                  readOnly
                  className="w-full border-none bg-transparent italic text-gray-500 outline-none"
                />
              </td>
            </tr>
            {/* Hàng 6: Lý do nghỉ việc */}
            <tr>
              <td className="border border-gray-800 p-2 bg-yellow-100 font-bold">Lý do thôi việc trước đây:</td>
              <td className="border border-gray-800 p-2" colSpan="3">
                <input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  readOnly
                  className="w-full border-none bg-transparent italic text-gray-500 outline-none"
                />
              </td>
            </tr>
            {/* Hàng 7: Tốt nghiệp trường, Chuyên ngành */}
            <tr>
              <td className="border border-gray-800 p-2 bg-yellow-100 font-bold">Tốt nghiệp trường/Cơ sở đào tạo:</td>
              <td className="border border-gray-800 p-2">
                <input
                  type="text"
                  name="school"
                  value={formData.school}
                  onChange={handleChange}
                  className="w-full border-none bg-transparent outline-none"
                />
              </td>
              <td className="border border-gray-800 p-2 bg-yellow-100 font-bold" colSpan="2">
                Chuyên ngành đào tạo:
                <input
                  type="text"
                  name="major"
                  value={formData.major}
                  onChange={handleChange}
                  className="ml-2 inline border-b border-gray-400 w-1/2 bg-transparent outline-none"
                />
              </td>
            </tr>
            {/* Hàng 8: Bằng cấp liên quan - Bằng TN, IELTS/TOEIC */}
            <tr>
              <td className="border border-gray-800 p-2 bg-yellow-100 font-bold align-top" rowSpan="2">Văn bằng & Chứng chỉ:</td>
              <td className="border border-gray-800 p-2">
                Bằng tốt nghiệp:
                <input
                  type="text"
                  name="degree"
                  value={formData.degree}
                  onChange={handleChange}
                  className="ml-2 inline border-b border-gray-400 w-2/3 bg-transparent outline-none"
                />
              </td>
              <td className="border border-gray-800 p-2 bg-yellow-100 font-bold" colSpan="2">
                Chứng chỉ Tiếng Anh:
                <input
                  type="text"
                  name="engCert"
                  value={formData.engCert}
                  onChange={handleChange}
                  className="ml-2 inline border-b border-gray-800 bg-transparent outline-none"
                />
              </td>
            </tr>
            {/* Hàng 9: TESOL, NV Sư phạm */}
            <tr>
              <td className="border border-gray-800 p-2">
                TESOL:
                <input
                  type="text"
                  name="tesol"
                  value={formData.tesol}
                  onChange={handleChange}
                  className="ml-2 inline border-b border-gray-400 w-2/3 bg-transparent outline-none"
                />
              </td>
              <td className="border border-gray-800 p-2 bg-yellow-100 font-bold" colSpan="2">
                Chứng chỉ Sư phạm:
                <input
                  type="text"
                  name="pedagogy"
                  value={formData.pedagogy}
                  onChange={handleChange}
                  className="ml-2 inline border-b border-gray-800 bg-transparent outline-none"
                />
              </td>
            </tr>
            {/* Hàng 10: Nhận xét chi tiết - Trình độ Tiếng Anh */}
            <tr>
              <td className="border border-gray-800 p-2 bg-yellow-100 font-bold align-top" rowSpan="4">Đánh giá chi tiết kỹ năng:</td>
              <td className="border border-gray-800 p-2" colSpan="3">
                Khả năng ngôn ngữ (Tiếng Anh):
                <input
                  type="text"
                  name="engLevel"
                  value={formData.engLevel}
                  onChange={handleChange}
                  className="ml-2 inline border-b border-gray-400 w-12 text-center bg-transparent outline-none font-bold text-blue-600"
                />
                <span className="font-bold"> /10.</span> Ghi chú:
                <input
                  type="text"
                  name="engNote"
                  value={formData.engNote}
                  onChange={handleChange}
                  className="ml-2 inline border-b border-gray-400 w-1/2 bg-transparent outline-none"
                />
              </td>
            </tr>
            {/* Hàng 11: Ngoại hình */}
            <tr>
              <td className="border border-gray-800 p-2" colSpan="3">
                Tác phong & Diện mạo:
                <input
                  type="text"
                  name="appearance"
                  value={formData.appearance}
                  onChange={handleChange}
                  className="ml-2 inline border-b border-gray-400 w-5/6 bg-transparent outline-none"
                />
              </td>
            </tr>
            {/* Hàng 12: Kinh nghiệm */}
            <tr>
              <td className="border border-gray-800 p-2" colSpan="3">
                <span className="align-top inline-block w-24">Kinh nghiệm/Kỹ năng:</span>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows="2"
                  className="w-full sm:w-[calc(100%-6rem)] border-b border-gray-400 bg-transparent resize-none outline-none leading-relaxed align-top"
                />
              </td>
            </tr>
            {/* Hàng 13: Ghi chú thêm */}
            <tr>
              <td className="border border-gray-800 p-2" colSpan="3">
                <span className="align-top inline-block w-24">Nhận xét bổ sung:</span>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  rows="2"
                  className="w-full sm:w-[calc(100%-6rem)] border-b border-gray-400 bg-transparent resize-none outline-none leading-relaxed align-top"
                />
              </td>
            </tr>
            {/* Hàng 14: Mức lương mong muốn, Lương thỏa thuận */}
            <tr>
              <td className="border border-gray-800 p-2 bg-green-100 font-bold">Thu nhập kỳ vọng:</td>
              <td className="border border-gray-800 p-2">
                <input
                  type="text"
                  name="salaryWant"
                  value={formData.salaryWant}
                  onChange={handleChange}
                  className="w-full border-none bg-transparent outline-none"
                />
              </td>
              <td className="border border-gray-800 p-2 bg-green-100 font-bold" colSpan="2">
                Thu nhập thỏa thuận:
                <input
                  type="text"
                  name="salaryOk"
                  value={formData.salaryOk}
                  onChange={handleChange}
                  className="ml-2 inline border-b border-gray-800 bg-transparent outline-none w-1/2 font-semibold text-green-700"
                />
              </td>
            </tr>
            {/* Hàng 15: Mức lương thử việc, Thời gian thử việc */}
            <tr>
              <td className="border border-gray-800 p-2 bg-blue-100 font-bold">Lương thời gian thử việc:</td>
              <td className="border border-gray-800 p-2">
                <input
                  type="text"
                  name="salaryProb"
                  value={formData.salaryProb}
                  onChange={handleChange}
                  className="w-full border-none bg-transparent outline-none"
                />
              </td>
              <td className="border border-gray-800 p-2 bg-blue-100 font-bold" colSpan="2">
                Thời lượng thử việc dự kiến:
                <input
                  type="text"
                  name="timeProb"
                  value={formData.timeProb}
                  onChange={handleChange}
                  className="ml-2 inline border-b border-gray-800 bg-transparent outline-none w-1/2"
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Người phỏng vấn và nút submit */}
        <div className="mt-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <label className="block text-sm font-bold text-slate-700 mb-2">Cán bộ Phỏng vấn / Đánh giá:</label>
          <input
            type="text"
            name="interviewer"
            value={formData.interviewer}
            onChange={handleChange}
            placeholder="Nhập tên cán bộ thực hiện phỏng vấn..."
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <label htmlFor="status" className="block text-sm font-bold text-slate-700 mb-2">Kết luận phỏng vấn:</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full sm:w-48 p-3 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="PENDING">Chờ phỏng vấn</option>
                <option value="PASSED" className="text-green-600">Đạt (Passed)</option>
                <option value="FAILED" className="text-red-600">Không đạt (Failed)</option>
                <option value="OFFERED" className="text-blue-600">Đã mời nhận việc (Offered)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="w-full sm:w-auto bg-[#37352f] hover:bg-[#37352f]/90 text-white font-bold py-4 px-10 rounded-xl flex items-center justify-center transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm"
            >
              {isSaving ? <Loader className="animate-spin mr-2" size={20} /> : <CheckCircle size={20} className="mr-2" />}
              {isSaving ? 'Đang lưu...' : 'Lưu kết quả phỏng vấn'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default function InterviewView({ candidateId, onBack }) {
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
        const candidateData = await fetchCandidateDetails({ row_index: candidateId });
        if (candidateData) {
          setCandidate({ ...candidateData, rowIndex: candidateId });
        } else {
          throw new Error('Không thể tải dữ liệu ứng viên.');
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

  const handleSaveInterview = async (formData) => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await saveInterview({
        ...formData,
        candidateId: candidate?.rowIndex ?? candidateId,
      });
      
      setSaveMessage('Lưu kết quả phỏng vấn thành công!');
      setCandidate(prev => ({ ...prev, ...formData }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-blue-500 w-12 h-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <p className="text-lg font-bold">Lỗi: {error}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <p className="text-lg font-bold">Không tìm thấy thông tin ứng viên.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <button onClick={onBack} className="mb-4 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium transition-colors self-start">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>
      {saveMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Thành công!</strong>
          <span className="block sm:inline"> {saveMessage}</span>
        </div>
      )}

      <div className="flex-grow">
        <InterviewForm candidate={candidate} onSubmit={handleSaveInterview} isSaving={isSaving} />
      </div>
    </div>
  );
}