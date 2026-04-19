/**
 * HdldBaseTemplate.jsx
 * Template HTML dạng A4 page cho hợp đồng lao động thử việc / part-time.
 * Dùng component A4Page + divs React thay vì HTML string.
 *
 * Cách mở rộng:
 * - Thêm contractVariant.id mới → thêm case vào switch bên dưới
 * - Hoặc tạo file mới ví dụ HdldThuViecTemplate.jsx và export riêng
 */

import React from 'react';

// ─── Hàm tiện ích ─────────────────────────────────────────────────────────────

function soHdBase(val) {
  const s = String(val || '').trim();
  return s.replace(/\/\s*(HĐLĐ-ACE|HDLD-ACE)\s*$/i, '').trim();
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

// ─── Helper: hiển thị giá trị hoặc dấu chấm ─────────────────────────────────
function V({ v, dots = '.......................' }) {
  const s = String(v ?? '').trim();
  return <span className="red">{s || dots}</span>;
}

// ─── Helper: 1 trang A4 ───────────────────────────────────────────────────────
function A4Page({ pageNum, headerText, children }) {
  return (
    <div className="flex flex-col items-center">
      <div className="no-print w-[210mm] flex items-center justify-center mb-2">
        <div className="px-4 py-1 rounded-full text-[10px] font-bold tracking-[0.18em] text-white/95 bg-[#00288e]/75 backdrop-blur-sm shadow-sm">
          TRANG {pageNum}
        </div>
      </div>
      <section className="page max-w-[210mm] relative">
        <div className="page-header">{headerText}</div>
        <div className="page-content">{children}</div>
        <div className="page-footer">{pageNum}</div>
      </section>
    </div>
  );
}

// ─── Template chính ───────────────────────────────────────────────────────────

/**
 * HdldBaseTemplate
 * Render HTML preview cho hợp đồng thử việc / part-time.
 *
 * @param {object} data            - Dữ liệu hợp đồng
 * @param {object} contractVariant - Variant object từ DOCUMENT_TEMPLATES
 */
export default function HdldBaseTemplate({ data, contractVariant }) {
  const ky   = dateParts(data.ngay_ky);
  const tu   = dateParts(data.tu_ngay);
  const sinh = dateParts(data.ngay_sinh);
  const cap  = dateParts(data.ngay_cap);

  let pageNum = 1;

  return (
    <>
      {/* ═══ TRANG 1: Thông tin các bên + Điều 1-2 ═══ */}
      <A4Page pageNum={pageNum++} headerText="03.HĐLĐ - ACE">
        <div className="top-grid">
          <div className="left-block">
            <p className="bold center">CÔNG TY TNHH PHÁT TRIỂN<br/>GIÁO DỤC ACE</p>
            <p className="center">
              Số: <span className="red">{data.so_hd ? soHdBase(data.so_hd) : '.../26'}</span>/HĐLĐ-ACE
            </p>
          </div>
          <div className="right-block">
            <p className="country-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="country-title">Độc lập – Tự do – Hạnh phúc</p>
          </div>
        </div>

        <p className="italic">- Căn cứ Bộ luật Lao động số 45/2019/QH14 ngày 20 tháng 11 năm 2019;</p>
        <p className="italic">- Căn cứ Nghị định số 145/2020/NĐ-CP ngày 14 tháng 12 năm 2020 của Chính phủ quy định chi tiết và hướng dẫn thi hành một số điều của Bộ luật Lao động;</p>
        <p className="italic gap">- Căn cứ Nội quy lao động và nhu cầu sử dụng lao động thực tế của Công ty;</p>

        <div className="main-title">HỢP ĐỒNG LAO ĐỘNG</div>

        <p className="italic">
          Hôm nay, ngày <span className="red">{ky.d}</span> tháng <span className="red">{ky.m}</span> năm {ky.y},
          tại Thành phố Hồ Chí Minh, Chúng tôi gồm có:
        </p>

        <p className="bold">Bên A (Người sử dụng lao động): CÔNG TY TNHH PHÁT TRIỂN GIÁO DỤC ACE</p>
        <p>Địa chỉ: Số 201, Lê Lợi, xã Xuân Thới Sơn, Thành phố Hồ Chí Minh</p>
        <p>Mã Số doanh nghiệp/ mã số Thuế: 0318914647</p>
        <p>Đại diện pháp luật: Bà <span className="bold">TRƯƠNG KIỀU OANH</span></p>
        <p>Chức vụ: Giám đốc</p>
        <p className="small-gap">Điện thoại: 0909259555</p>
        <p className="gap">&nbsp;</p>

        <p>
          <span className="bold">Bên B (Người lao động):</span> Ông/Bà:{' '}
          <span className="red bold uppercase">{data.ho_ten || '..............................'}</span>
        </p>
        <p>Quốc tịch: {data.quoc_tich} sinh ngày: <V v={`${sinh.d}/${sinh.m}/${sinh.y}`}/> tại: <V v={data.noi_sinh}/></p>
        <p>Số CMND/CCCD: <V v={data.cccd}/> do {data.noi_cap}, cấp ngày: <V v={`${cap.d}/${cap.m}/${cap.y}`}/>.</p>
        <p>Số điện thoại: <V v={data.so_dien_thoai}/></p>
        <p>Email: <V v={data.email}/></p>
        <p>Địa chỉ thường trú: <V v={data.dia_chi}/></p>
        <p className="small-gap">Địa chỉ tạm trú: <V v={data.tam_tru}/></p>
        <p className="gap">&nbsp;</p>

        <p className="italic">Thỏa thuận ký kết hợp đồng lao động và cam kết thực hiện đúng những điều khoản sau:</p>
        <p className="section-title">Điều 1: Thời hạn và công việc hợp đồng</p>
        <p>Loại hợp đồng: {contractVariant?.desc || 'Hợp đồng lao động không xác định thời hạn'}.</p>
        <p>- Thời gian làm việc chính thức: từ ngày <V v={`${tu.d}/${tu.m}/${tu.y}`} /></p>
        <p>- Địa điểm làm việc: Công Ty TNHH Phát Triển Giáo Dục ACE <span className="italic">(kèm theo)</span></p>
        <p>- Chức danh chuyên môn: <V v={data.chuc_vu}/></p>
        <p>- Công việc theo sự phân công.</p>
        <p className="section-title">Điều 2: Chế độ làm việc</p>
      </A4Page>

      {/* ═══ TRANG 2: Điều 2-3 ═══ */}
      <A4Page pageNum={pageNum++} headerText="03.HĐLĐ - ACE">
        <p><span className="bold">2.1.</span> Thời gian làm việc: 8 tiếng/ ngày; theo nội quy công ty.</p>
        <p className="gap"><span className="bold">2.2.</span> Đồng phục và các trang thiết bị làm việc sẽ được công ty cấp phát tùy theo nhu cầu của công việc</p>

        <p className="section-title">Điều 3: Nghĩa vụ và quyền lợi của Bên B</p>
        <p className="bold">3.1. Quyền lợi</p>
        <p className="bold">3.1.1. Tiền lương và hình thức trả lương</p>
        <p>Mức lương cơ bản: <V v={data.luong}/> đồng/tháng.</p>
        <p>(Số tiền bằng chữ: <V v={data.luong_chu}/>)</p>
        <p><span className="bold">3.1.2.</span> Phụ cấp khác:</p>
        <p className="indent-1">- Phụ cấp chỗ ở: <V v={data.phu_cap_cho_o || '0'} /> đồng/tháng</p>
        <p className="indent-1">- Phụ cấp đi lại: <V v={data.phu_cap_di_lai || '0'} /> đồng/tháng</p>
        <p className="indent-1">- Phụ cấp điện thoại: <V v={data.phu_cap_dt || '0'} /> đồng/tháng</p>
        <p className="indent-1">- Thưởng thêm khác theo quy định.</p>
        <p>- Hình thức trả lương: Tiền lương được thanh toán vào ngày 10 hàng tháng bằng chuyển khoản.</p>

        <p className="bold">3.1.3. Các quyền lợi khác</p>
        <p>- Được tham gia Bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp theo quy định.</p>
        <p>- Chế độ nâng lương: Theo chính sách nâng lương của công ty</p>
        <p>- Chế độ ngày nghỉ: Nghỉ lễ có hưởng lương trong năm: Tết Dương Lịch (01 ngày), Giờ tổ Hùng Vương (01 ngày), 30/04 (01 ngày), 01/05 (01 ngày), 02/09 (02 ngày), Tết Âm lịch. Phép năm: 12 ngày/năm.</p>
        <p>- Các chế độ khác:</p>
        <p className="indent-1">+ Tham gia các khóa đào tạo chuyên môn của công ty.</p>
      </A4Page>

      {/* ═══ TRANG 3: Điều 3-4 ═══ */}
      <A4Page pageNum={pageNum++} headerText="03.HĐLĐ - ACE">
        <p className="indent-1 gap">+ Nhân viên làm việc từ tháng thứ 03 trở về sau được xét thưởng thêm.</p>

        <p className="bold">3.2. Nghĩa vụ</p>
        <p><span className="bold">3.2.1.</span> Cam kết chấp hành nghiêm túc nội quy lao động, các thỏa thuận, quy chế của Công ty.</p>
        <p><span className="bold">3.2.2.</span> Trong quá trình làm việc, Bên B có nghĩa vụ:</p>
        <p className="indent-1">Đảm bảo đúng thời gian làm việc, chất lượng giảng dạy, chăm sóc học viên sát sao;</p>
        <p className="indent-1">Tạo dựng môi trường học tập an toàn, tích cực, công bằng và nhân văn cho tất cả học viên;</p>
        <p className="indent-1">Ứng xử văn minh, tôn trọng học viên.</p>
        <p><span className="bold">3.2.3.</span> Chấp hành việc điều động, luân chuyển theo phân công công việc.</p>
        <p><span className="bold">3.2.4.</span> Khi xin nghỉ việc, phải thông báo trước tối thiểu 45 ngày theo quy định tại Điều 35 BLLĐ 2019 và có trách nhiệm bàn giao đầy đủ công việc.</p>
        <p className="gap"><span className="bold">3.2.5.</span> Cam kết bảo mật mọi thông tin do Bên A cung cấp.</p>

        <p className="section-title">Điều 4: Nghĩa vụ và quyền hạn của Bên A</p>
        <p className="bold">4.1 Nghĩa vụ</p>
        <p><span className="bold">4.1.1.</span> Bảo đảm việc làm và thực hiện đầy đủ cam kết trong HĐLĐ.</p>
        <p><span className="bold">4.1.2.</span> Thanh toán lương đầy đủ, đúng thời hạn.</p>
        <p><span className="bold">4.1.3.</span> Trường hợp bất khả kháng phải tạm ngưng hoạt động, công ty ngưng trả lương và hỗ trợ dựa trên tình hình thực tế.</p>
        <p className="bold">4.2 Quyền hạn</p>
        <p><span className="bold">4.2.1.</span> Điều hành và đánh giá nhân viên.</p>
      </A4Page>

      {/* ═══ TRANG 4: Điều 4-5 ═══ */}
      <A4Page pageNum={pageNum++} headerText="03.HĐLĐ - ACE">
        <p><span className="bold">4.2.2.</span> Quyền tạm hoãn, chấm dứt Hợp đồng khi Bên B vi phạm kỷ luật.</p>
        <p>Bên B phải bồi thường những thiệt hại (nếu có) theo nguyên tắc BLLĐ.</p>

        <p className="section-title">Điều 5: Điều khoản chung</p>
        <p>Trong các trường hợp bất khả kháng, hai bên sẽ chấm dứt Hợp đồng lao động mà không phải đền bù.</p>
        <p>Tranh chấp giải quyết trên tinh thần hòa giải hoặc thỏa thuận. Nếu không giải quyết được sẽ kiện ra Tòa án Việt Nam.</p>
      </A4Page>

      {/* ═══ TRANG 5: Điều khoản chung + Chữ ký ═══ */}
      <A4Page pageNum={pageNum++} headerText="03.HĐLĐ - ACE">
        <p>Hợp đồng này được lập bằng tiếng Việt Nam, theo quy định của Luật pháp Việt Nam.</p>
        <p>Thuế thu nhập cá nhân: Bên A có trách nhiệm khấu trừ thuế TNCN theo pháp luật trước khi thanh toán cho Bên B.</p>
        <p className="gap">Hai Bên cùng đọc, hiểu và đồng thuận tự nguyện ký hợp đồng.</p>
        <p>Hợp đồng lao động này làm thành 03 bản, Bên A giữ 02 bản, Bên B giữ 01 bản, hiệu lực từ ngày ký./.</p>

        <div className="signature-grid">
          <div>
            <p>NGƯỜI SỬ DỤNG LAO ĐỘNG</p>
            <p>(Ký tên, đóng dấu và ghi rõ họ và tên)</p>
            <div className="signature-space"></div>
            <p>TRƯƠNG KIỀU OANH</p>
          </div>
          <div>
            <p>NGƯỜI LAO ĐỘNG</p>
            <p>(Ký và ghi rõ họ và tên)</p>
            <div className="signature-space"></div>
            <p className="uppercase">{data.ho_ten || '.........................'}</p>
          </div>
        </div>
      </A4Page>
    </>
  );
}
