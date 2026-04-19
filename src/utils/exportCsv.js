export const downloadCSV = (data, filename) => {
  if (!data || !data.length) {
    alert("Không có dữ liệu để xuất");
    return;
  }
  
  // Get all keys from the first object as headers
  const headers = Object.keys(data[0]);
  
  // Create CSV content: headers row + data rows
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  for (const row of data) {
    const values = headers.map(header => {
      const escaped = ('' + (row[header] || '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvString = csvRows.join('\n');
  
  // Add BOM for UTF-8 support in Excel
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const docUrl = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = docUrl;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
