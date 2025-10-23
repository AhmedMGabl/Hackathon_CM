#!/usr/bin/env node
import XLSX from 'xlsx';

const files = ['CCtest.xlsx', 'CM teams  (1).xlsx'];

for (const filename of files) {
  console.log(`\n========== ${filename} ==========`);

  const workbook = XLSX.readFile(`../Excel Sheets of What We Will Upload/${filename}`);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Read as array of arrays to see all rows
  const arrayData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

  console.log(`Total rows: ${arrayData.length}\n`);

  // Show first 10 rows
  for (let i = 0; i < Math.min(10, arrayData.length); i++) {
    console.log(`Row ${i}:`, arrayData[i]);
  }
}
