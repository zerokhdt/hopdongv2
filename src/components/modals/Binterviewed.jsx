import React, { useEffect, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { X, FileCheck, Upload, Download, Eye, ExternalLink, FileText } from 'lucide-react';
import { parseDateFlexible } from '../../utils/csv.js';

const Label = ({ children }) => (
  <div className="text-sm font-semibold text-[#333] tracking-wide">{children}</div>
);

const Input = ({ value, onChange, placeholder = '', type = 'text', disabled = false }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className="w-full px-4 py-3.5 rounded-[14px] border-2 border-[#f0f0f0] bg-[#f8f9fa] text-sm text-[#333] outline-none transition-all focus:bg-white focus:border-[#dc3545] focus:ring-2 focus:ring-[#dc3545]/15 disabled:opacity-80"
  />
);

const TextArea = ({ value, onChange, placeholder = '', disabled = false, minH = 120 }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className="w-full px-4 py-3.5 rounded-[14px] border-2 border-[#f0f0f0] bg-[#f8f9fa] text-sm text-[#333] outline-none transition-all focus:bg-white focus:border-[#dc3545] focus:ring-2 focus:ring-[#dc3545]/15 resize-y disabled:opacity-80"
    style={{ minHeight: minH }}
  />
);

const getInterviewerEmail = () => {
  try {
    const saved = String(localStorage.getItem('saved_username') || '').trim();
    if (!saved) return '';
    return saved.includes('@') ? saved : `${saved}@acehrm2026.local`;
  } catch (_e) {
    return '';
  }
};

const pick = (obj, keys) => {
  for (const key of keys) {
    const v = obj?.[key];
    if (v === 0 || v === false) return v;
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && !v.trim()) continue;
    return v;
  }
  return '';
};

const normalizeLabel = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[:：]/g, '')
    .replace(/\s+/g, ' ');

const dataUrlToBase64 = (dataUrl) => {
  const s = String(dataUrl || '');
  const idx = s.indexOf('base64,');
  if (idx < 0) return '';
  return s.slice(idx + 'base64,'.length);
};

const extFromDataUrl = (dataUrl) => {
  const s = String(dataUrl || '').toLowerCase();
  if (s.startsWith('data:image/png')) return 'png';
  if (s.startsWith('data:image/jpg') || s.startsWith('data:image/jpeg')) return 'jpeg';
  return 'png';
};

const safeFileName = (s) =>
  String(s || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80);

const getDriveId = (url) => {
  const s = String(url || '');
  if (!s.includes('drive.google.com')) return '';
  if (s.includes('id=')) return s.split('id=')[1]?.split('&')?.[0] || '';
  if (s.includes('/file/d/')) return s.split('/file/d/')[1]?.split('/')?.[0] || '';
  return '';
};

const toDownloadUrl = (url) => {
  const s = String(url || '').trim();
  if (!s) return '';
  const id = getDriveId(s);
  if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  return s;
};

