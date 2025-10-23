#!/usr/bin/env node
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);
console.log('file://' + process.argv[1]);
console.log('Match:', import.meta.url === `file://${process.argv[1]}`);

// Try with fileURLToPath
import { fileURLToPath } from 'url';
import { normalize } from 'path';

if (import.meta.url) {
  const __filename = fileURLToPath(import.meta.url);
  console.log('__filename:', __filename);
  console.log('normalized argv[1]:', normalize(process.argv[1]));
  console.log('Match normalized:', __filename === normalize(process.argv[1]));
}
