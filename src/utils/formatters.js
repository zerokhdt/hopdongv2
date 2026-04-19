/**
 * Định dạng Họ và Tên: Viết hoa chữ cái đầu mỗi từ
 * Ví dụ: tô trần minh vân -> Tô Trần Minh Vân
 */
export const formatName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Định dạng Chi nhánh: Viết hoa chữ cái đầu mỗi từ
 * Ví dụ: trung mỹ tây -> Trung Mỹ Tây
 */
export const formatBranch = (branch) => {
  if (!branch) return '';
  // Xử lý các trường hợp đặc biệt như HQ, TA, vv. nếu cần
  if (branch.toUpperCase() === 'HQ') return 'HQ';
  if (branch.toUpperCase() === 'HEAD OFFICE') return 'Hội Sở';
  
  return branch
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => {
        if (['ta', 'cv', 'hrm'].includes(word.toLowerCase())) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

/**
 * Định dạng Vị trí/Chức vụ: Chỉ viết hoa chữ cái đầu tiên, các chữ sau viết thường
 * Ngoại trừ các từ viết tắt chuyên ngành (TA, CV, full time, part time)
 * Ví dụ: QUẢN LÝ CHI NHÁNH -> Quản lý chi nhánh
 */
export const formatPosition = (position) => {
  if (!position) return '';
  
  // Danh sách các từ đặc biệt giữ nguyên hoặc viết hoa
  const specialWords = ['ta', 'cv', 'hrm', 'qlcn', 'gv', 'nv', 'ql', 'tp', 'hp', 'it', 'gvtg', 'tbp', 'nvch', 'bgm', 'tbpvp', 'full time', 'part time', 'fulltime', 'parttime'];
  
  let formatted = position.toLowerCase();
  
  // Viết hoa chữ cái đầu tiên của cả chuỗi
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  
  // Xử lý các từ đặc biệt trong chuỗi (ưu tiên trùng khớp nguyên từ)
  specialWords.forEach(word => {
    // Escape special characters in word if any (like spaces)
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    
    if (word.toLowerCase() === 'full time' || word.toLowerCase() === 'fulltime') {
      formatted = formatted.replace(regex, 'full time');
    } else if (word.toLowerCase() === 'part time' || word.toLowerCase() === 'parttime') {
      formatted = formatted.replace(regex, 'part time');
    } else {
      formatted = formatted.replace(regex, word.toUpperCase());
    }
  });

  // Xử lý trường hợp có dấu chấm (ví dụ: Q.qlcn -> Q.QLCN)
  formatted = formatted.replace(/q\.\s*qlcn/gi, 'Q.QLCN');
  formatted = formatted.replace(/q\.\s*ql/gi, 'Q.QL');
  formatted = formatted.replace(/q\.\s*tbpvp/gi, 'Q.TBPVP');
  formatted = formatted.replace(/q\.\s*tbp/gi, 'Q.TBP');

  return formatted;
};
