const XLSX = require('xlsx');
const path = require('path');

// Read CM teams file
const filepath = path.join('example sheets of what we will upload', 'CM teams  (1).xlsx');
const workbook = XLSX.readFile(filepath);
const sheet = workbook.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('=== CM TEAMS STRUCTURE (First 50 rows) ===\n');
data.slice(0, 50).forEach((row, idx) => {
  console.log(`Row ${idx}: ${JSON.stringify(row)}`);
});

console.log('\n\n=== CC TEST STRUCTURE (First 30 rows) ===\n');
const ccPath = path.join('example sheets of what we will upload', 'CCtest.xlsx');
const ccWorkbook = XLSX.readFile(ccPath);
const ccSheet = ccWorkbook.Sheets['ME (2)'];
const ccData = XLSX.utils.sheet_to_json(ccSheet, { header: 1, defval: '' });

ccData.slice(0, 30).forEach((row, idx) => {
  console.log(`Row ${idx}: ${JSON.stringify(row)}`);
});

console.log('\n\n=== UPGRADE RATE STRUCTURE (First 20 rows) ===\n');
const upPath = path.join('example sheets of what we will upload', '[CM]Middle East M-2 Cumulative Upgrade Rate_CM_20250921_1135(1).xlsx');
const upWorkbook = XLSX.readFile(upPath);
const upSheet = upWorkbook.Sheets['CM'];
const upData = XLSX.utils.sheet_to_json(upSheet, { header: 1, defval: '' });

upData.slice(0, 20).forEach((row, idx) => {
  console.log(`Row ${idx}: ${JSON.stringify(row)}`);
});
