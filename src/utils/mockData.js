
export const generateDemoData = () => {
  const DEMO_CV_LINK = "https://drive.google.com/file/d/1RBZeb3dooYksqFODRX36B5yRm9UIdk0T/view";
  const branches = [
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

  const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ'];
  const middleNames = ['Văn', 'Thị', 'Hữu', 'Đức', 'Minh', 'Thanh', 'Quốc', 'Ngọc', 'Kim', 'Anh'];
  const lastNames = ['An', 'Bình', 'Chi', 'Dũng', 'Em', 'Giang', 'Hương', 'Hải', 'Khánh', 'Linh', 'Minh', 'Nam', 'Oanh', 'Phúc', 'Quang', 'Sơn', 'Tuấn', 'Vinh', 'Xuân', 'Yến'];

  const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const getRandomName = () => `${getRandomItem(firstNames)} ${getRandomItem(middleNames)} ${getRandomItem(lastNames)}`;
  const getRandomDate = (start, end) => {
    const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return d.toISOString().split('T')[0];
  };

  const SAMPLE_CV_URL = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

  // 1. Generate 300 Employees
  const employees = [];
  const createEmployee = (branch, position, hireDate, index) => {
    const id = (index + 1).toString().padStart(4, '0');
    const name = getRandomName();
    const gender = Math.random() > 0.6 ? 'Nữ' : 'Nam';
    
    return {
      id,
      name,
      department: branch,
      position,
      status: 'active',
      phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `${name.toLowerCase().replace(/\s/g, '.')}@ace.edu.vn`,
      personalEmail: `${name.toLowerCase().replace(/\s/g, '.')}@gmail.com`,
      dob: getRandomDate(new Date(1985, 0, 1), new Date(2003, 11, 31)),
      title: gender,
      nationality: 'Việt Nam',
      cccd: (100000000000 + Math.floor(Math.random() * 900000000000)).toString(),
      cccd_date: getRandomDate(new Date(2015, 0, 1), new Date(2023, 0, 1)),
      cccd_place: 'Cục CS QLHC về TTXH',
      address: `${Math.floor(Math.random() * 500) + 1} Đường số ${Math.floor(Math.random() * 50) + 1}, TP. HCM`,
      startDate: hireDate,
      probationDate: hireDate,
      contractDate: getRandomDate(new Date(2023, 0, 1), new Date()),
      renewDate: getRandomDate(new Date(2026, 0, 1), new Date(2027, 0, 1)),
      salary: (position === POSITIONS.MANAGER ? 25 : position === POSITIONS.DEPT_HEAD ? 15 : 8) * 1000000,
      hasInsurance: 'Có',
      insuranceAgency: 'BHXH TP. HCM',
      documentStatus: 'Đủ',
      pdf_url: SAMPLE_CV_URL,
      avatar_url: `https://i.pravatar.cc/150?u=${id}`,
      education: getRandomItem(['Đại học', 'Cao đẳng']),
      major: getRandomItem(['Sư phạm tiếng Anh', 'Ngôn ngữ Anh', 'Kế toán']),
      pedagogyCert: 'Có'
    };
  };

  let empIdx = 0;
  branches.forEach(branch => {
    // 1 Manager
    employees.push(createEmployee(branch, POSITIONS.MANAGER, '2023-01-01', empIdx++));
    // 2 Dept Heads
    employees.push(createEmployee(branch, POSITIONS.DEPT_HEAD, '2023-02-15', empIdx++));
    employees.push(createEmployee(branch, POSITIONS.DEPT_HEAD, '2023-03-10', empIdx++));
  });

  // Fill up to 300
  const otherRoles = [POSITIONS.TA, POSITIONS.TEACHER, POSITIONS.SECURITY, POSITIONS.CLEANER];
  while (employees.length < 300) {
    employees.push(createEmployee(
      getRandomItem(branches), 
      getRandomItem(otherRoles),
      '2024-01-15',
      empIdx++
    ));
  }

  // 2. Generate 180 Candidates (Using real seed names)
  const realCandidateSeeds = [
    "LÊ ĐỨC VIỆT", "Đàm Việt Cường", "Vũ Cao Cường", "Hà Xuân Cường", "NGUYỄN XUÂN TRÚC",
    "Nguyễn Huỳnh Bảo Yến", "Muhammad Bilal", "Lê Đức Vũ", "Phạm Thị Khánh Huyền", "Võ Ngọc Quỳnh Như",
    "Trần Tân Tiến", "Trương Hữu Tình", "Nguyễn Phúc Tiến", "DƯƠNG ĐẶNG KHÂM", "Trần Thanh Thuý",
    "Nguyễn Hoàng Bảo An", "Nguyễn Hoàng Bảo Khang", "Dương Bảo Yến", "Nguyễn Ngọc Lan Anh",
    "Nguyễn Hồng Khánh Linh", "Trần Ngọc Kha", "Phạm Thị Phương Linh", "Nguyễn Minh Quân", "Huỳnh Ngọc An"
  ];

  const candidates = [];
  const candidateStatusFlags = ['PENDING', 'SENT_TO_BRANCH', 'INTERVIEW_ASSIGNED', 'COMPLETED', 'REJECTED'];
  const expectedSalaries = ['Thương lượng', '8.000.000', '10.000.000', '12.000.000', '15.000.000', '18.000.000'];
  const livingStates = ['Ở cùng gia đình', 'Thuê trọ', 'Ở một mình', 'Ký túc xá'];
  const oldCompanies = ['Trung tâm Anh ngữ A', 'Trường Quốc tế B', 'Công ty C', 'Trung tâm D'];
  const reasons = ['Muốn môi trường tốt hơn', 'Phù hợp lịch học', 'Gần nhà', 'Phát triển chuyên môn'];
  const relocateAnswers = ['Có', 'Không', 'Tùy theo sắp xếp'];
  const workingTimeAnswers = ['Full-time', 'Part-time', 'Ca tối', 'Cuối tuần'];
  const self3Words = ['Chăm chỉ, đúng giờ, cầu tiến', 'Nhiệt tình, linh hoạt, trách nhiệm', 'Thẳng thắn, học nhanh, kỷ luật'];
  
  for (let i = 0; i < 180; i++) {
    const seed = realCandidateSeeds[Math.floor(Math.random() * realCandidateSeeds.length)];
    const name = i < realCandidateSeeds.length ? realCandidateSeeds[i] : `${seed} ${i}`;
    const desiredBranch = getRandomItem(branches);
    const assignedBranch = getRandomItem(branches);
    const status = getRandomItem(candidateStatusFlags);
    const nowIso = new Date().toISOString();
    const assignedAt = status === 'SENT_TO_BRANCH' ? new Date(Date.now() - Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000).toISOString() : null;
    const interviewAt = status === 'INTERVIEW_ASSIGNED' ? new Date(Date.now() + Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000).toISOString() : null;
    const expectedSalary = getRandomItem(expectedSalaries);
    const dob = getRandomDate(new Date(1990, 0, 1), new Date(2005, 11, 31));
    const address = `${Math.floor(Math.random() * 500) + 1} Đường số ${Math.floor(Math.random() * 50) + 1}, TP. HCM`;
    const gender = Math.random() > 0.6 ? 'Nữ' : 'Nam';
    const livingState = getRandomItem(livingStates);
    const major = getRandomItem(['Sư phạm tiếng Anh', 'Ngôn ngữ Anh', 'Kinh tế', 'Kế toán', 'CNTT']);
    const experience = `${Math.floor(Math.random() * 6)} năm`;
    const oldCompany = getRandomItem(oldCompanies);
    const reasonForQuitting = getRandomItem(reasons);
    const willingToRelocate = getRandomItem(relocateAnswers);
    const workingTime = getRandomItem(workingTimeAnswers);
    const describe3Words = getRandomItem(self3Words);
    const referrer = Math.random() > 0.75 ? 'Giới thiệu nội bộ' : '';
    const lockedReason = status === 'SENT_TO_BRANCH' ? `Đã gửi chi nhánh ‘${assignedBranch}’` : null;
    const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString();
    candidates.push({
      id: 1000 + i,
      full_name: name,
      name: name, // legacy field
      email: `${name.toLowerCase().replace(/\s/g, '.')}@gmail.com`,
      phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      position: getRandomItem(Object.values(POSITIONS)),
      desiredBranch,
      branch: status === 'SENT_TO_BRANCH' ? assignedBranch : desiredBranch,
      branch_assigned: status === 'SENT_TO_BRANCH' ? assignedBranch : null,
      assigned_at: assignedAt,
      locked: status === 'SENT_TO_BRANCH',
      locked_reason: lockedReason,
      branch_access_token: status === 'SENT_TO_BRANCH' ? 'demo-token' : null,
      interview_scheduled_date: interviewAt,
      interview_notes: status === 'INTERVIEW_ASSIGNED' ? 'Demo: HRM lên lịch phỏng vấn.' : null,
      interviewer: status === 'INTERVIEW_ASSIGNED' ? 'HRM Admin' : null,
      expectedSalary,
      dob,
      address,
      gender,
      livingState,
      major,
      experience,
      oldCompany,
      reasonForQuitting,
      willingToRelocate,
      workingTime,
      self3Words: describe3Words,
      referrer,
      cvLink: DEMO_CV_LINK,
      cvUrl: DEMO_CV_LINK,
      createdAt,
      updatedAt: nowIso,
      rawData: {
        'Họ và tên ứng viên': name,
        'Địa chỉ email': `${name.toLowerCase().replace(/\s/g, '.')}@gmail.com`,
        'Số điện thoại liên hệ': `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        'Vị trí ứng tuyển': getRandomItem(Object.values(POSITIONS)),
        'Chi nhánh mong muốn': desiredBranch,
        'Mức lương bạn mong muốn': expectedSalary,
        'Ngày tháng năm sinh': dob,
        'Địa chỉ hiện tại': address,
        'Giới tính': gender,
        'Tình trạng nhà': livingState,
        'Chuyên ngành': major,
        'Kinh nghiệm': experience,
        'Bạn đã làm việc ở công ty hay trung tâm nào?': oldCompany,
        'Lý do nghỉ việc': reasonForQuitting,
        'Sẵn sàng di chuyển': willingToRelocate,
        'Thời gian làm việc mong muốn': workingTime,
        'Hãy miêu tả bản thân bạn bằng 3 từ': describe3Words,
        'Người giới thiệu': referrer,
        cvLink: DEMO_CV_LINK,
        cvUrl: DEMO_CV_LINK
      }
    });
  }

  const contracts = employees.slice(0, 100).map((emp, idx) => {
    const stage = (idx % 3) + 1;
    return {
      id: `CONTRACT-${2000 + idx}`,
      employeeId: emp.id,
      employeeName: emp.name,
      branch: emp.department,
      position: emp.position,
      soHd: `HĐLD-${String(emp.id).split('-').pop()}`,
      workflowStage: stage,
      workflowStatus: stage === 3 ? 'COMPLETED' : 'IN_PROGRESS',
      submissionDate: emp.startDate,
      signingDate: stage >= 2 ? emp.contractDate : null
    };
  });

  return { 
    employees, 
    candidates, 
    contracts,
    branches,
    movements: [],
    positionMappings: {},
    colorConfig: {
      statuses: { 'TODO': 'slate', 'IN_PROGRESS': 'blue', 'DONE': 'green', 'CANCELLED': 'red' },
      groups: {
        'ACE AN SƯƠNG': 'blue',
        'ACE PHAN VĂN HỚN': 'orange',
        'ACE HÀ HUY GIÁP': 'purple',
        'ACE LÊ VĂN KHƯƠNG': 'pink',
        'ACE TRỤ SỞ CHÍNH': 'indigo',
        'ACE LÊ LỢI': 'emerald',
        'ACE TRUNG MỸ TÂY': 'rose',
        'ACE THỚI AN': 'cyan',
        'ACE XUÂN THỚI THƯỢNG': 'amber',
        'ACE ĐẶNG THÚC VỊNH': 'slate'
      }
    }
  };
};
