/**
 * contracts/index.js
 * Barrel export cho tất cả HTML contract templates.
 *
 * Cách thêm template mới:
 * 1. Tạo file Hdld[TênTemplate]Template.jsx trong thư mục này
 * 2. Export default component nhận { data, contractVariant }
 * 3. Import và re-export ở đây
 * 4. Dùng trong ContractPreview theo contractVariant.id
 */

export { default as HdldFtTemplate }   from './HdldFtTemplate';
export { default as HdldBaseTemplate } from './HdldBaseTemplate';

/**
 * Ví dụ thêm template mới:
 *
 * // File: HdldThuViecTemplate.jsx — Hợp đồng thử việc
 * export { default as HdldThuViecTemplate } from './HdldThuViecTemplate';
 *
 * // File: HdldPartTimeTemplate.jsx — Hợp đồng part-time
 * export { default as HdldPartTimeTemplate } from './HdldPartTimeTemplate';
 *
 * // File: HdldCtvTemplate.jsx — Hợp đồng cộng tác viên
 * export { default as HdldCtvTemplate } from './HdldCtvTemplate';
 */
