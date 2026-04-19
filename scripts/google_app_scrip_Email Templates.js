// ============================================================ 
// EMAIL TEMPLATES (HTML - Đa ngôn ngữ)
// ============================================================ 

const EMAIL_TEMPLATES = {
  BRANCH_ASSIGNMENT: {
    vi: {
      subject: '[ACE HRM] Ứng viên mới cần review - {{candidate_name}}',
      body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 25px; border-radius: 0 0 8px 8px; }
    .info-row { margin-bottom: 12px; }
    .label { font-weight: bold; color: #4b5563; min-width: 140px; display: inline-block; }
    .action-btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
      text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>ACE HRM - Thông báo ứng viên mới</h2>
    </div>
    <div class="content">
      <p>Xin chào Chi nhánh <strong>{{branch_name}}</strong>,</p>
      <p>Hệ thống ACE HRM vừa nhận được hồ sơ ứng viên mới cần bạn review:</p>
      
      <div style="background: white; padding: 18px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <div class="info-row"><span class="label">Họ và tên:</span> {{candidate_name}}</div>
        <div class="info-row"><span class="label">Vị trí ứng tuyển:</span> {{position}}</div>
        <div class="info-row"><span class="label">Số điện thoại:</span> {{phone}}</div>
        <div class="info-row"><span class="label">Email:</span> {{email}}</div>
        <div class="info-row"><span class="label">Thời gian apply:</span> {{applied_at}}</div>
      </div>

      <p><strong>📋 Hồ sơ đính kèm:</strong></p>
      <ul>
        <li><a href="{{cv_url}}">Xem CV của ứng viên</a></li>
        {{#if video_url}}<li><a href="{{video_url}}">Xem video giới thiệu</a></li>{{/if}}
      </ul>

      <p>Vui lòng review hồ sơ và cập nhật trạng thái trong hệ thống ACE HRM:</p>
      <a href="https://script.google.com/macros/s/{{script_id}}/exec?branch={{branch_name}}" 
         class="action-btn" target="_blank">
        🔍 Truy cập hệ thống
      </a>

      <div class="footer">
        <p>Đây là email tự động từ hệ thống ACE HRM. Vui lòng không reply email này.</p>
        <p>📞 Hotline hỗ trợ: 0988 888 888 | ✉️ Email: ace.hrm@gmail.com</p>
        <div style="font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 10px;">
          [Ref: CID-{{candidate_id}}]
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
    },
    en: {
      subject: '[ACE HRM] New Candidate for Review - {{candidate_name}}',
      body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 25px; border-radius: 0 0 8px 8px; }
    .info-row { margin-bottom: 12px; }
    .label { font-weight: bold; color: #4b5563; min-width: 160px; display: inline-block; }
    .action-btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
      text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>ACE HRM - New Candidate Notification</h2>
    </div>
    <div class="content">
      <p>Hello <strong>{{branch_name}}</strong> Branch,</p>
      <p>ACE HRM system has received a new candidate application for your review:</p>
      
      <div style="background: white; padding: 18px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <div class="info-row"><span class="label">Full Name:</span> {{candidate_name}}</div>
        <div class="info-row"><span class="label">Position:</span> {{position}}</div>
        <div class="info-row"><span class="label">Phone:</span> {{phone}}</div>
        <div class="info-row"><span class="label">Email:</span> {{email}}</div>
        <div class="info-row"><span class="label">Applied At:</span> {{applied_at}}</div>
      </div>

      <p><strong>📋 Attached Documents:</strong></p>
      <ul>
        <li><a href="{{cv_url}}">View Candidate's CV</a></li>
        {{#if video_url}}<li><a href="{{video_url}}">View Introduction Video</a></li>{{/if}}
      </ul>

      <p>Please review the profile and update status in ACE HRM system:</p>
      <a href="https://script.google.com/macros/s/{{script_id}}/exec?branch={{branch_name}}" 
         class="action-btn" target="_blank">
        🔍 Access System
      </a>

      <div class="footer">
        <p>This is an automated email from ACE HRM system. Please do not reply to this email.</p>
        <p>📞 Support Hotline: 0988 888 888 | ✉️ Email: ace.hrm@gmail.com</p>
        <div style="font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 10px;">
          [Ref: CID-{{candidate_id}}]
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
    }
  },
  
  INTERVIEW_INVITE: {
    vi: {
      subject: '[ACE HRM] Thư mời phỏng vấn - {{candidate_name}}',
      body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f0fdf4; padding: 25px; border-radius: 0 0 8px 8px; }
    .interview-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981; }
    .action-btn { display: inline-block; background: #10b981; color: white; padding: 12px 30px; 
      text-decoration: none; border-radius: 6px; margin: 15px 5px; font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #d1fae5; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>ACE HRM - Thư mời phỏng vấn</h2>
    </div>
    <div class="content">
      <p>Kính gửi Anh/Chị <strong>{{candidate_name}}</strong>,</p>
      <p>Cảm ơn Anh/Chị đã quan tâm và nộp hồ sơ ứng tuyển vào vị trí <strong>{{position}}</strong> tại ACE.</p>
      <p>Chúng tôi rất ấn tượng với hồ sơ của Anh/Chị và trân trọng mời Anh/Chị tham gia buổi phỏng vấn.</p>
      
      <div class="interview-details">
        <h3>📅 Thông tin buổi phỏng vấn</h3>
        <p><strong>Thời gian:</strong> {{interview_date}} ({{interview_time}})</p>
        <p><strong>Hình thức:</strong> {{interview_type}} ({{interview_platform}})</p>
        <p><strong>Người phỏng vấn:</strong> {{interviewer_name}}</p>
        <p><strong>Địa chỉ/Link:</strong> {{interview_location}}</p>
        <p><strong>Ghi chú:</strong> {{interview_notes}}</p>
      </div>

      <p>Vui lòng xác nhận tham gia bằng cách click nút bên dưới:</p>
      <div>
        <a href="{{confirm_link}}" class="action-btn">✅ Xác nhận tham gia</a>
        <a href="{{reschedule_link}}" class="action-btn" style="background: #f59e0b;">🔄 Đổi lịch</a>
        <a href="{{decline_link}}" class="action-btn" style="background: #ef4444;">❌ Từ chối</a>
      </div>

      <p style="margin-top: 25px;"><strong>Lưu ý:</strong></p>
      <ul>
        <li>Vui lòng có mặt trước 10 phút để chuẩn bị</li>
        <li>Mang theo CMND/CCCD bản gốc</li>
        <li>Chuẩn bị sẵn các câu hỏi cho nhà tuyển dụng</li>
      </ul>

      <div class="footer">
        <p>Trân trọng,<br>
        <strong>Bộ phận Tuyển dụng - ACE HRM</strong></p>
        <p>📞 {{branch_phone}} | ✉️ {{branch_email}} | 🌐 {{company_website}}</p>
        <div style="font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 10px;">
          [Ref: CID-{{candidate_id}}]
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
    },
    en: {
      subject: '[ACE HRM] Interview Invitation - {{candidate_name}}',
      body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f0fdf4; padding: 25px; border-radius: 0 0 8px 8px; }
    .interview-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981; }
    .action-btn { display: inline-block; background: #10b981; color: white; padding: 12px 30px; 
      text-decoration: none; border-radius: 6px; margin: 15px 5px; font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #d1fae5; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>ACE HRM - Interview Invitation</h2>
    </div>
    <div class="content">
      <p>Dear <strong>{{candidate_name}}</strong>,</p>
      <p>Thank you for your interest in applying for the <strong>{{position}}</strong> position at ACE.</p>
      <p>We are impressed with your profile and would like to invite you for an interview.</p>
      
      <div class="interview-details">
        <h3>📅 Interview Details</h3>
        <p><strong>Date & Time:</strong> {{interview_date}} ({{interview_time}})</p>
        <p><strong>Format:</strong> {{interview_type}} ({{interview_platform}})</p>
        <p><strong>Interviewer:</strong> {{interviewer_name}}</p>
        <p><strong>Location/Link:</strong> {{interview_location}}</p>
        <p><strong>Notes:</strong> {{interview_notes}}</p>
      </div>

      <p>Please confirm your attendance by clicking the button below:</p>
      <div>
        <a href="{{confirm_link}}" class="action-btn">✅ Confirm Attendance</a>
        <a href="{{reschedule_link}}" class="action-btn" style="background: #f59e0b;">🔄 Reschedule</a>
        <a href="{{decline_link}}" class="action-btn" style="background: #ef4444;">❌ Decline</a>
      </div>

      <p style="margin-top: 25px;"><strong>Important Notes:</strong></p>
      <ul>
        <li>Please arrive 10 minutes early for preparation</li>
        <li>Bring your original ID card/Passport</li>
        <li>Prepare questions for the interviewer</li>
      </ul>

      <div class="footer">
        <p>Best regards,<br>
        <strong>Recruitment Department - ACE HRM</strong></p>
        <p>📞 {{branch_phone}} | ✉️ {{branch_email}} | 🌐 {{company_website}}</p>
        <div style="font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 10px;">
          [Ref: CID-{{candidate_id}}]
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
    }
  },
  
  OFFER_LETTER: {
    vi: {
      subject: '[ACE HRM] Thư mời nhận việc - {{candidate_name}}',
      body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; line-height: 1.8; color: #1f2937; }
    .container { max-width: 700px; margin: 0 auto; padding: 30px; border: 2px solid #1e40af; border-radius: 12px; }
    .letterhead { text-align: center; border-bottom: 3px double #1e40af; padding-bottom: 20px; margin-bottom: 30px; }
    .company-name { color: #1e40af; font-size: 28px; font-weight: bold; letter-spacing: 2px; }
    .offer-title { color: #dc2626; font-size: 24px; margin: 25px 0; text-align: center; }
    .offer-details { background: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #1e40af; }
    .signature-area { margin-top: 60px; text-align: right; }
    .accept-btn { display: inline-block; background: #059669; color: white; padding: 15px 40px; 
      text-decoration: none; border-radius: 8px; margin-top: 30px; font-size: 18px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="letterhead">
      <div class="company-name">ACE CORPORATION</div>
      <div style="color: #4b5563; margin-top: 5px;">Innovating Tomorrow, Today</div>
    </div>
    
    <div class="offer-title">THƯ MỜI NHẬN VIỆC</div>
    
    <p><strong>Kính gửi: Ông/Bà {{candidate_name}}</strong></p>
    <p>Thay mặt Ban Lãnh đạo Công ty ACE, tôi trân trọng gửi đến Ông/Bà Thư mời nhận việc chính thức cho vị trí:</p>
    
    <div class="offer-details">
      <p><strong>Vị trí công việc:</strong> {{position}} (Mã vị trí: {{position_code}})</p>
      <p><strong>Bộ phận/Phòng ban:</strong> {{department}}</p>
      <p><strong>Chi nhánh làm việc:</strong> {{branch_name}}</p>
      <p><strong>Ngày bắt đầu làm việc:</strong> {{start_date}}</p>
      <p><strong>Thời gian thử việc:</strong> {{probation_period}}</p>
      <p><strong>Mức lương:</strong> {{salary}} {{salary_currency}}/tháng</p>
      <p><strong>Phụ cấp & chế độ:</strong> {{allowances}}</p>
      <p><strong>Giờ làm việc:</strong> {{working_hours}}</p>
      <p><strong>Người quản lý trực tiếp:</strong> {{manager_name}} ({{manager_position}})</p>
    </div>
    
    <p><strong>Điều kiện nhận việc:</strong></p>
    <ol>
      <li>Xuất trình đầy đủ giấy tờ: CMND/CCCD, Sổ hộ khẩu, Giấy khám sức khỏe, Bằng cấp liên quan</li>
      <li>Hoàn thành thủ tục hành chính theo quy định công ty</li>
      <li>Ký kết Hợp đồng lao động và Nội quy công ty</li>
    </ol>
    
    <p>Thư mời nhận việc này có hiệu lực trong vòng <strong>07 ngày</strong> kể từ ngày {{offer_date}}.</p>
    
    <div style="text-align: center; margin-top: 40px;">
      <a href="{{accept_link}}" class="accept-btn">📝 CHẤP NHẬN NHẬN VIỆC</a>
      <br>
      <a href="{{decline_link}}" style="color: #dc2626; margin-top: 15px; display: inline-block;">Từ chối nhận việc</a>
    </div>
    
    <div class="signature-area">
      <p><strong>Trân trọng,</strong></p>
      <p><strong>{{hr_director_name}}</strong></p>
      <p>Giám đốc Nhân sự</p>
      <p>Công ty ACE</p>
      <p>Ngày: {{current_date}}</p>
      
      <div style="font-size: 11px; color: #cbd5e1; text-align: right; margin-top: 30px;">
        [Ref: CID-{{candidate_id}}]
      </div>
    </div>
  </div>
</body>
</html>`
    },
    en: {
      subject: '[ACE HRM] Job Offer Letter - {{candidate_name}}',
      body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; line-height: 1.8; color: #1f2937; }
    .container { max-width: 700px; margin: 0 auto; padding: 30px; border: 2px solid #1e40af; border-radius: 12px; }
    .letterhead { text-align: center; border-bottom: 3px double #1e40af; padding-bottom: 20px; margin-bottom: 30px; }
    .company-name { color: #1e40af; font-size: 28px; font-weight: bold; letter-spacing: 2px; }
    .offer-title { color: #dc2626; font-size: 24px; margin: 25px 0; text-align: center; }
    .offer-details { background: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #1e40af; }
    .signature-area { margin-top: 60px; text-align: right; }
    .accept-btn { display: inline-block; background: #059669; color: white; padding: 15px 40px; 
      text-decoration: none; border-radius: 8px; margin-top: 30px; font-size: 18px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="letterhead">
      <div class="company-name">ACE CORPORATION</div>
      <div style="color: #4b5563; margin-top: 5px;">Innovating Tomorrow, Today</div>
    </div>
    
    <div class="offer-title">JOB OFFER LETTER</div>
    
    <p><strong>To: Mr./Ms. {{candidate_name}}</strong></p>
    <p>On behalf of ACE Company Management, I am pleased to extend to you a formal job offer for the position of:</p>
    
    <div class="offer-details">
      <p><strong>Position:</strong> {{position}} (Position Code: {{position_code}})</p>
      <p><strong>Department:</strong> {{department}}</p>
      <p><strong>Work Location:</strong> {{branch_name}}</p>
      <p><strong>Start Date:</strong> {{start_date}}</p>
      <p><strong>Probation Period:</strong> {{probation_period}}</p>
      <p><strong>Salary:</strong> {{salary}} {{salary_currency}}/month</p>
      <p><strong>Allowances & Benefits:</strong> {{allowances}}</p>
      <p><strong>Working Hours:</strong> {{working_hours}}</p>
      <p><strong>Direct Manager:</strong> {{manager_name}} ({{manager_position}})</p>
    </div>
    
    <p><strong>Conditions of Employment:</strong></p>
    <ol>
      <li>Submit required documents: ID/Passport, Household Registration, Health Certificate, Relevant Degrees</li>
      <li>Complete administrative procedures as per company policy</li>
      <li>Sign Employment Contract and Company Regulations</li>
    </ol>
    
    <p>This offer is valid for <strong>07 days</strong> from {{offer_date}}.</p>
    
    <div style="text-align: center; margin-top: 40px;">
      <a href="{{accept_link}}" class="accept-btn">📝 ACCEPT JOB OFFER</a>
      <br>
      <a href="{{decline_link}}" style="color: #dc2626; margin-top: 15px; display: inline-block;">Decline Offer</a>
    </div>
    
    <div class="signature-area">
      <p><strong>Sincerely,</strong></p>
      <p><strong>{{hr_director_name}}</strong></p>
      <p>Human Resources Director</p>
      <p>ACE Company</p>
      <p>Date: {{current_date}}</p>

      <div style="font-size: 11px; color: #cbd5e1; text-align: right; margin-top: 30px;">
        [Ref: CID-{{candidate_id}}]
      </div>
    </div>
  </div>
</body>
</html>`
    }
  }
};