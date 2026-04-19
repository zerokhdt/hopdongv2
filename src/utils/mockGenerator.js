
export const generateMockEmployees = (count = 300) => {
  const departments = [
    'ACE AN SƯƠNG', 'ACE PHAN VĂN HỚN', 'ACE HÀ HUY GIÁP', 'ACE LÊ VĂN KHƯƠNG',
    'ACE TRỤ SỞ CHÍNH', 'ACE LÊ LỢI', 'ACE TRUNG MỸ TÂY', 'ACE THỚI AN',
    'ACE XUÂN THỚI THƯỢNG', 'ACE ĐẶNG THÚC VỊNH'
  ];

  const POSITIONS = {
    MANAGER: 'Quản lý chi nhánh',
    DEPT_HEAD: 'Trưởng bộ phận',
    TA: 'Trợ giảng (TA)',
    TEACHER: 'Giáo viên thỉnh giảng',
    SECURITY: 'Bảo vệ',
    CLEANER: 'Tạp vụ'
  };

  const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
  const middleNames = ['Văn', 'Thị', 'Hoàng', 'Minh', 'Anh', 'Thanh', 'Đức', 'Quốc', 'Kim', 'Ngọc', 'Hồng', 'Tuyết'];
  const lastNames = ['Anh', 'Bình', 'Chi', 'Dũng', 'Em', 'Hùng', 'Hòa', 'Hồng', 'Hương', 'Khánh', 'Liên', 'Lâm', 'Mai', 'Nam', 'Nghĩa', 'Phúc', 'Quân', 'Sơn', 'Tâm', 'Thảo', 'Thắng', 'Trang', 'Tuyết', 'Vinh', 'Xuân', 'Yến'];

  const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const formatDate = (date) => date.toISOString().split('T')[0];

  const mockData = [];
  let empIdx = 1;

  // 1. Guaranteed distribution per branch
  departments.forEach(dept => {
    // 1 Manager
    mockData.push(createMockEmployee(dept, POSITIONS.MANAGER, empIdx++));
    // 2 Dept Heads
    mockData.push(createMockEmployee(dept, POSITIONS.DEPT_HEAD, empIdx++));
    mockData.push(createMockEmployee(dept, POSITIONS.DEPT_HEAD, empIdx++));
  });

  function createMockEmployee(dept, position, idNum) {
    const name = `${getRandom(firstNames)} ${getRandom(middleNames)} ${getRandom(lastNames)}`;
    const startYear = 2021 + Math.floor(Math.random() * 4);
    const startDate = new Date(startYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const renewDate = new Date();
    renewDate.setDate(renewDate.getDate() + Math.floor(Math.random() * 120) - 30);

    return {
      id: String(idNum).padStart(4, '0'),
      name: name.toLowerCase(),
      position: position.toLowerCase(),
      department: dept,
      startDate: formatDate(startDate),
      contractDate: formatDate(new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000)),
      renewDate: formatDate(renewDate),
      email: `${name.toLowerCase().replace(/\s/g, '.')}@ace.edu.vn`,
      phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      status: 'active',
      dob: formatDate(new Date(1985 + Math.floor(Math.random() * 20), 0, 1)),
      cccd: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      salary: (position === POSITIONS.MANAGER ? 25 : position === POSITIONS.DEPT_HEAD ? 15 : 8) * 1000000,
      avatar_url: `https://i.pravatar.cc/150?u=${idNum}`,
      checklist_status: true
    };
  }

  // 2. Fill remaining up to count
  const others = [POSITIONS.TA, POSITIONS.TEACHER, POSITIONS.SECURITY, POSITIONS.CLEANER];
  while (mockData.length < count) {
    mockData.push(createMockEmployee(getRandom(departments), getRandom(others), empIdx++));
  }

  return mockData;
};

export const generateMockContracts = (employees, count = 100) => {
  const mockContracts = [];
  const targetEmployees = [...employees].sort(() => 0.5 - Math.random()).slice(0, count);

  targetEmployees.forEach((emp, i) => {
    const stage = Math.floor(Math.random() * 3) + 1;
    mockContracts.push({
      id: `CONTRACT-${2000 + i}`,
      employeeId: emp.id,
      employeeName: emp.name,
      branch: emp.department,
      position: emp.position,
      soHd: `HĐLD-${emp.id}`,
      workflowStage: stage,
      workflowStatus: stage === 3 ? 'COMPLETED' : 'IN_PROGRESS',
      submissionDate: emp.startDate,
      signingDate: stage >= 2 ? emp.contractDate : null
    });
  });

  return mockContracts;
};

