export const downloadCSV = (data, filename) => {
  if (!data || !data.length) {
    alert("Không có dữ liệu để xuất");
    return;
  }

  const headers = Object.keys(data[0]);

  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header];

      // ✅ Handle null / undefined
      if (value === null || value === undefined) return '""';

      // ✅ Format Date
      if (value instanceof Date) {
        value = value.toLocaleDateString('vi-VN');
      }

      // ✅ Convert object → JSON string
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      // ✅ Escape dấu "
      const escaped = String(value).replace(/"/g, '""');

      return `"${escaped}"`;
    });

    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');

  const blob = new Blob(['\uFEFF' + csvString], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // ✅ cleanup
  URL.revokeObjectURL(url);
};export const downloadCSV = (data, filename) => {
  if (!data || !data.length) {
    alert("Không có dữ liệu để xuất");
    return;
  }

  const headers = Object.keys(data[0]);

  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header];

      // ✅ Handle null / undefined
      if (value === null || value === undefined) return '""';

      // ✅ Format Date
      if (value instanceof Date) {
        value = value.toLocaleDateString('vi-VN');
      }

      // ✅ Convert object → JSON string
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      // ✅ Escape dấu "
      const escaped = String(value).replace(/"/g, '""');

      return `"${escaped}"`;
    });

    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');

  const blob = new Blob(['\uFEFF' + csvString], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // ✅ cleanup
  URL.revokeObjectURL(url);
};