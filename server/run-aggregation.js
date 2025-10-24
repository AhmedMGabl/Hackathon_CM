import { postIngestion } from './src/scripts/post-ingestion.ts';

console.log('Running aggregation...\n');
postIngestion().then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
