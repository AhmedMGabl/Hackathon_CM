#!/usr/bin/env node
import { detectSourceType } from './src/etl/header-mapping.js';

// CCtest.xlsx row 4 headers
const ccHeaders = ['Team ', null, '#', 'Name', 'Number_of_students', 'Avg_class_consumption', 'M1-M4 Super_class_consumption', 'Excellent Student Rate', '>=8', 'Number of Finished students >=12 class consumption', '>=12', '>=15', '>=20', '0_class_consumption', '1-7', '8-11', '12-14', '15-19'];

// CM teams row 3 headers
const cmTeamsHeaders = ['Team', 'CM Name', 'leads', 'leads ach%', 'APP', 'APP%', 'Show up', 'Show up %', 'Paid', 'PAIDS ACH'];

console.log('CCtest.xlsx headers:');
console.log('  Headers:', ccHeaders);
console.log('  Detected:', detectSourceType(ccHeaders.map(h => h === null ? '' : String(h))));

console.log('\nCM teams headers:');
console.log('  Headers:', cmTeamsHeaders);
console.log('  Detected:', detectSourceType(cmTeamsHeaders));
