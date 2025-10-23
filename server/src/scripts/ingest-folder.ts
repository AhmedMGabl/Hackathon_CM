#!/usr/bin/env node
/**
 * CLI Ingestion Script
 * Ingests all Excel files from ./Excel Sheets of What We Will Upload/
 * Usage: npm run ingest:folder
 */

import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { autoTransform, type TransformResult } from '../etl/transformers.js';
import { mergeTransformResults, validateMergedData, type MergeResult } from '../etl/merger.js';
import { persistMetrics, createUploadRecord, disconnect } from '../etl/persistence.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_FOLDER = path.resolve(__dirname, '../../../Excel Sheets of What We Will Upload');
const REPORTS_FOLDER = path.resolve(__dirname, '../../../ingestion-reports');

export interface IngestionReport {
  timestamp: string;
  folder: string;
  sources: Array<{
    source: string;
    files: string[];
    received: number;
    accepted: number;
    updated: number;
    skippedDuplicate: number;
    rejected: Array<{ file: string; row: number; reason: string }>;
    columnsDetected: string[];
    columnsMapped?: Record<string, string>;
  }>;
  totals: {
    filesProcessed: number;
    received: number;
    accepted: number;
    updated: number;
    created: number;
    skippedDuplicate: number;
    rejected: number;
  };
  coverage: {
    CC?: number;
    SC?: number;
    UP?: number;
    Fixed?: number;
    Referral?: number;
    Leads?: number;
  };
  mentorCount: number;
  teamCount: number;
  errors: string[];
  duration: number;
}

/**
 * Main ingestion function
 */
