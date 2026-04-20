const fs = require('fs');
const path = 'd:/OneDrive/ACE/APP/task 2/Task_manager/src/components/views/PersonnelMovementView.jsx';
let content = fs.readFileSync(path, 'utf8');

const mapping = {
  'Vá»‹ trÃ­': 'Vị trí',
  'hiá»‡n táº¡i': 'hiện tại',
  'PhÃ²ng ban': 'Phòng ban',
  'má»›i': 'mới',
  'nhÃ¢n viÃªn': 'nhân viên',
  'Chá» n': 'Chọn',
  'Biáº¿n Ä‘á»™ng': 'Biến động',
  'NhÃ¢n sá»±': 'Nhân sự',
  'HÃ nh chÃ­nh': 'Hành chính',
  'BÃ¡o tÄƒng': 'Báo tăng',
  'quy trÃ­nh': 'quy trình',
  'tá»± Ä‘á»™ng': 'tự động',
  'há»“ sÆ¡': 'hồ sơ',
  'chi nhÃ¡nh': 'chi nhánh'
};

for (const [key, value] of Object.entries(mapping)) {
  content = content.split(key).join(value);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed encoding for ' + path);
