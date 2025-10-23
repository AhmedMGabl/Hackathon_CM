#!/usr/bin/env node
import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { detectSourceType } from './src/etl/header-mapping.js';

const EXCEL_FOLDER = '../Excel Sheets of What We Will Upload';

const files = fs.readdirSync(EXCEL_FOLDER)
  .filter(f => f.match(/\.(xlsx?|xls)$/i))
  .map(f => path.join(EXCEL_FOLDER, f));

for (const filePath of files) {
  console.log(`\n========== ${path.basename(filePath)} ==========`);

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (rawData.length > 0) {
    const headers = Object.keys(rawData[0]);
    console.log('Headers:', headers);
    console.log('Detected type:', detectSourceType(headers));
    console.log('Sample row:', rawData[0]);
  }
}
