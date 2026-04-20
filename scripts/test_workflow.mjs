import { generateMockCandidates } from '../src/utils/mockGenerator.js';

function runStressTest() {
  console.log("🚀 BẮT ĐẦU TEST LUỒNG TUYỂN DỤNG VỚI 300 HỒ SƠ 🚀\n");

  const startTime = Date.now();
  let opsCount = 0;

  // 1. Generate 300 incoming pending candidates
  let candidates = generateMockCandidates(300).map(c => ({
    ...c, 
    status: 'PENDING' // Reset to pending for the test
  }));
  opsCount += 1;

  console.log(`✅ [1] Đã tạo thành công ${candidates.length} hồ sơ xếp hàng đợi.`);

  // 10 Branches
  const branches = [
    'ACE AN SƯƠNG', 'ACE PHAN VĂN HỚN', 'ACE HÀ HUY GIÁP', 'ACE LÊ VĂN KHƯƠNG',
    'ACE TRỤ SỞ CHÍNH', 'ACE LÊ LỢI', 'ACE TRUNG MỸ TÂY', 'ACE THỚI AN',
    'ACE XUÂN THỚI THƯỢNG', 'ACE ĐẶNG THÚC VỊNH'
  ];

  // 2. HRM Processing:
  // Scenario: HRM interviews 50 themselves, distributes 250 to 10 branches.
  console.log(`\n⏳ [2] HRM (Admin) bắt đầu phân bổ 300 hồ sơ...`);
  
  // HRM Workflow 1: Auto-Takeover 50 candidates
  for (let i = 0; i < 50; i++) {
    candidates[i].status = 'INTERVIEW_ASSIGNED';
    candidates[i].interviewer = 'HRM Admin';
    opsCount += 2; // Read & click takeover
  }

  // HRM Workflow 2: Distribute 250 to branches
  for (let i = 50; i < 300; i++) {
    const targetBranch = branches[i % branches.length];
    
    // Simulate UI actions: Open Modal -> Select Branch -> Confirm Send
    candidates[i].status = 'SENT_TO_BRANCH';
    candidates[i].branch_assigned = targetBranch;
    candidates[i].locked = true;
    opsCount += 3; // Click + Select + Submit
  }

  console.log(`✅ Đã phân công xong: 
- 50 hồ sơ HRM tự phỏng vấn (Cần ${50 * 2} click).
- 250 hồ sơ đã phân cho 10 chi nhánh (Cần ${250 * 3} click).
👉 THỰC TẾ: Admin phải thực hiện ${50*2 + 250*3} thao tác cơ bản để chia việc. Đây là nút thắt cổ chai!`);

  // 3. Branches / HRM Interviewing
  console.log(`\n⏳ [3] Bắt đầu đánh giá phỏng vấn (10 Chi nhánh & HRM)...`);

  for (let i = 0; i < 300; i++) {
    // Branch clicks hand-shake, fills Form, clicks Submit -> Status: COMPLETED or REJECTED
    const isPass = Math.random() > 0.3; // 70% pass
    candidates[i].status = isPass ? 'COMPLETED' : 'REJECTED';
    candidates[i].decision = isPass ? 'PASS' : 'FAIL';
    candidates[i].interview_score = Math.floor(Math.random() * 5) + 5;
    
    opsCount += 4; // Open Form + Fill form + Submit
  }

  console.log(`✅ Tại Chi nhánh: 250 hồ sơ chia cho 10 chi nhánh = ~25 hồ sơ / tháng / chi nhánh.
- Dưới 1 hồ sơ mỗi ngày. Thao tác hoàn toàn dễ dàng, không gây quá tải.`);

  // 4. Report Generation Check
  console.log(`\n⏳ [4] HRM xem Báo cáo Tổng (Report Tab)...`);
  
  const hiredCount = candidates.filter(c => c.status === 'COMPLETED').length;
  const rejectedCount = candidates.filter(c => c.status === 'REJECTED').length;
  
  // Group by branch
  const byBranch = {};
  branches.forEach(b => byBranch[b] = { total: 0, hired: 0 });
  
  candidates.forEach(c => {
    const b = c.branch_assigned || 'HRM Admin';
    if (!byBranch[b]) byBranch[b] = { total: 0, hired: 0 };
    byBranch[b].total++;
    if (c.status === 'COMPLETED') byBranch[b].hired++;
  });

  const duration = Date.now() - startTime;

  console.log(`✅ Kết quả tính toán Báo cáo: 
- Ứng viên nhận việc: ${hiredCount}
- Ứng viên từ chối: ${rejectedCount}
- Tỷ lệ chuyển đổi: ${Math.round((hiredCount/300)*100)}% \n`);

  console.log(`⏱ THỜI GIAN CHẠY MÔ PHỎNG HOÀN TOÀN TỰ ĐỘNG CHỈ: ${duration} ms`);
  console.log(`🎯 Nếu người thật làm, quy trình này tiêu tốn khoảng ${opsCount} thao tác click & gõ phím.`);
}

runStressTest();
