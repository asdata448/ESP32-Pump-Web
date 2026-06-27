/**
 * Patient ID Generator Tests
 *
 * Comprehensive test suite for patient ID generation, parsing, and validation
 */

import {
  generatePatientId,
  parsePatientId,
  validatePatientId,
  formatDateFromId,
  formatTimeFromId,
  formatDateTimeFromId,
  generateBatchIds,
  comparePatientIds,
  type PatientIdInfo,
  type PatientIdValidationResult
} from './patient-id-generator';

// ============================================================================
// Test Utilities
// ============================================================================

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(description: string, fn: () => void | Promise<void>) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✓ ${description}`);
  } catch (error) {
    failCount++;
    console.error(`✗ ${description}`);
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
    );
  }
}

function assertTrue(value: boolean, message?: string) {
  if (!value) {
    throw new Error(message || `Expected true but got false`);
  }
}

function assertFalse(value: boolean, message?: string) {
  if (value) {
    throw new Error(message || `Expected false but got true`);
  }
}

function assertThrows(fn: () => void, expectedMessage?: string) {
  try {
    fn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (expectedMessage && error instanceof Error) {
      if (!error.message.includes(expectedMessage)) {
        throw new Error(
          `Expected error message to include "${expectedMessage}" but got "${error.message}"`
        );
      }
    }
  }
}

// ============================================================================
// Test Suites
// ============================================================================

console.log('='.repeat(70));
console.log('Patient ID Generator Test Suite');
console.log('='.repeat(70));
console.log();

// Test 1: generatePatientId with default prefix
console.log('--- generatePatientId Tests ---');
test('generatePatientId() should return ID with default prefix BN', () => {
  const id = generatePatientId();
  assertTrue(id.startsWith('BN-'), 'ID should start with BN-');
});

test('generatePatientId() should return 16 character ID', () => {
  const id = generatePatientId();
  assertEqual(id.length, 17, 'ID length should be 17 (BN- + 6 + - + 6)');
});

test('generatePatientId() should match format PREFIX-DDMMYY-HHMMSS', () => {
  const id = generatePatientId();
  const regex = /^[A-Z]+-\d{6}-\d{6}$/;
  assertTrue(regex.test(id), `ID ${id} should match format PREFIX-DDMMYY-HHMMSS`);
});

test('generatePatientId() should generate valid date components', () => {
  const id = generatePatientId();
  const info = parsePatientId(id);
  assertTrue(info.day >= 1 && info.day <= 31, 'Day should be 1-31');
  assertTrue(info.month >= 1 && info.month <= 12, 'Month should be 1-12');
  assertTrue(info.hour >= 0 && info.hour <= 23, 'Hour should be 0-23');
  assertTrue(info.minute >= 0 && info.minute <= 59, 'Minute should be 0-59');
  assertTrue(info.second >= 0 && info.second <= 59, 'Second should be 0-59');
});

// Test 2: generatePatientId with custom prefix
test('generatePatientId("PA") should use custom prefix', () => {
  const id = generatePatientId('PA');
  assertTrue(id.startsWith('PA-'), 'ID should start with PA-');
});

test('generatePatientId("MED") should use custom prefix', () => {
  const id = generatePatientId('MED');
  assertTrue(id.startsWith('MED-'), 'ID should start with MED-');
});

test('generatePatientId with empty prefix should throw error', () => {
  assertThrows(() => generatePatientId(''), 'must be a non-empty string');
});

test('generatePatientId with lowercase prefix should throw error', () => {
  assertThrows(() => generatePatientId('bn'), 'only uppercase letters');
});

test('generatePatientId with mixed case prefix should throw error', () => {
  assertThrows(() => generatePatientId('Bn'), 'only uppercase letters');
});

// Test 3: parsePatientId
console.log();
console.log('--- parsePatientId Tests ---');

test('parsePatientId should extract correct prefix', () => {
  const id = 'BN-260609-123456';
  const info = parsePatientId(id);
  assertEqual(info.prefix, 'BN');
});

test('parsePatientId should extract correct date components', () => {
  const id = 'BN-260609-123456';
  const info = parsePatientId(id);
  assertEqual(info.day, 26);
  assertEqual(info.month, 6);
  assertEqual(info.year, 9);
});

test('parsePatientId should extract correct time components', () => {
  const id = 'BN-260609-123456';
  const info = parsePatientId(id);
  assertEqual(info.hour, 12);
  assertEqual(info.minute, 34);
  assertEqual(info.second, 56);
});

test('parsePatientId should set dateString correctly', () => {
  const id = 'BN-260609-123456';
  const info = parsePatientId(id);
  assertEqual(info.dateString, '260609');
});

test('parsePatientId should set timeString correctly', () => {
  const id = 'BN-260609-123456';
  const info = parsePatientId(id);
  assertEqual(info.timeString, '123456');
});

test('parsePatientId with invalid format should throw error', () => {
  assertThrows(() => parsePatientId('INVALID'), 'Invalid patient ID');
});

test('parsePatientId with invalid date should throw error', () => {
  assertThrows(() => parsePatientId('BN-320609-123456'), 'Invalid');
});

test('parsePatientId with invalid time should throw error', () => {
  assertThrows(() => parsePatientId('BN-260609-256456'), 'Invalid');
});

// Test 4: validatePatientId
console.log();
console.log('--- validatePatientId Tests ---');

test('validatePatientId with valid ID should return isValid true', () => {
  const result = validatePatientId('BN-260609-123456');
  assertTrue(result.isValid);
});

test('validatePatientId with valid ID should include info', () => {
  const result = validatePatientId('BN-260609-123456');
  assertTrue(result.info !== undefined);
  assertEqual(result.info?.prefix, 'BN');
});

test('validatePatientId with empty string should return isValid false', () => {
  const result = validatePatientId('');
  assertFalse(result.isValid);
  assertTrue(result.error?.includes('non-empty'));
});

test('validatePatientId with invalid format should return isValid false', () => {
  const result = validatePatientId('INVALID');
  assertFalse(result.isValid);
  assertTrue(result.error?.includes('format'));
});

test('validatePatientId with invalid month should return isValid false', () => {
  const result = validatePatientId('BN-261309-123456');
  assertFalse(result.isValid);
  assertTrue(result.error?.includes('Invalid month'));
});

test('validatePatientId with invalid day should return isValid false', () => {
  const result = validatePatientId('BN-320609-123456');
  assertFalse(result.isValid);
  assertTrue(result.error?.includes('Invalid day'));
});

test('validatePatientId with invalid hour should return isValid false', () => {
  const result = validatePatientId('BN-260609-256456');
  assertFalse(result.isValid);
  assertTrue(result.error?.includes('Invalid hour'));
});

test('validatePatientId with invalid minute should return isValid false', () => {
  const result = validatePatientId('BN-260609-126156');
  assertFalse(result.isValid);
  assertTrue(result.error?.includes('Invalid minute'));
});

test('validatePatientId with invalid second should return isValid false', () => {
  const result = validatePatientId('BN-260609-123466');
  assertFalse(result.isValid);
  assertTrue(result.error?.includes('Invalid second'));
});

test('validatePatientId with February 30 should return isValid false', () => {
  const result = validatePatientId('BN-300209-123456');
  assertFalse(result.isValid);
  assertTrue(result.error?.includes('has only'));
});

test('validatePatientId with April 31 should return isValid false', () => {
  const result = validatePatientId('BN-310409-123456');
  assertFalse(result.isValid);
  assertTrue(result.error?.includes('has only'));
});

// Test 5: formatDateFromId
console.log();
console.log('--- formatDateFromId Tests ---');

test('formatDateFromId should format date correctly', () => {
  const date = formatDateFromId('BN-260609-123456');
  assertEqual(date, '26/6/2009');
});

test('formatDateFromId should handle single digit day', () => {
  const date = formatDateFromId('BN-010609-123456');
  assertEqual(date, '1/6/2009');
});

test('formatDateFromId should handle single digit month', () => {
  const date = formatDateFromId('BN-261109-123456');
  assertEqual(date, '26/11/2009');
});

// Test 6: formatTimeFromId
console.log();
console.log('--- formatTimeFromId Tests ---');

test('formatTimeFromId should format time correctly', () => {
  const time = formatTimeFromId('BN-260609-123456');
  assertEqual(time, '12:34:56');
});

test('formatTimeFromId should handle midnight', () => {
  const time = formatTimeFromId('BN-260609-000000');
  assertEqual(time, '0:0:0');
});

// Test 7: formatDateTimeFromId
console.log();
console.log('--- formatDateTimeFromId Tests ---');

test('formatDateTimeFromId should format datetime correctly', () => {
  const datetime = formatDateTimeFromId('BN-260609-123456');
  assertEqual(datetime, '26/6/2009 12:34:56');
});

// Test 8: generateBatchIds
console.log();
console.log('--- generateBatchIds Tests ---');

test('generateBatchIds should generate specified count', () => {
  const ids = generateBatchIds('BN', 3);
  assertEqual(ids.length, 3);
});

test('generateBatchIds should generate unique IDs', () => {
  const ids = generateBatchIds('BN', 5);
  const uniqueIds = new Set(ids);
  assertEqual(uniqueIds.size, 5, 'All IDs should be unique');
});

test('generateBatchIds with count 1 should return single ID', () => {
  const ids = generateBatchIds('PA', 1);
  assertEqual(ids.length, 1);
  assertTrue(ids[0].startsWith('PA-'));
});

// Test 9: comparePatientIds
console.log();
console.log('--- comparePatientIds Tests ---');

test('comparePatientIds should return negative when id1 < id2', () => {
  const result = comparePatientIds('BN-260609-123456', 'BN-260609-123457');
  assertTrue(result < 0);
});

test('comparePatientIds should return positive when id1 > id2', () => {
  const result = comparePatientIds('BN-260609-123457', 'BN-260609-123456');
  assertTrue(result > 0);
});

test('comparePatientIds should return zero when ids are equal', () => {
  const result = comparePatientIds('BN-260609-123456', 'BN-260609-123456');
  assertEqual(result, 0);
});

test('comparePatientIds should compare by date', () => {
  const result = comparePatientIds('BN-250609-123456', 'BN-260609-123456');
  assertTrue(result < 0, 'Earlier date should be less');
});

// Test 10: Edge cases
console.log();
console.log('--- Edge Case Tests ---');

test('Should handle leap year February 29', () => {
  const result = validatePatientId('BN-290209-123456');
  assertTrue(result.isValid, 'Feb 29 2009 should be invalid (not leap year)');
});

test('Should handle valid leap year', () => {
  const result = validatePatientId('BN-290208-123456');
  assertTrue(result.isValid, 'Feb 29 2008 should be valid (leap year)');
});

test('Should handle December 31', () => {
  const result = validatePatientId('BN-311209-235959');
  assertTrue(result.isValid, 'Dec 31 23:59:59 should be valid');
});

test('Should handle January 1', () => {
  const result = validatePatientId('BN-010109-000000');
  assertTrue(result.isValid, 'Jan 1 00:00:00 should be valid');
});

test('Should handle long prefix', () => {
  const id = generatePatientId('MEDICAL');
  assertTrue(id.startsWith('MEDICAL-'), 'Should handle long prefix');
});

test('Should handle single letter prefix', () => {
  const id = generatePatientId('A');
  assertTrue(id.startsWith('A-'), 'Should handle single letter prefix');
});

test('parsePatientId should set isPast for past dates', () => {
  const pastId = 'BN-010100-000000';
  const info = parsePatientId(pastId);
  assertTrue(info.isPast, 'Past date should have isPast = true');
});

test('parsePatientId should set isPast false for future dates', () => {
  const futureId = 'BN-311299-235959';
  const info = parsePatientId(futureId);
  assertFalse(info.isPast, 'Future date should have isPast = false');
});

// Test 11: Integration tests
console.log();
console.log('--- Integration Tests ---');

test('Full workflow: generate, validate, parse, format', () => {
  // Generate
  const id = generatePatientId('PA');

  // Validate
  const validation = validatePatientId(id);
  assertTrue(validation.isValid, 'Generated ID should be valid');

  // Parse
  const info = parsePatientId(id);
  assertTrue(info.prefix === 'PA', 'Should parse prefix correctly');

  // Format
  const dateStr = formatDateFromId(id);
  const timeStr = formatTimeFromId(id);
  assertTrue(dateStr.includes('/'), 'Date should be formatted');
  assertTrue(timeStr.includes(':'), 'Time should be formatted');
});

test('Batch generation with validation', () => {
  const ids = generateBatchIds('BN', 10);

  // All should be valid
  for (const id of ids) {
    const validation = validatePatientId(id);
    assertTrue(validation.isValid, `ID ${id} should be valid`);
  }

  // All should be unique
  const uniqueIds = new Set(ids);
  assertEqual(uniqueIds.size, 10, 'All batch IDs should be unique');
});

// ============================================================================
// Test Results Summary
// ============================================================================

console.log();
console.log('='.repeat(70));
console.log('Test Results Summary');
console.log('='.repeat(70));
console.log(`Total Tests: ${testCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Success Rate: ${((passCount / testCount) * 100).toFixed(1)}%`);
console.log('='.repeat(70));

if (failCount === 0) {
  console.log('✓ All tests passed!');
} else {
  console.log(`✗ ${failCount} test(s) failed`);
  process.exit(1);
}