const getTemplateFromInput = (file) =>
  new Promise((resolve, reject) => {
    if (!file) reject(new Error('Chưa chọn file template'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không đọc được file template'));
    reader.readAsArrayBuffer(file);
  });

const getUserBranch = () => {
  try {
    return String(localStorage.getItem('user_branch') || '').trim();
  } catch (_e) {
    return '';
  }
};

const getUserDisplayName = () => {
  try {
    return String(localStorage.getItem('saved_username') || '').trim();
  } catch (_e) {
    return '';
  }
};

const buildDefaultForm = (c) => {
  const name = String(pick(c, ['name', 'Họ và tên ứng viên', 'Họ và tên', 'Họ tên']) || '').trim();
  const position = String(pick(c, ['position', 'Vị trí ứng tuyển', 'Vị trí']) || '').trim();
  const phone = String(pick(c, ['phone', 'Số điện thoại', 'SĐT', 'Số điện thoại liên hệ']) || '').trim();
  const email = String(pick(c, ['email', 'Email', 'Địa chỉ email', 'Email liên hệ']) || '').trim();
  const addressCurrent = String(
    pick(c, ['address', 'currentAddress', 'Địa chỉ hiện tại', 'Nơi ở hiện tại', 'Địa chỉ']) || ''
  ).trim();
  const dobRaw = String(pick(c, ['dob', 'Ngày tháng năm sinh', 'Ngày sinh']) || '').trim();
  const dob = parseDateFlexible(dobRaw);

  const major = String(pick(c, ['major', 'Chuyên ngành']) || '').trim();
  const graduateSchool = String(pick(c, ['university', 'school', 'Trường', 'Tốt nghiệp trường']) || '').trim();
  const degree = String(pick(c, ['degree', 'Bằng tốt nghiệp', 'Bằng tốt nghiệp:']) || '').trim();
  const ieltsToeic = String(
    pick(c, ['ieltsToeic', 'Chứng chỉ IELTS/TOEIC', 'Chứng chỉ IELTS, TOEIC', 'Chứng chỉ IELTS, TOEIC:']) || ''
  ).trim();
  const tesol = String(pick(c, ['tesol', 'TESOL', 'Chứng chỉ TESOL']) || '').trim();
  const pedagogy = String(pick(c, ['pedagogy', 'Nghiệp vụ sư phạm', 'Nghiệp vụ sư phạm:']) || '').trim();

  const salaryWant = String(pick(c, ['expectedSalary', 'salaryWant', 'Mức lương bạn mong muốn', 'mức lương bạn mong muốn']) || '').trim();
  const branchWant = String(pick(c, ['branch', 'Chi nhánh ứng tuyển', 'Chi nhánh mong muốn', 'desiredBranch']) || '').trim();
  const assignedBranch = String(pick(c, ['branch_assigned', 'branchAssigned', 'Đã bố trí CN làm việc', 'Đã bổ trí chi nhánh làm việc']) || '').trim();

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());

  const userBranch = getUserBranch();
  const userName = getUserDisplayName();

  return {
    name,
    position,
    phone,
    email,
    addressCurrent,
    dob,
    assignedBranch,
    studyDate: '',
    graduateSchool,
    major,
    degree,
    ieltsToeic,
    tesol,
    pedagogy,
    englishLevel10: '',
    appearance: '',
    experienceRelated: '',
    extraNote: '',
    salaryWant,
    branchWant,
    salaryAgreement: '',
    salaryProbation: '',
    branchAgreement: '',
    probationTime: '',
    officialWorkingTime: '',
    studyTime: '',
    studySalary: '',
    studyBranch: '',
    studyMentor: '',
    interviewerRole: '',
    interviewerBranch: userBranch,
    dateDay: day,
    dateMonth: month,
    dateYear: year,
    interviewerName: userName,
  };
};

export default function Binterviewed({ isOpen, onClose, candidate, onSubmit, disabledSubmit = false, onShowDetail: _onShowDetail }) {
  const c = useMemo(() => (candidate?.rawData ? { ...candidate.rawData, ...candidate } : candidate), [candidate]);
  const displayName = useMemo(() => pick(c, ['name', 'Họ và tên ứng viên', 'Họ và tên', 'Họ tên']) || 'không có', [c]);
  const displayPosition = useMemo(() => pick(c, ['position', 'Vị trí ứng tuyển', 'Vị trí']) || 'không có', [c]);

  const [decision, setDecision] = useState('PASS');
  const [note, setNote] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const templateInputRef = useRef(null);
  const cvAbortRef = useRef(null);

  const [leftOpen, setLeftOpen] = useState(false);
  const [leftTab, setLeftTab] = useState('DETAIL');
  const [cvObjectUrl, setCvObjectUrl] = useState('');
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCvError('');
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (cvAbortRef.current) cvAbortRef.current.abort();
      if (cvObjectUrl) URL.revokeObjectURL(cvObjectUrl);
    };
  }, [cvObjectUrl]);

  const [form, setForm] = useState(() => buildDefaultForm(c));
  const candidateKey = String(candidate?.id ?? candidate?.row_index ?? candidate?.rowIndex ?? candidate?.email ?? displayName);

  useEffect(() => {
    if (!isOpen || !candidate) return;
    setDecision('PASS');
    setNote('');
    setPhotoPreview('');
    setLeftOpen(false);
    setLeftTab('DETAIL');
    setCvError('');
    setForm(buildDefaultForm(c));
  }, [candidateKey, isOpen, candidate, c]);

  if (!isOpen || !candidate) return null;

  const isCompleted = candidate.status === 'COMPLETED';
  const isRejected = candidate.status === 'REJECTED';
  const isLocked = disabledSubmit || isCompleted || isRejected;

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handlePhoto = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(String(e.target?.result || ''));
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const interview_date = new Date().toISOString();
    const interviewer_email = getInterviewerEmail() || String(candidate?.interviewer_email || '').trim() || 'unknown@acehrm2026.local';
    const notes = JSON.stringify({
      mode: 'B_interviewed',
      decision,
      note,
      photoPreview: photoPreview || '',
      form,
    });
    onSubmit?.({ decision, note: notes, interviewer_email, interview_date });
  };

  const handleOpenCv = () => {
    const link = String(candidate?.cvLink || candidate?.cvUrl || '').trim();
    if (!link) return;
    try {
      window.open(link, '_blank', 'noopener,noreferrer');
    } catch (_e) {}
  };

  const handleExportExcel = async (bufferOverride) => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      let templateBuffer = bufferOverride;
      if (!templateBuffer) {
        const templateResp = await fetch('/templates/FORM_FOR_INTERVIEWER.xlsx', { cache: 'no-store' });
        if (!templateResp.ok) {
          templateInputRef.current?.click?.();
          throw new Error('Không tìm thấy template /templates/FORM_FOR_INTERVIEWER.xlsx');
        }
        templateBuffer = await templateResp.arrayBuffer();
      }

      const excelJSImport = await import('exceljs');
      const ExcelJS = excelJSImport?.default || excelJSImport;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(templateBuffer);

      const map = new Map([
        ['ho va ten', form.name],
        ['vi tri ung tuyen', form.position],
        ['so dien thoai', form.phone],
        ['email', form.email],
        ['noi o hien tai', form.addressCurrent],
        ['ngay thang nam sinh', form.dob],
        ['da bo tri chi nhanh lam viec', form.assignedBranch],
        ['da bo tri cn lam viec', form.assignedBranch],
        ['ngay hoc viec', form.studyDate],
        ['tot nghiep truong', form.graduateSchool],
        ['chuyen nganh', form.major],
        ['bang tot nghiep', form.degree],
        ['chung chi ielts toeic', form.ieltsToeic],
        ['tesol', form.tesol],
        ['nghiep vu su pham', form.pedagogy],
        ['trinh do tieng anh diem 10', form.englishLevel10],
        ['trinh do tieng anh diem 10', form.englishLevel10],
        ['trinh do tieng anh', form.englishLevel10],
        ['ngoai hinh', form.appearance],
        ['nhan xet chi tiet', note],
        ['kinh nghiem lien quan kem theo noi lam viec truoc day', form.experienceRelated],
        ['ghi chu them neu co', form.extraNote],
        ['muc luong mong muon', form.salaryWant],
        ['chi nhanh mong muon', form.branchWant],
        ['muc luong thoa thuan', form.salaryAgreement],
        ['muc luong thoa thuan chinh thuc', form.salaryAgreement],
        ['muc luong thu viec', form.salaryProbation],
        ['chi nhanh thoa thuan', form.branchAgreement],
        ['thoi gian thu viec', form.probationTime],
        ['thoi gian lam viec chinh thuc', form.officialWorkingTime],
        ['thoi gian hoc viec', form.studyTime],
        ['muc luong hoc viec', form.studySalary],
        ['chi nhanh hoc viec', form.studyBranch],
        ['nguoi huong dan hoc viec', form.studyMentor],
        ['vi tri lam viec', form.interviewerRole],
        ['cn lam viec', form.interviewerBranch],
      ]);

      const setCellValue = (worksheet, row, col, value) => {
        let cell = worksheet.getCell(row, col);
        if (cell?.isMerged && cell?.master) cell = cell.master;
        cell.value = String(value ?? '');
        cell.alignment = { ...(cell.alignment || {}), wrapText: true };
      };

      for (const worksheet of workbook.worksheets) {
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          row.eachCell({ includeEmpty: false }, (cell) => {
            const text = typeof cell.value === 'string' ? cell.value : cell.text;
            const key = normalizeLabel(text);
            if (!map.has(key)) return;

            const value = map.get(key);
            if (value === undefined || value === null || String(value).trim() === '') return;

            let targetCol = cell.col + 1;
            for (let i = 0; i < 6; i++) {
              const t = worksheet.getCell(cell.row, targetCol);
              const tText = typeof t.value === 'string' ? t.value : t.text;
              const tKey = normalizeLabel(tText);
              if (tKey && map.has(tKey)) {
                targetCol += 1;
                continue;
              }
              break;
            }

            setCellValue(worksheet, cell.row, targetCol, value);
          });
        });

        if (photoPreview) {
          let photoCell = null;
          worksheet.eachRow({ includeEmpty: false }, (row) => {
            row.eachCell({ includeEmpty: false }, (cell) => {
              const text = typeof cell.value === 'string' ? cell.value : cell.text;
              if (normalizeLabel(text) === 'anh chup ung vien') photoCell = cell;
            });
          });

          if (photoCell) {
            const base64 = dataUrlToBase64(photoPreview);
            if (base64) {
              const imageId = workbook.addImage({ base64, extension: extFromDataUrl(photoPreview) });
              worksheet.addImage(imageId, {
                tl: { col: Math.max(0, photoCell.col - 1), row: Math.max(0, photoCell.row - 1) },
                ext: { width: 260, height: 340 },
              });
            }
          }
        }
      }

      const out = await workbook.xlsx.writeBuffer();
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const date = new Date().toISOString().slice(0, 10);
      saveAs(blob, `FORM_FOR_INTERVIEWER_${safeFileName(displayName)}_${date}.xlsx`);
    } catch (e) {
      alert(e?.message || 'Xuất Excel thất bại');
    } finally {
      setIsExporting(false);
    }
  };

  const handleTemplatePicked = async (file) => {
    try {
      const buffer = await getTemplateFromInput(file);
      await handleExportExcel(buffer);
    } catch (e) {
      alert(e?.message || 'Không đọc được template');
    } finally {
      if (templateInputRef.current) templateInputRef.current.value = '';
    }
  };

  const openLeft = (tab) => {
    setLeftTab(tab);
    setLeftOpen(true);
  };

  const loadCv = async () => {
    const raw = String(candidate?.cvLink || candidate?.cvUrl || '').trim();
    if (!raw) {
      setCvError('Không có link CV');
      return;
    }

    if (cvAbortRef.current) cvAbortRef.current.abort();
    const controller = new AbortController();
    cvAbortRef.current = controller;

    setCvLoading(true);
    setCvError('');
    try {
      const url = toDownloadUrl(raw);
      const resp = await fetch(url, { signal: controller.signal, credentials: 'omit' });
      if (!resp.ok) throw new Error('Không tải được CV (có thể do quyền truy cập)');
      const blob = await resp.blob();
      if (cvObjectUrl) URL.revokeObjectURL(cvObjectUrl);
      const objUrl = URL.createObjectURL(blob);
      setCvObjectUrl(objUrl);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      setCvError(e?.message || 'Không tải được CV');
    } finally {
      setCvLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[1100px] max-h-[92vh] overflow-hidden rounded-[20px] bg-white shadow-2xl">
        <input
          ref={templateInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => handleTemplatePicked(e.target.files?.[0])}
        />

        <div className="relative bg-gradient-to-br from-[#dc3545] to-[#c82333] text-white px-6 py-8">
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 items-start">
            <div className="flex flex-col items-center text-center gap-3">
              <img
                src={new URL('../../../REF/ACE LOGO.svg', import.meta.url).href}
                alt="ACE"
                className="h-10 w-auto"
              />
              <div className="text-2xl font-extrabold leading-relaxed">Form dành cho người phỏng vấn</div>
              <div className="text-sm font-medium opacity-85">Interviewer Evaluation Form</div>
              <div className="mt-2 text-sm font-semibold opacity-95">
                {displayName} · {displayPosition}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="w-[140px] h-[170px] rounded-2xl border-[3px] border-dashed border-white/60 bg-white/10 overflow-hidden flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Ảnh ứng viên" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-sm font-medium opacity-85 italic text-center">
                    📷 Ảnh chụp<br />
                    ứng viên
                  </div>
                )}
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-semibold cursor-pointer">
                <Upload size={16} />
                Chọn ảnh
                <input
                  type="file"
                  accept="image/*"
                  disabled={isLocked}
                  onChange={(e) => handlePhoto(e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-8">
          <div className={`grid gap-6 ${leftOpen ? 'grid-cols-1 lg:grid-cols-[56px_380px_1fr]' : 'grid-cols-1 lg:grid-cols-[56px_1fr]'}`}>
            <div className="hidden lg:flex flex-col gap-3 items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  openLeft('CV');
                  loadCv();
                }}
                disabled={!String(candidate?.cvLink || candidate?.cvUrl || '').trim() || cvLoading}
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  leftOpen && leftTab === 'CV' ? 'bg-[#dc3545] text-white border-[#dc3545]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
                title="CV"
              >
                <FileText size={18} />
              </button>
              <button
                type="button"
                onClick={() => openLeft('DETAIL')}
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-colors ${
                  leftOpen && leftTab === 'DETAIL' ? 'bg-[#dc3545] text-white border-[#dc3545]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
                title="Chi tiết"
              >
                <Eye size={18} />
              </button>
            </div>
            {leftOpen && (
              <div className="bg-white rounded-[18px] border border-gray-200 shadow-sm overflow-hidden h-[calc(92vh-300px)]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="text-sm font-bold text-gray-900">{leftTab === 'CV' ? 'CV' : 'Thông tin chi tiết'}</div>
                  <button
                    type="button"
                    onClick={() => setLeftOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-white border border-gray-200"
                  >
                    Ẩn
                  </button>
                </div>

                <div className="h-[calc(92vh-360px)] overflow-y-auto p-4">
                  {leftTab === 'DETAIL' ? (
                    <div className="divide-y divide-gray-100">
                      <div className="py-3">
                        <div className="text-sm font-semibold text-gray-700">Họ và tên</div>
                        <div className="text-[15px] leading-relaxed text-gray-900">{displayName}</div>
                      </div>
                      <div className="py-3">
                        <div className="text-sm font-semibold text-gray-700">Vị trí ứng tuyển</div>
                        <div className="text-[15px] leading-relaxed text-gray-900">{displayPosition}</div>
                      </div>
                      <div className="py-3">
                        <div className="text-sm font-semibold text-gray-700">Số điện thoại</div>
                        <div className="text-[15px] leading-relaxed text-gray-900">{String(form.phone || 'không có')}</div>
                      </div>
                      <div className="py-3">
                        <div className="text-sm font-semibold text-gray-700">Email</div>
                        <div className="text-[15px] leading-relaxed text-gray-900">{String(form.email || 'không có')}</div>
                      </div>
                      <div className="py-3">
                        <div className="text-sm font-semibold text-gray-700">Địa chỉ</div>
                        <div className="text-[15px] leading-relaxed text-gray-900">{String(form.addressCurrent || 'không có')}</div>
                      </div>
                      <div className="py-3">
                        <div className="text-sm font-semibold text-gray-700">Ngày sinh</div>
                        <div className="text-[15px] leading-relaxed text-gray-900">{String(form.dob || 'không có')}</div>
                      </div>
                      <div className="py-3">
                        <div className="text-sm font-semibold text-gray-700">Chi nhánh mong muốn</div>
                        <div className="text-[15px] leading-relaxed text-gray-900">{String(form.branchWant || 'không có')}</div>
                      </div>
                      <div className="py-3">
                        <div className="text-sm font-semibold text-gray-700">Mức lương mong muốn</div>
                        <div className="text-[15px] leading-relaxed text-gray-900">{String(form.salaryWant || 'không có')}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {cvError ? (
                        <div className="text-sm font-semibold text-rose-600">{cvError}</div>
                      ) : cvLoading ? (
                        <div className="text-sm font-semibold text-gray-700">Đang tải CV...</div>
                      ) : cvObjectUrl ? (
                        <iframe title="CV" src={cvObjectUrl} className="w-full h-[calc(92vh-420px)] rounded-xl border border-gray-200 bg-white" />
                      ) : (
                        <div className="text-sm font-semibold text-gray-700">Chưa tải CV</div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={loadCv}
                          disabled={cvLoading || !String(candidate?.cvLink || candidate?.cvUrl || '').trim()}
                          className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Tải lại
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenCv}
                          disabled={!String(candidate?.cvLink || candidate?.cvUrl || '').trim()}
                          className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Mở link
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-y-auto max-h-[calc(92vh-300px)]">
              <div className="flex flex-col gap-10">
            <div>
              <div className="inline-flex items-center gap-2 text-base font-bold text-[#dc3545] pb-3 border-b-[3px] border-[#dc3545]">
                📋 Thông tin cá nhân
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Họ và tên *</Label>
                  <Input value={form.name} onChange={(v) => update('name', v)} placeholder="Nhập họ và tên ứng viên" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Ngày tháng năm sinh</Label>
                  <Input value={form.dob} onChange={(v) => update('dob', v)} type="date" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Vị trí ứng tuyển *</Label>
                  <Input value={form.position} onChange={(v) => update('position', v)} placeholder="Nhập vị trí ứng tuyển" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Chuyên ngành</Label>
                  <Input value={form.major} onChange={(v) => update('major', v)} placeholder="Ví dụ: Tiếng Anh, Marketing..." />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Số điện thoại *</Label>
                  <Input value={form.phone} onChange={(v) => update('phone', v)} placeholder="+84 123 456 789" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Email *</Label>
                  <Input value={form.email} onChange={(v) => update('email', v)} type="email" placeholder="email@example.com" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Nơi ở hiện tại</Label>
                  <Input value={form.addressCurrent} onChange={(v) => update('addressCurrent', v)} placeholder="Địa chỉ hiện tại" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Đã bổ trí chi nhánh làm việc</Label>
                  <Input value={form.assignedBranch} onChange={(v) => update('assignedBranch', v)} placeholder="Ví dụ: Chi nhánh Sài Gòn" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Ngày học việc</Label>
                  <Input value={form.studyDate} onChange={(v) => update('studyDate', v)} type="date" />
                </div>
              </div>
            </div>

            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#f0f0f0] to-transparent" />

            <div>
              <div className="inline-flex items-center gap-2 text-base font-bold text-[#dc3545] pb-3 border-b-[3px] border-[#dc3545]">
                🎓 Bằng cấp & chứng chỉ
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Tốt nghiệp trường</Label>
                  <Input value={form.graduateSchool} onChange={(v) => update('graduateSchool', v)} placeholder="Tên trường đại học" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Bằng tốt nghiệp</Label>
                  <Input value={form.degree} onChange={(v) => update('degree', v)} placeholder="Ví dụ: Cử nhân, Thạc sỹ..." />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Chứng chỉ IELTS/TOEIC</Label>
                  <Input value={form.ieltsToeic} onChange={(v) => update('ieltsToeic', v)} placeholder="Ví dụ: IELTS 6.5, TOEIC 750" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Chứng chỉ TESOL</Label>
                  <Input value={form.tesol} onChange={(v) => update('tesol', v)} placeholder="Có / Không / Đang học" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Nghiệp vụ sư phạm</Label>
                  <Input value={form.pedagogy} onChange={(v) => update('pedagogy', v)} placeholder="Có / Không / Đang học" />
                </div>
              </div>
            </div>

            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#f0f0f0] to-transparent" />

            <div>
              <div className="inline-flex items-center gap-2 text-base font-bold text-[#dc3545] pb-3 border-b-[3px] border-[#dc3545]">
                ⭐ Nhận xét chi tiết
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Trình độ tiếng Anh (điểm /10)</Label>
                  <Input value={form.englishLevel10} onChange={(v) => update('englishLevel10', v)} type="number" placeholder="0" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Ngoại hình</Label>
                  <Input value={form.appearance} onChange={(v) => update('appearance', v)} placeholder="Tốt / Trung bình / Cần cải thiện" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Kinh nghiệm liên quan</Label>
                  <TextArea
                    value={form.experienceRelated}
                    onChange={(v) => update('experienceRelated', v)}
                    placeholder="Mô tả kinh nghiệm làm việc trước đây, các công việc chính, kỹ năng đạt được..."
                    minH={120}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Ghi chú thêm</Label>
                  <TextArea value={form.extraNote} onChange={(v) => update('extraNote', v)} placeholder="Các điểm đặc biệt, nhận xét khác..." minH={120} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Nhận xét chuyên môn & thái độ</Label>
                  <TextArea value={note} onChange={setNote} placeholder="Nhập đánh giá chi tiết chuyên môn, điểm mạnh, điểm yếu và thái độ ứng viên..." minH={140} />
                </div>
              </div>
            </div>

            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#f0f0f0] to-transparent" />

            <div>
              <div className="inline-flex items-center gap-2 text-base font-bold text-[#dc3545] pb-3 border-b-[3px] border-[#dc3545]">
                💰 Mức lương & thời gian làm việc
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Mức lương thỏa thuận</Label>
                  <Input value={form.salaryAgreement} onChange={(v) => update('salaryAgreement', v)} placeholder="VND" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Mức lương thử việc</Label>
                  <Input value={form.salaryProbation} onChange={(v) => update('salaryProbation', v)} placeholder="VND" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Chi nhánh thỏa thuận</Label>
                  <Input value={form.branchAgreement} onChange={(v) => update('branchAgreement', v)} placeholder="Ví dụ: Trung Mỹ Tây" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Thời gian thử việc</Label>
                  <Input value={form.probationTime} onChange={(v) => update('probationTime', v)} placeholder="Ví dụ: 2 tháng" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Thời gian làm việc chính thức</Label>
                  <Input value={form.officialWorkingTime} onChange={(v) => update('officialWorkingTime', v)} placeholder="Ví dụ: 8:00 - 17:00 (Thứ 2 - Thứ 6)" />
                </div>
              </div>
            </div>

            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#f0f0f0] to-transparent" />

            <div>
              <div className="inline-flex items-center gap-2 text-base font-bold text-[#dc3545] pb-3 border-b-[3px] border-[#dc3545]">
                📚 Thời gian học việc
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Thời gian học việc</Label>
                  <Input value={form.studyTime} onChange={(v) => update('studyTime', v)} placeholder="Ví dụ: 3 tháng" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Mức lương học việc</Label>
                  <Input value={form.studySalary} onChange={(v) => update('studySalary', v)} placeholder="VND" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Chi nhánh học việc</Label>
                  <Input value={form.studyBranch} onChange={(v) => update('studyBranch', v)} placeholder="Ví dụ: Trung Mỹ Tây" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Người hướng dẫn học việc</Label>
                  <Input value={form.studyMentor} onChange={(v) => update('studyMentor', v)} placeholder="Tên người hướng dẫn" />
                </div>
              </div>
            </div>

            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#f0f0f0] to-transparent" />

            <div>
              <div className="inline-flex items-center gap-2 text-base font-bold text-[#dc3545] pb-3 border-b-[3px] border-[#dc3545]">
                👤 Thông tin người phỏng vấn
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Vị trí làm việc</Label>
                  <Input value={form.interviewerRole} onChange={(v) => update('interviewerRole', v)} placeholder="Ví dụ: QLCN" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Chi nhánh làm việc</Label>
                  <Input value={form.interviewerBranch} onChange={(v) => update('interviewerBranch', v)} placeholder="Ví dụ: Trung Mỹ Tây" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#fff5f5] to-[#ffe6e6] border-t-2 border-[#dc3545] rounded-2xl p-6">
              <div className="flex flex-col gap-3 items-end">
                <div className="text-sm text-[#666] leading-relaxed text-right">
                  Ngày{' '}
                  <span className="inline-block w-12">
                    <Input value={form.dateDay} onChange={(v) => update('dateDay', v)} placeholder="" />
                  </span>{' '}
                  Tháng{' '}
                  <span className="inline-block w-12">
                    <Input value={form.dateMonth} onChange={(v) => update('dateMonth', v)} placeholder="" />
                  </span>{' '}
                  Năm{' '}
                  <span className="inline-block w-20">
                    <Input value={form.dateYear} onChange={(v) => update('dateYear', v)} placeholder={String(new Date().getFullYear())} />
                  </span>
                  <div className="mt-3 italic text-sm">Người phỏng vấn (Kí và ghi rõ họ tên)</div>
                </div>
                <div className="text-sm font-semibold text-[#333]">___________________________</div>
                <div className="text-sm text-[#333]">
                  <Input value={form.interviewerName} onChange={(v) => update('interviewerName', v)} placeholder="Họ tên người phỏng vấn" />
                </div>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white px-6 py-5">
          <div className="flex flex-col md:flex-row gap-3">
            <button
              type="button"
              onClick={() => handleExportExcel()}
              disabled={isExporting}
              className="md:w-[260px] py-3.5 bg-white text-[#333] rounded-[14px] text-sm font-bold uppercase tracking-widest border-2 border-[#f0f0f0] hover:bg-[#f8f9fa] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download size={18} /> {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
            </button>

            <div className="flex-1 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setDecision('PASS')}
                className={`py-3.5 rounded-[14px] text-sm font-bold uppercase tracking-widest border-2 transition-all ${
                  decision === 'PASS'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                    : 'bg-white border-[#f0f0f0] text-[#333] hover:bg-[#f8f9fa]'
                }`}
              >
                Tuyển dụng
              </button>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setDecision('FAIL')}
                className={`py-3.5 rounded-[14px] text-sm font-bold uppercase tracking-widest border-2 transition-all ${
                  decision === 'FAIL'
                    ? 'bg-rose-600 border-rose-600 text-white shadow-md'
                    : 'bg-white border-[#f0f0f0] text-[#333] hover:bg-[#f8f9fa]'
                }`}
              >
                Không đạt
              </button>
            </div>

            <button
              type="button"
              disabled={isLocked}
              onClick={handleSubmit}
              className="md:w-[320px] py-3.5 bg-gradient-to-br from-[#00288e] to-[#1e40af] text-white rounded-[14px] text-sm font-bold uppercase tracking-widest shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FileCheck size={18} /> Gửi kết quả đánh giá
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