async function ingestFolder(): Promise<IngestionReport> {
  const startTime = Date.now();

  console.log(`\n🚀 CMetrics Folder Ingestion`);
  console.log(`📁 Folder: ${EXCEL_FOLDER}\n`);

  // Check if folder exists
  if (!fs.existsSync(EXCEL_FOLDER)) {
    throw new Error(`Folder not found: ${EXCEL_FOLDER}`);
  }

  // Create reports folder if it doesn't exist
  if (!fs.existsSync(REPORTS_FOLDER)) {
    fs.mkdirSync(REPORTS_FOLDER, { recursive: true });
  }

  // Find all Excel files
  const files = fs.readdirSync(EXCEL_FOLDER)
    .filter(f => f.match(/\.(xlsx?|xls)$/i))
    .map(f => path.join(EXCEL_FOLDER, f));

  if (files.length === 0) {
    console.log('⚠️  No Excel files found in folder');
    return createEmptyReport();
  }

  console.log(`📊 Found ${files.length} Excel file(s):\n`);
  files.forEach(f => console.log(`   - ${path.basename(f)}`));
  console.log('');

  // Transform each file
  const transformResults: TransformResult[] = [];
  const errors: string[] = [];

  for (const filePath of files) {
    try {
      console.log(`Processing: ${path.basename(filePath)}...`);

      const workbook = XLSX.readFile(filePath);
      const result = autoTransform(workbook, path.basename(filePath));

      if (result) {
        transformResults.push(result);
        console.log(`  ✓ Detected: ${result.source}, ${result.accepted.length} rows accepted, ${result.rejected.length} rejected`);
      } else {
        errors.push(`Unable to detect source type for ${path.basename(filePath)}`);
        console.log(`  ✗ Unable to detect source type`);
      }
    } catch (error) {
      const errorMsg = `Failed to process ${path.basename(filePath)}: ${error instanceof Error ? error.message : 'Unknown'}`;
      errors.push(errorMsg);
      console.error(`  ✗ ${errorMsg}`);
    }
  }

  console.log('');

  if (transformResults.length === 0) {
    console.log('❌ No files were successfully processed');
    return createEmptyReport();
  }

  // Merge results
  console.log('🔄 Merging multi-source data...');
  const mergeResult = mergeTransformResults(transformResults);
  console.log(`  ✓ Merged ${mergeResult.merged.length} metric records for ${mergeResult.mentorCount} mentors`);
  console.log('');

  // Validate merged data
  console.log('✓ Validating merged data...');
  const { valid, invalid } = validateMergedData(mergeResult.merged);

  if (invalid.length > 0) {
    console.log(`  ⚠️  ${invalid.length} invalid records (will be skipped):`);
    invalid.forEach(({ mentor, reason }) => {
      console.log(`     - ${mentor}: ${reason}`);
      errors.push(`Invalid data for ${mentor}: ${reason}`);
    });
    console.log('');
  }

  console.log(`  ✓ ${valid.length} valid records ready for persistence`);
  console.log('');

  // Persist to database
  console.log('💾 Persisting to database...');
  const uploadId = await createUploadRecord({
    source: 'folder_ingestion',
    sourceDetail: EXCEL_FOLDER,
    status: 'SUCCESS',
    recordsProcessed: mergeResult.merged.length,
    recordsAccepted: valid.length,
    recordsRejected: invalid.length,
    recordsUpdated: 0,
    recordsCreated: 0,
    meta: {
      files: files.map(f => path.basename(f)),
      sources: transformResults.map(r => r.source)
    },
    errors: errors.map(e => ({ message: e }))
  });

  const persistResult = await persistMetrics(valid, uploadId);

  console.log(`  ✓ Created: ${persistResult.created}`);
  console.log(`  ✓ Updated: ${persistResult.updated}`);
  console.log(`  ✓ Skipped (duplicate): ${persistResult.skippedDuplicate}`);

  if (persistResult.errors.length > 0) {
    console.log(`  ⚠️  Errors: ${persistResult.errors.length}`);
    persistResult.errors.forEach(({ mentor, reason }) => {
      console.log(`     - ${mentor}: ${reason}`);
      errors.push(`Persistence error for ${mentor}: ${reason}`);
    });
  }

  console.log('');

  // Update upload record with final counts
  await createUploadRecord({
    source: 'folder_ingestion',
    sourceDetail: EXCEL_FOLDER,
    status: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
    recordsProcessed: mergeResult.merged.length,
    recordsAccepted: valid.length,
    recordsRejected: invalid.length + persistResult.errors.length,
    recordsUpdated: persistResult.updated,
    recordsCreated: persistResult.created,
    meta: {
      files: files.map(f => path.basename(f)),
      sources: transformResults.map(r => r.source),
      coverage: mergeResult.coverage
    },
    errors: errors.map(e => ({ message: e }))
  });

  // Build report
  const report: IngestionReport = {
    timestamp: new Date().toISOString(),
    folder: EXCEL_FOLDER,
    sources: transformResults.map(r => ({
      source: r.source,
      files: [r.file],
      received: r.received,
      accepted: r.accepted.length,
      updated: 0,
      skippedDuplicate: 0,
      rejected: r.rejected.map(rej => ({
        file: r.file,
        row: rej.row,
        reason: rej.reason
      })),
      columnsDetected: r.columnsDetected,
      columnsMapped: r.columnsMapped
    })),
    totals: {
      filesProcessed: files.length,
      received: transformResults.reduce((sum, r) => sum + r.received, 0),
      accepted: valid.length,
      updated: persistResult.updated,
      created: persistResult.created,
      skippedDuplicate: persistResult.skippedDuplicate,
      rejected: invalid.length + persistResult.errors.length
    },
    coverage: mergeResult.coverage,
    mentorCount: mergeResult.mentorCount,
    teamCount: mergeResult.teamMapping.size,
    errors,
    duration: Date.now() - startTime
  };

  // Save report to file
  const reportFilename = `ingestion-${Date.now()}.json`;
  const reportPath = path.join(REPORTS_FOLDER, reportFilename);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`📄 Report saved: ${reportPath}`);
  console.log('');

  // Summary
  console.log('✅ Ingestion Complete!');
  console.log(`   Duration: ${(report.duration / 1000).toFixed(2)}s`);
  console.log(`   Mentors: ${report.mentorCount}`);
  console.log(`   Teams: ${report.teamCount}`);
  console.log(`   Records Created: ${report.totals.created}`);
  console.log(`   Records Updated: ${report.totals.updated}`);
  console.log(`   Skipped (duplicate): ${report.totals.skippedDuplicate}`);
  if (report.totals.rejected > 0) {
    console.log(`   ⚠️  Rejected: ${report.totals.rejected}`);
  }
  console.log('');

  // Coverage
  console.log('📊 Coverage:');
  Object.entries(report.coverage).forEach(([metric, pct]) => {
    const bar = '█'.repeat(Math.floor((pct || 0) / 5));
    console.log(`   ${metric.padEnd(10)}: ${bar} ${pct}%`);
  });
  console.log('');

  return report;
}

/**
 * Create empty report for error cases
 */
function createEmptyReport(): IngestionReport {
  return {
    timestamp: new Date().toISOString(),
    folder: EXCEL_FOLDER,
    sources: [],
    totals: {
      filesProcessed: 0,
      received: 0,
      accepted: 0,
      updated: 0,
      created: 0,
      skippedDuplicate: 0,
      rejected: 0
    },
    coverage: {},
    mentorCount: 0,
    teamCount: 0,
    errors: [],
    duration: 0
  };
}

// Run if called directly
// Use fileURLToPath for cross-platform compatibility (Windows backslashes vs Unix forward slashes)
if (import.meta.url && process.argv[1]) {
  const currentFile = fileURLToPath(import.meta.url);
  const calledFile = path.normalize(process.argv[1]);

  if (currentFile === calledFile) {
    ingestFolder()
      .then(() => {
        disconnect();
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Fatal Error:', error);
        disconnect();
        process.exit(1);
      });
  }
}

export { ingestFolder };