export const generateMockCandidates = (count = 180) => {
  const DEMO_CV_LINK = "https://drive.google.com/file/d/1RBZeb3dooYksqFODRX36B5yRm9UIdk0T/view";
  const branches = [
    'ACE AN SƯƠNG', 'ACE PHAN VĂN HỚN', 'ACE HÀ HUY GIÁP', 'ACE LÊ VĂN KHƯƠNG',
    'ACE TRỤ SỞ CHÍNH', 'ACE LÊ LỢI', 'ACE TRUNG MỸ TÂY', 'ACE THỚI AN',
    'ACE XUÂN THỚI THƯỢNG', 'ACE ĐẶNG THÚC VỊNH'
  ];
  const statuses = ['PENDING', 'SENT_TO_BRANCH', 'INTERVIEW_ASSIGNED', 'COMPLETED', 'REJECTED'];
  

  // Real names extracted from CSV (subset)
  const realCandidates = [
    { name: "LÊ ĐỨC VIỆT", pos: "giáo viên thỉnh giảng" },
    { name: "Đàm Việt Cường", pos: "giáo viên full-time" },
    { name: "Vũ Cao Cường", pos: "giáo viên thỉnh giảng" },
    { name: "Hà Xuân Cường", pos: "giáo viên thỉnh giảng" },
    { name: "NGUYỄN XUÂN TRÚC", pos: "giáo viên thỉnh giảng" },
    { name: "Nguyễn Huỳnh Bảo Yến", pos: "trợ giảng (ta)" },
    { name: "Muhammad Bilal", pos: "giáo viên nước ngoài" },
    { name: "Lê Đức Vũ", pos: "giáo viên thỉnh giảng" },
    { name: "Phạm Thị Khánh Huyền", pos: "trợ giảng (ta)" },
    { name: "Võ Ngọc Quỳnh Như", pos: "giáo viên thỉnh giảng" },
    { name: "Trần Tân Tiến", pos: "trợ giảng (ta)" },
    { name: "Trương Hữu Tình", pos: "nhân viên văn phòng" },
    { name: "Nguyễn Phúc Tiến", pos: "giáo viên thỉnh giảng" },
    { name: "DƯƠNG ĐẶNG KHÂM", pos: "trợ giảng (ta)" },
    { name: "Trần Thanh Thuý", pos: "trợ giảng (ta)" },
    { name: "Nguyễn Hoàng Bảo An", pos: "trợ giảng (ta)" },
    { name: "Nguyễn Hoàng Bảo Khang", pos: "trợ giảng (ta)" },
    { name: "Dương Bảo Yến", pos: "giáo viên full-time" },
    { name: "Nguyễn Ngọc Lan Anh", pos: "nhân viên văn phòng" },
    { name: "Nguyễn Hồng Khánh Linh", pos: "trợ giảng (ta)" },
    { name: "Trần Ngọc Kha", pos: "trợ giảng (ta)" },
    { name: "Phạm Thị Phương Linh", pos: "thực tập sinh" },
    { name: "Nguyễn Minh Quân", pos: "trợ giảng (ta)" },
    { name: "Huỳnh Ngọc An", pos: "trợ giảng (ta)" },
    { name: "Phạm Thị Thảo Hiền", pos: "nhân viên văn phòng" },
    { name: "Phan Lê Nhật My", pos: "nhân viên văn phòng" },
    { name: "Đỗ Thị Anh Thư", pos: "giáo viên thỉnh giảng" },
    { name: "Nguyễn Thị Kim Trang", pos: "nhân viên văn phòng" }
  ];

  const mockCandidates = [];
  for (let i = 1; i <= count; i++) {
    const seed = realCandidates[Math.floor(Math.random() * realCandidates.length)];
    const baseName = i <= realCandidates.length ? realCandidates[i-1].name : `${seed.name} ${i}`;
    const basePos = i <= realCandidates.length ? realCandidates[i-1].pos : seed.pos;
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const desiredBranch = branches[Math.floor(Math.random() * branches.length)];
    const assignedBranch = branches[Math.floor(Math.random() * branches.length)];
    const expectedSalary = ['Thương lượng', '8.000.000', '10.000.000', '12.000.000', '15.000.000'][Math.floor(Math.random() * 5)];
    const dob = `${1988 + Math.floor(Math.random() * 15)}-0${1 + Math.floor(Math.random() * 9)}-${10 + Math.floor(Math.random() * 18)}`;
    const address = `${Math.floor(Math.random() * 500) + 1} Đường số ${Math.floor(Math.random() * 50) + 1}, TP. HCM`;
    const gender = Math.random() > 0.6 ? 'Nữ' : 'Nam';
    const experience = `${Math.floor(Math.random() * 6)} năm`;
    const assignedAt = status === 'SENT_TO_BRANCH' ? new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000).toISOString() : null;
    const interviewAt = status === 'INTERVIEW_ASSIGNED' ? new Date(Date.now() + Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000).toISOString() : null;
    
    mockCandidates.push({
      id: `CAN-${5000 + i}`,
      full_name: baseName,
      name: baseName.toLowerCase(),
      position: basePos,
      phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `${baseName.toLowerCase().replace(/\s/g, '.')}@gmail.com`,
      desiredBranch,
      branch: status === 'SENT_TO_BRANCH' ? assignedBranch : desiredBranch,
      branch_assigned: status === 'SENT_TO_BRANCH' ? assignedBranch : null,
      assigned_at: assignedAt,
      locked: status === 'SENT_TO_BRANCH',
      locked_reason: status === 'SENT_TO_BRANCH' ? `Đã gửi chi nhánh ‘${assignedBranch}’` : null,
      interview_scheduled_date: interviewAt,
      interview_notes: status === 'INTERVIEW_ASSIGNED' ? 'Demo: HRM lên lịch phỏng vấn.' : null,
      interviewer: status === 'INTERVIEW_ASSIGNED' ? 'HRM Admin' : null,
      status: status,
      expectedSalary,
      dob,
      address,
      gender,
      createdAt: new Date().toISOString(),
      experience,
      cvLink: DEMO_CV_LINK,
      cvUrl: DEMO_CV_LINK,
      rawData: {
        'Họ và tên ứng viên': baseName,
        'Địa chỉ email': `${baseName.toLowerCase().replace(/\s/g, '.')}@gmail.com`,
        'Số điện thoại liên hệ': `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        'Vị trí ứng tuyển': basePos,
        'Chi nhánh mong muốn': desiredBranch,
        'Mức lương bạn mong muốn': expectedSalary,
        'Ngày tháng năm sinh': dob,
        'Địa chỉ hiện tại': address,
        'Giới tính': gender,
        'Kinh nghiệm': experience,
        cvLink: DEMO_CV_LINK,
        cvUrl: DEMO_CV_LINK
      }
    });
  }

  return mockCandidates;
};
