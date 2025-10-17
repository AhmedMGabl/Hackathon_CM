const XLSX = require('xlsx');
const path = require('path');

const files = [
  'CM teams  (1).xlsx',
  'CCtest.xlsx',
  'FTtest.xlsx',
  '1410Leads.xlsx',
  '[CM]Middle East M-2 Cumulative Upgrade Rate_CM_20250921_1135(1).xlsx'
];

console.log('=== ANALYZING EXCEL FILES ===\n');

files.forEach(filename => {
  try {
    const filepath = path.join('example sheets of what we will upload', filename);
    const workbook = XLSX.readFile(filepath);

    console.log(`\n📊 FILE: ${filename}`);
    console.log(`Sheets: ${workbook.SheetNames.join(', ')}\n`);

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      console.log(`  📄 Sheet: ${sheetName}`);
      console.log(`  Rows: ${data.length}`);

      if (data.length > 0) {
        console.log(`  Headers: ${JSON.stringify(data[0])}`);
        if (data.length > 1) {
          console.log(`  Sample Row: ${JSON.stringify(data[1])}`);
        }
      }
      console.log('');
    });

    console.log('─'.repeat(80));
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
  }
});
