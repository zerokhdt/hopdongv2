/**
 * HdldFtTemplate.jsx
 * Template HTML cho hợp đồng lao động Full-time (HĐLĐ không xác định thời hạn)
 * Được tách ra từ ContractView.jsx để dễ bảo trì và mở rộng.
 * 
 * Cách thêm template mới:
 * 1. Tạo file mới, ví dụ: HdldThuViecTemplate.jsx
 * 2. Export default component nhận { data }
 * 3. Import và dùng trong ContractPreview theo contractVariant.id
 */

import React from 'react';

// ─── Hàm tiện ích (dùng chung, phải đưa vào đây vì tách khỏi ContractView) ─────

function formatDateVN(val) {
  if (!val) return '';
  const dt = new Date(val);
  if (Number.isNaN(dt.getTime())) return String(val);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

function dateParts(val) {
  if (!val) return { d: '', m: '', y: '' };
  const dt = new Date(val);
  if (Number.isNaN(dt.getTime())) return { d: '', m: '', y: '' };
  return {
    d: String(dt.getDate()).padStart(2, '0'),
    m: String(dt.getMonth() + 1).padStart(2, '0'),
    y: String(dt.getFullYear()),
  };
}

function soHdBase(val) {
  const s = String(val || '').trim();
  return s.replace(/\/\s*(HĐLĐ-ACE|HDLD-ACE)\s*$/i, '').trim();
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const HDLD_ACE_HTML_CSS = `
  .hdld-ace-root, .hdld-ace-root * { box-sizing: border-box; }
  .hdld-ace-root { font-family: "Times New Roman", Times, serif; color: #000; line-height: 1.5; }
  .hdld-ace-page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto 28px;
    padding: 15mm 20mm 20mm 25mm;
    position: relative;
    background: #fff;
    page-break-after: always;
    box-shadow:
      0 1px 1px rgba(0,0,0,0.10),
      0 2px 4px rgba(0,0,0,0.10),
      0 4px 8px rgba(0,0,0,0.08),
      0 12px 24px rgba(0,0,0,0.08),
      0 24px 48px rgba(0,0,0,0.04);
    border-top: 1px solid rgba(255,255,255,0.95);
  }
  .hdld-ace-page:last-child { page-break-after: auto; }
  .hdld-ace-doc-code {
    position: absolute;
    top: 6mm;
    right: 8mm;
    border: 1.5px solid #c00;
    color: #c00;
    font-size: 11pt;
    font-weight: bold;
    padding: 2px 10px;
    display: inline-block;
    white-space: nowrap;
  }
  .hdld-ace-page-num {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 8mm;
    text-align: center;
    font-size: 11pt;
    color: #666;
  }
  .hdld-ace-header-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .hdld-ace-header-table td { border: none; padding: 4px 0; vertical-align: middle; width: 50%; font-size: 12pt; line-height: 1.4; }
  .hdld-ace-can-cu { margin: 12px auto 12px; font-style: italic; font-size: 12pt; line-height: 1.5; text-align: center; max-width: 165mm; }
  .hdld-ace-can-cu p { margin-bottom: 3px; }
  .hdld-ace-contract-title { text-align: center; font-size: 15pt; font-weight: bold; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 1px; }
  .hdld-ace-root p { font-size: 12.5pt; line-height: 1.5; margin-bottom: 0; text-align: left; min-height: 1.5em; }
  .hdld-ace-intro-line { font-style: italic; margin-bottom: 10px; }
  .hdld-ace-party { margin-bottom: 10px; }
  .hdld-ace-party-name { font-weight: bold; font-size: 13pt; margin-bottom: 2px; }
  .hdld-ace-party-info p { margin-bottom: 2px; }
  .hdld-ace-agreement-line { font-style: italic; margin: 12px 0 14px; }
  .hdld-ace-article { margin-bottom: 14px; }
  .hdld-ace-article-title { font-weight: bold; font-size: 13pt; margin-bottom: 5px; }
  .hdld-ace-sub-title { font-weight: bold; margin-top: 8px; margin-bottom: 3px; }
  .hdld-ace-indent { padding-left: 20px; }
  .hdld-ace-note-box { font-style: italic; font-size: 12pt; line-height: 1.5; margin: 6px 0; }
  .hdld-ace-spacer { margin: 0 0 1.5em; }
  .hdld-ace-red { color: #c00; }
  .hdld-ace-link { color: #06c; text-decoration: underline; }
  .hdld-ace-sig-table { width: 100%; border-collapse: collapse; margin-top: 36px; }
  .hdld-ace-sig-table td { width: 50%; text-align: center; padding: 8px; font-size: 12.5pt; vertical-align: top; border: none; }
  .hdld-ace-sig-title { font-weight: bold; margin-bottom: 3px; }
  .hdld-ace-sig-sub { font-style: italic; font-size: 11.5pt; margin-bottom: 0; }
  .hdld-ace-sig-space { height: 70mm; }
  @media print {
    .hdld-ace-page { margin: 0; padding: 12mm 18mm 18mm 22mm; width: 100%; box-shadow: none; }
    @page { size: A4; margin: 0; }
  }
`;

// ─── HTML Template (các placeholder dùng {{KEY}}) ────────────────────────────
// Mỗi trang A4 = 1 <div class="hdld-ace-page">
// Thêm nội dung mới: thêm <div class="hdld-ace-page">...</div> ở cuối

const HDLD_ACE_HTML_TEMPLATE = `
  <div class="hdld-ace-page">
    <div class="hdld-ace-doc-code">03.HĐLĐ – ACE</div>
    <table class="hdld-ace-header-table">
      <tr>
        <td style="text-align:center;"><strong>CÔNG TY TNHH PHÁT TRIỂN<br>GIÁO DỤC ACE</strong></td>
        <td style="text-align:center;"><strong style="white-space:nowrap;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br><strong>Độc lập – Tự do – Hạnh phúc</strong></td>
      </tr>
    </table>
    <p style="margin-top:6px;">Số: <span class="hdld-ace-red">{{SO_HD}}</span>/HĐLĐ-ACE</p>
    <div class="hdld-ace-can-cu">
      <p>- Căn cứ Bộ luật Lao động số 45/2019/QH14 ngày 20 tháng 11 năm 2019;</p>
      <p>- Căn cứ Nghị định số 145/2020/NĐ-CP ngày 14 tháng 12 năm 2020 của Chính phủ quy định chi tiết và hướng dẫn thi hành một số điều của Bộ luật Lao động;</p>
      <p>- Căn cứ Nội quy lao động và nhu cầu sử dụng lao động thực tế của Công ty;</p>
    </div>
    <div class="hdld-ace-contract-title">Hợp Đồng Lao Động</div>
    <p class="hdld-ace-intro-line">Hôm nay, ngày <span class="hdld-ace-red">{{NGAY_KY_D}}</span> tháng <span class="hdld-ace-red">{{NGAY_KY_M}}</span> năm {{NGAY_KY_Y}}, tại Thành phố Hồ Chí Minh, Chúng tôi gồm có:</p>
    <div class="hdld-ace-party">
      <p class="hdld-ace-party-name">Bên A (Người sử dụng lao động): CÔNG TY TNHH PHÁT TRIỂN GIÁO DỤC ACE</p>
      <div class="hdld-ace-party-info">
        <p>Địa chỉ: Số 201, Lê Lợi, xã Xuân Thới Sơn, Thành phố Hồ Chí Minh</p>
        <p>Mã Số doanh nghiệp/ mã số Thuế: 0318914647</p>
        <p>Đại diện pháp luật: Bà <strong>TRƯƠNG KIỀU OANH</strong></p>
        <p>Chức vụ: Giám đốc</p>
        <p>Điện thoại: 0909259555</p>
      </div>
    </div>
    <p class="hdld-ace-spacer">&nbsp;</p>
    <div class="hdld-ace-party">
      <p class="hdld-ace-party-name">Bên B (Người lao động): Ông/Bà: <strong><span class="hdld-ace-red">{{HO_TEN}}</span></strong></p>
      <div class="hdld-ace-party-info">
        <p>Quốc tịch: {{QUOC_TICH}} &nbsp;&nbsp; sinh ngày: {{NGAY_SINH}} &nbsp;&nbsp; tại: <span class="hdld-ace-red">{{NOI_SINH}}</span></p>
        <p>Số CMND/CCCD: <strong><span class="hdld-ace-red">{{CCCD}}</span></strong> do <span class="hdld-ace-red">{{NOI_CAP}}</span>, cấp ngày: <span class="hdld-ace-red">{{NGAY_CAP}}</span>.</p>
        <p>Số điện thoại: <span class="hdld-ace-red">{{DIEN_THOAI}}</span></p>
        <p>Email: <span class="hdld-ace-link">{{EMAIL}}</span></p>
        <p>Địa chỉ thường trú: <span class="hdld-ace-red">{{DIA_CHI_THUONG_TRU}}</span></p>
        <p>Địa chỉ tạm trú: <span class="hdld-ace-red">{{DIA_CHI_TAM_TRU}}</span></p>
      </div>
    </div>
    <p class="hdld-ace-spacer">&nbsp;</p>
    <p class="hdld-ace-agreement-line">Thỏa thuận ký kết hợp đồng lao động và cam kết thực hiện đúng những điều khoản sau:</p>
    <div class="hdld-ace-article">
      <p class="hdld-ace-article-title">Điều 1: Thời hạn và công việc hợp đồng</p>
      <p>Loại hợp đồng: {{LOAI_HOP_DONG}}</p>
      <p>- Thời gian làm việc chính thức: từ ngày <span class="hdld-ace-red">{{TU_NGAY_D}}</span> tháng <span class="hdld-ace-red">{{TU_NGAY_M}}</span> năm <span class="hdld-ace-red">{{TU_NGAY_Y}}</span>.</p>
      <p>- Địa điểm làm việc: Công Ty TNHH Phát Triển Giáo Dục ACE <em>(kèm theo quyết định điều động và bổ nhiệm)</em></p>
    </div>
    <div class="hdld-ace-page-num">1</div>
  </div>
  <div class="hdld-ace-page">
    <div class="hdld-ace-doc-code">03.HĐLĐ – ACE</div>
    <div class="hdld-ace-article">
      <p>- Chức danh chuyên môn: <span class="hdld-ace-red">{{CHUC_DANH}}</span></p>
      <p>- Công việc theo sự phân công.</p>
      <p class="hdld-ace-article-title">Điều 2: Chế độ làm việc</p>
      <p><strong>2.1.</strong> Thời gian làm việc: 8 tiếng/ ngày; theo nội quy công ty.</p>
      <p><strong>2.2.</strong> Đồng phục và các trang thiết bị làm việc sẽ được công ty cấp phát tùy theo nhu cầu của công việc.</p>
      <p class="hdld-ace-article-title">Điều 3: Nghĩa vụ và quyền lợi của Bên B</p>
      <p class="hdld-ace-sub-title">3.1. Quyền lợi</p>
      <p><strong>3.1.1. Tiền lương và hình thức trả lương</strong></p>
      <p>Mức lương cơ bản: <span class="hdld-ace-red">{{LUONG}}</span> đồng/tháng.</p>
      <p>(Số tiền bằng chữ: <span class="hdld-ace-red">{{LUONG_CHU}}</span>)</p>
      <p class="hdld-ace-sub-title">3.1.2. Phụ cấp khác:</p>
      <p>- Phụ cấp chỗ ở: <span class="hdld-ace-red">{{PC_CHO_O}}</span> đồng/tháng</p>
      <p>- Phụ cấp đi lại: <span class="hdld-ace-red">{{PC_DI_LAI}}</span> đồng/tháng</p>
      <p>- Phụ cấp điện thoại: <span class="hdld-ace-red">{{PC_DIEN_THOAI}}</span> đồng/tháng</p>
      <p>- Thưởng thêm khác theo quy định.</p>
      <p>- Hình thức trả lương: Tiền lương được thanh toán vào ngày 10 hàng tháng bằng hình thức chuyển khoản <em>(hoặc tiền mặt, tùy theo thỏa thuận)</em>. Trường hợp ngày 10 trùng vào thứ Bảy, Chủ nhật hoặc ngày nghỉ lễ, việc thanh toán sẽ được thực hiện vào ngày làm việc tiếp theo.</p>
      <p class="hdld-ace-sub-title">3.1.3. Các quyền lợi khác</p>
      <p>- Được tham gia Bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp theo quy định của Luật BHXH hiện hành.</p>
      <p>- Chế độ nâng lương: Theo chính sách nâng lương của công ty.</p>
      <p>- Chế độ ngày nghỉ: Nghỉ lễ có hưởng lương trong năm: Tết Dương Lịch (01 ngày), Ngày giỗ tổ Hùng Vương 10/03 âm lịch (01 ngày), 30/04 (01 ngày), 01/05 (01 ngày), 02/09 (02 ngày), Tết Nguyên Đán (05 ngày). Ngoài ra Bên B được nghỉ thêm 12 ngày phép trong năm, áp dụng đối với nhân viên làm việc đủ số ngày trong tháng và theo quy định công ty.</p>
      <p>- Chế độ ngày phép: Bên B được hưởng 12 ngày phép/năm.</p>
      <p class="hdld-ace-note-box"><strong>Lưu ý:</strong> <em>Áp dụng đủ 01 ngày phép khi nhân viên làm đủ số ngày trong tháng được tính nghỉ phép năm theo tỷ lệ thời gian làm việc thực tế trong năm. Phép năm chưa sử dụng trong năm khi đến tháng cuối cùng trong năm sẽ được công ty bố trí phù hợp. Trường hợp công ty đã bố trí lịch nghỉ phép hợp lý mà Bên B không sử dụng thì phần phép chưa nghỉ sẽ không được quy đổi thành tiền.</em></p>
      <p>Bên B được sử dụng tối đa 03 ngày phép năm/01 tháng <em>(Nếu muốn sử dụng hơn 3 ngày phép năm/01 tháng phải xin duyệt từ Ban Giám Đốc)</em></p>
    </div>
    <div class="hdld-ace-page-num">2</div>
  </div>
  <div class="hdld-ace-page">
    <div class="hdld-ace-doc-code">03.HĐLĐ – ACE</div>
    <div class="hdld-ace-article">
      <p class="hdld-ace-sub-title">- Các chế độ khác:</p>
      <p class="hdld-ace-indent">+ Nhân viên được tham gia các khóa đào tạo chuyên môn của công ty hoặc các chương trình đào tạo quốc tế và các chế độ theo quy định của công ty.</p>
      <p class="hdld-ace-indent">+ Nhân viên làm việc từ tháng thứ 03 trở về sau được xét hưởng thêm chế độ thưởng khác theo quy định của công ty.</p>
      <p class="hdld-ace-sub-title">3.2. Nghĩa vụ</p>
      <p><strong>3.2.1.</strong> Cam kết chấp hành nghiêm túc nội quy lao động, các thỏa thuận, quy chế của Công ty và quy định pháp luật. Trường hợp vi phạm sẽ bị xử lý kỷ luật theo quy định của pháp luật và nội quy Công ty.</p>
      <p><strong>3.2.2.</strong> Trong quá trình làm việc, Bên B có nghĩa vụ:</p>
      <p class="hdld-ace-indent">Đảm bảo đúng thời gian làm việc, chất lượng giảng dạy, chăm sóc học viên sát sao và thực hiện đúng chương trình đào tạo nếu có lớp giảng dạy;</p>
      <p class="hdld-ace-indent">Tạo dựng môi trường học tập an toàn, tích cực, công bằng và nhân văn cho tất cả học viên;</p>
      <p class="hdld-ace-indent">Ứng xử văn minh, tôn trọng học viên; tuyệt đối nghiêm cấm mọi hành vi bạo hành, đe dọa, la mắng, xúc phạm, kỳ thị hoặc phân biệt đối xử với học viên dưới bất kỳ hình thức nào.</p>
      <p><strong>3.2.3.</strong> Chấp hành việc điều động, luân chuyển theo phân công công việc của Công ty.</p>
      <p><strong>3.2.4.</strong> Trường hợp Bên B xin nghỉ việc, phải thông báo trước cho Công ty tối thiểu 45 ngày theo quy định tại Điều 35 Bộ luật Lao động 2019 và theo thỏa thuận. Đồng thời, có trách nhiệm bàn giao đầy đủ công việc cho người thay thế do Công ty chỉ định.</p>
      <p><strong>3.2.5.</strong> Bên B cam kết bảo mật và không tiết lộ bất kỳ thông tin nào liên quan đến công việc, tài liệu, dữ liệu và các nội dung khác do Bên A cung cấp cho bất kỳ bên thứ ba nào trong suốt quá trình hợp tác và cả sau khi hợp đồng kết thúc.</p>
      <p class="hdld-ace-article-title">Điều 4: Nghĩa vụ và quyền hạn của Bên A</p>
      <p class="hdld-ace-sub-title">4.1 Nghĩa vụ</p>
      <p><strong>4.1.1.</strong> Bảo đảm việc làm và thực hiện đầy đủ những điều đã cam kết trong hợp đồng lao động này.</p>
      <p><strong>4.1.2.</strong> Thanh toán lương đầy đủ, đúng thời hạn và đảm bảo thực hiện đúng các chế độ và quyền lợi cho nhân viên theo hợp đồng lao động và theo quy định của công ty.</p>
      <p><strong>4.1.3.</strong> Trường hợp bất khả kháng khiến công ty tạm ngưng hoạt động <em>(do thiên tai, dịch bệnh, chiến tranh, hỏa hoạn…)</em> công ty ngưng trả lương và ngưng các khoản trợ cấp theo hợp đồng. Bên A có thể hỗ trợ Bên B tùy theo tình hình tài chính thực tế của Bên A.</p>
      <p class="hdld-ace-sub-title">4.2 Quyền hạn</p>
      <p><strong>4.2.1.</strong> Điều hành nhân viên hoàn thành công việc theo Hợp đồng <em>(bố trí, điều chuyển, phân công công việc, v.v...).</em></p>
      <p><strong>4.2.2.</strong> Công ty có quyền tạm hoãn, chấm dứt Hợp đồng với Bên B, khi Bên B vi phạm</p>
    </div>
    <div class="hdld-ace-page-num">3</div>
  </div>
  <div class="hdld-ace-page">
    <div class="hdld-ace-doc-code">03.HĐLĐ – ACE</div>
    <div class="hdld-ace-article">
      <p>kỷ luật, gây mất đoàn kết nội bộ trong công ty, cãi nhau, đánh nhau, sử dụng các chất cấm, vi phạm văn hóa công ty, vi phạm nội quy của công ty và pháp luật có liên quan.</p>
      <p>Khi đó Bên B phải bồi thường những thiệt hại <em>(nếu có)</em> cho công ty hoặc các bên có liên quan. Việc bồi thường được xác định dựa trên mức độ thiệt hại thực tế và theo nguyên tắc tại Điều 130 Bộ luật Lao động 2019.</p>
    </div>
    <div class="hdld-ace-article">
      <p class="hdld-ace-article-title">Điều 5: Điều khoản chung</p>
      <p>Trong các trường hợp bất khả kháng được nêu ở trên thì hai bên sẽ chấm dứt Hợp đồng lao động mà không bên nào phải đền bù tổn thất cho bên còn lại.</p>
      <p>Nếu có tranh chấp các bên ngồi lại trên tinh thần đàm phán và tôn trọng lẫn nhau, nếu không thể giải quyết được thì các bên có quyền khởi kiện bên còn lại ra Tòa án của Việt Nam. Bên thua kiện chịu các khoản án phí theo quy định.</p>
      <p>Hợp đồng này được lập bằng tiếng Việt Nam, theo quy định của Luật pháp Việt Nam và phán quyết của Tòa án Việt Nam.</p>
      <p>Thuế thu nhập cá nhân <em>(TNCN)</em>: Bên A có trách nhiệm khấu trừ thuế TNCN theo quy định pháp luật hiện hành trước khi thanh toán tiền lương cho Bên B.</p>
      <p>Cả hai Bên A và Bên B cùng đọc và hiểu các điều khoản trong hợp đồng này cùng đồng thuận, tự nguyện ký hợp đồng và không có bất kỳ khiếu nại về sau.</p>
      <p>Hợp đồng lao động này được làm thành 03 bản có giá trị ngang nhau, Bên A giữ 02 bản và Bên B giữ 01 bản và có hiệu lực từ ngày ký./.</p>
    </div>
    <table class="hdld-ace-sig-table">
      <tr>
        <td>
          <p class="hdld-ace-sig-title">NGƯỜI SỬ DỤNG LAO ĐỘNG</p>
          <p class="hdld-ace-sig-sub">(Ký tên, đóng dấu và ghi rõ họ và tên)</p>
          <div class="hdld-ace-sig-space"></div>
        </td>
        <td>
          <p class="hdld-ace-sig-title">NGƯỜI LAO ĐỘNG</p>
          <p class="hdld-ace-sig-sub">(Ký và ghi rõ họ và tên)</p>
          <div class="hdld-ace-sig-space"></div>
        </td>
      </tr>
    </table>
    <div class="hdld-ace-page-num">4</div>
  </div>
`;

// ─── Component chính ──────────────────────────────────────────────────────────

/**
 * HdldFtTemplate
 * Render HTML preview cho hợp đồng lao động Full-time (không xác định thời hạn).
 * 
 * @param {object} data        - Dữ liệu hợp đồng (keys: ho_ten, so_hd, ngay_ky, ...)
 * @param {object} contractVariant - Variant object từ DOCUMENT_TEMPLATES
 */
export default function HdldFtTemplate({ data, contractVariant }) {
  const fill = (val, dots) => {
    const s = String(val ?? '').trim();
    return s ? s : String(dots ?? '................');
  };

  const so = soHdBase(data.so_hd) || '';
  const ky = dateParts(data.ngay_ky);
  const tu = dateParts(data.tu_ngay);

  const map = {
    SO_HD:               fill(so, '........../....'),
    NGAY_KY_D:           fill(ky.d, '....'),
    NGAY_KY_M:           fill(ky.m, '....'),
    NGAY_KY_Y:           fill(ky.y, '....'),
    HO_TEN:              fill(data.ho_ten, '..............................'),
    QUOC_TICH:           fill(data.quoc_tich || 'Việt Nam', '..............................'),
    NGAY_SINH:           fill(formatDateVN(data.ngay_sinh), '....../....../........'),
    NOI_SINH:            fill(data.noi_sinh, '..............................'),
    CCCD:                fill(data.cccd, '..............................'),
    NOI_CAP:             fill(data.noi_cap, '..............................'),
    NGAY_CAP:            fill(formatDateVN(data.ngay_cap), '....../....../........'),
    DIEN_THOAI:          fill(data.so_dien_thoai, '..............................'),
    EMAIL:               fill(data.email, '..............................'),
    DIA_CHI_THUONG_TRU:  fill(data.dia_chi, '..............................'),
    DIA_CHI_TAM_TRU:     fill(data.tam_tru, '..............................'),
    LOAI_HOP_DONG:       contractVariant?.desc ?? 'Hợp đồng lao động không xác định thời hạn.',
    TU_NGAY_D:           fill(tu.d, '....'),
    TU_NGAY_M:           fill(tu.m, '....'),
    TU_NGAY_Y:           fill(tu.y, '....'),
    CHUC_DANH:           fill(data.chuc_vu, '..............................'),
    LUONG:               fill(data.luong, '..............................'),
    LUONG_CHU:           fill(data.luong_chu, '........................................................'),
    PC_CHO_O:            fill(data.phu_cap_cho_o, '0'),
    PC_DI_LAI:           fill(data.phu_cap_di_lai, '0'),
    PC_DIEN_THOAI:       fill(data.phu_cap_dt, '0'),
  };

  let html = HDLD_ACE_HTML_TEMPLATE;
  Object.keys(map).forEach((k) => {
    html = html.split(`{{${k}}}`).join(escapeHtml(map[k]));
  });

  return (
    <div className="hdld-ace-root">
      <style dangerouslySetInnerHTML={{ __html: HDLD_ACE_HTML_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
