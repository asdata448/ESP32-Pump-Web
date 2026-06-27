/**
 * Patient ID Generator Unit Tests
 *
 * Comprehensive test suite for patient ID generation, parsing, and validation
 * Format: PREFIX-DDMMYY-HHMMSS (e.g., BN-260609-123456)
 *
 * Test Categories:
 * - ID generation with various prefixes
 * - ID parsing and component extraction
 * - ID validation (format, date/time ranges)
 * - Date/time formatting from IDs
 * - Batch ID generation with collision handling
 * - Edge cases (leap years, month boundaries, etc.)
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
} from '../patient-id-generator'

// ============================================================================
// TEST UTILITIES
// ============================================================================

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

class TestRunner {
  private results: TestResult[] = []
  private testCount = 0
  private passCount = 0
  private failCount = 0

  test(description: string, fn: () => void | Promise<void>) {
    const startTime = performance.now()
    this.testCount++

    try {
      fn()
      this.passCount++
      this.results.push({
        name: description,
        passed: true,
        duration: performance.now() - startTime
      })
      console.log(`✓ ${description}`)
    } catch (error) {
      this.failCount++
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.results.push({
        name: description,
        passed: false,
        error: errorMsg,
        duration: performance.now() - startTime
      })
      console.error(`✗ ${description}`)
      console.error(`  Error: ${errorMsg}`)
    }
  }

  assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
      )
    }
  }

  assertTrue(value: boolean, message?: string) {
    if (!value) {
      throw new Error(message || `Expected true but got false`)
    }
  }

  assertFalse(value: boolean, message?: string) {
    if (value) {
      throw new Error(message || `Expected false but got true`)
    }
  }

  assertThrows(fn: () => void, expectedMessage?: string) {
    try {
      fn()
      throw new Error('Expected function to throw an error')
    } catch (error) {
      if (expectedMessage && error instanceof Error) {
        if (!error.message.includes(expectedMessage)) {
          throw new Error(
            `Expected error message to include "${expectedMessage}" but got "${error.message}"`
          )
        }
      }
    }
  }

  assertArrayLength<T>(array: T[], expectedLength: number, message?: string) {
    if (array.length !== expectedLength) {
      throw new Error(
        message || `Expected array length ${expectedLength} but got ${array.length}`
      )
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(70))
    console.log('Test Results Summary')
    console.log('='.repeat(70))
    console.log(`Total Tests: ${this.testCount}`)
    console.log(`Passed: ${this.passCount}`)
    console.log(`Failed: ${this.failCount}`)
    console.log(`Success Rate: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`)
    console.log(`Duration: ${this.results.reduce((acc, r) => acc + r.duration, 0).toFixed(2)}ms`)
    console.log('='.repeat(70))

    if (this.failCount === 0) {
      console.log('✓ All tests passed!')
    } else {
      console.log(`✗ ${this.failCount} test(s) failed`)
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`)
      })
    }
  }

  getExitCode(): number {
    return this.failCount === 0 ? 0 : 1
  }
}

// ============================================================================
// TEST SUITES
// ============================================================================

const runner = new TestRunner()

console.log('='.repeat(70))
console.log('Patient ID Generator Test Suite')
console.log('='.repeat(70))
console.log()

// ============================================================================
// TEST SUITE 1: ID GENERATION
// ============================================================================

console.log('--- ID Generation Tests ---')

runner.test('generatePatientId() should return ID with default prefix BN', () => {
  const id = generatePatientId()
  runner.assertTrue(id.startsWith('BN-'), 'ID should start with BN-')
})

runner.test('generatePatientId() should return 17 character ID', () => {
  const id = generatePatientId()
  runner.assertEqual(id.length, 17, 'ID length should be 17 (BN- + 6 + - + 6)')
})

runner.test('generatePatientId() should match format PREFIX-DDMMYY-HHMMSS', () => {
  const id = generatePatientId()
  const regex = /^[A-Z]+-\d{6}-\d{6}$/
  runner.assertTrue(regex.test(id), `ID ${id} should match format PREFIX-DDMMYY-HHMMSS`)
})

runner.test('generatePatientId() should generate valid date components', () => {
  const id = generatePatientId()
  const info = parsePatientId(id)
  runner.assertTrue(info.day >= 1 && info.day <= 31, 'Day should be 1-31')
  runner.assertTrue(info.month >= 1 && info.month <= 12, 'Month should be 1-12')
  runner.assertTrue(info.hour >= 0 && info.hour <= 23, 'Hour should be 0-23')
  runner.assertTrue(info.minute >= 0 && info.minute <= 59, 'Minute should be 0-59')
  runner.assertTrue(info.second >= 0 && info.second <= 59, 'Second should be 0-59')
})

runner.test('generatePatientId("PA") should use custom prefix', () => {
  const id = generatePatientId('PA')
  runner.assertTrue(id.startsWith('PA-'), 'ID should start with PA-')
})

runner.test('generatePatientId("MED") should use custom prefix', () => {
  const id = generatePatientId('MED')
  runner.assertTrue(id.startsWith('MED-'), 'ID should start with MED-')
})

runner.test('generatePatientId with empty prefix should throw error', () => {
  runner.assertThrows(() => generatePatientId(''), 'must be a non-empty string')
})

runner.test('generatePatientId with lowercase prefix should throw error', () => {
  runner.assertThrows(() => generatePatientId('bn'), 'only uppercase letters')
})

runner.test('generatePatientId with mixed case prefix should throw error', () => {
  runner.assertThrows(() => generatePatientId('Bn'), 'only uppercase letters')
})

runner.test('generatePatientId with special character prefix should throw error', () => {
  runner.assertThrows(() => generatePatientId('B1'), 'only uppercase letters')
})

// ============================================================================
// TEST SUITE 2: ID PARSING
// ============================================================================

console.log('\n--- ID Parsing Tests ---')

runner.test('parsePatientId should extract correct prefix', () => {
  const id = 'BN-260609-123456'
  const info = parsePatientId(id)
  runner.assertEqual(info.prefix, 'BN')
})

runner.test('parsePatientId should extract correct date components', () => {
  const id = 'BN-260609-123456'
  const info = parsePatientId(id)
  runner.assertEqual(info.day, 26)
  runner.assertEqual(info.month, 6)
  runner.assertEqual(info.year, 9)
})

runner.test('parsePatientId should extract correct time components', () => {
  const id = 'BN-260609-123456'
  const info = parsePatientId(id)
  runner.assertEqual(info.hour, 12)
  runner.assertEqual(info.minute, 34)
  runner.assertEqual(info.second, 56)
})

runner.test('parsePatientId should set dateString correctly', () => {
  const id = 'BN-260609-123456'
  const info = parsePatientId(id)
  runner.assertEqual(info.dateString, '260609')
})

runner.test('parsePatientId should set timeString correctly', () => {
  const id = 'BN-260609-123456'
  const info = parsePatientId(id)
  runner.assertEqual(info.timeString, '123456')
})

runner.test('parsePatientId should create valid timestamp', () => {
  const id = 'BN-260609-123456'
  const info = parsePatientId(id)
  runner.assertTrue(info.timestamp instanceof Date, 'Should create Date object')
  runner.assertEqual(info.timestamp.getFullYear(), 2009)
})

runner.test('parsePatientId with invalid format should throw error', () => {
  runner.assertThrows(() => parsePatientId('INVALID'), 'Invalid patient ID')
})

runner.test('parsePatientId with missing separator should throw error', () => {
  runner.assertThrows(() => parsePatientId('BN260609123456'), 'Invalid patient ID')
})

runner.test('parsePatientId with invalid day should throw error', () => {
  runner.assertThrows(() => parsePatientId('BN-320609-123456'), 'Invalid')
})

runner.test('parsePatientId with invalid time should throw error', () => {
  runner.assertThrows(() => parsePatientId('BN-260609-256456'), 'Invalid')
})

// ============================================================================
// TEST SUITE 3: ID VALIDATION
// ============================================================================

console.log('\n--- ID Validation Tests ---')

runner.test('validatePatientId with valid ID should return isValid true', () => {
  const result = validatePatientId('BN-260609-123456')
  runner.assertTrue(result.isValid)
})

runner.test('validatePatientId with valid ID should include info', () => {
  const result = validatePatientId('BN-260609-123456')
  runner.assertTrue(result.info !== undefined)
  runner.assertEqual(result.info?.prefix, 'BN')
})

runner.test('validatePatientId with empty string should return isValid false', () => {
  const result = validatePatientId('')
  runner.assertFalse(result.isValid)
  runner.assertTrue(result.error?.includes('non-empty'))
})

runner.test('validatePatientId with null should return isValid false', () => {
  const result = validatePatientId(null as any)
  runner.assertFalse(result.isValid)
})

runner.test('validatePatientId with invalid format should return isValid false', () => {
  const result = validatePatientId('INVALID')
  runner.assertFalse(result.isValid)
  runner.assertTrue(result.error?.includes('format'))
})

runner.test('validatePatientId with invalid month should return isValid false', () => {
  const result = validatePatientId('BN-261309-123456')
  runner.assertFalse(result.isValid)
  runner.assertTrue(result.error?.includes('Invalid month'))
})

runner.test('validatePatientId with invalid day should return isValid false', () => {
  const result = validatePatientId('BN-320609-123456')
  runner.assertFalse(result.isValid)
  runner.assertTrue(result.error?.includes('Invalid day'))
})

runner.test('validatePatientId with invalid hour should return isValid false', () => {
  const result = validatePatientId('BN-260609-256456')
  runner.assertFalse(result.isValid)
  runner.assertTrue(result.error?.includes('Invalid hour'))
})

runner.test('validatePatientId with invalid minute should return isValid false', () => {
  const result = validatePatientId('BN-260609-126156')
  runner.assertFalse(result.isValid)
  runner.assertTrue(result.error?.includes('Invalid minute'))
})

runner.test('validatePatientId with invalid second should return isValid false', () => {
  const result = validatePatientId('BN-260609-123466')
  runner.assertFalse(result.isValid)
  runner.assertTrue(result.error?.includes('Invalid second'))
})

// ============================================================================
// TEST SUITE 4: DATE/TIME FORMATTING
// ============================================================================

console.log('\n--- Date/Time Formatting Tests ---')

runner.test('formatDateFromId should format date correctly', () => {
  const date = formatDateFromId('BN-260609-123456')
  runner.assertEqual(date, '26/6/2009')
})

runner.test('formatDateFromId should handle single digit day', () => {
  const date = formatDateFromId('BN-010609-123456')
  runner.assertEqual(date, '1/6/2009')
})

runner.test('formatDateFromId should handle single digit month', () => {
  const date = formatDateFromId('BN-261109-123456')
  runner.assertEqual(date, '26/11/2009')
})

runner.test('formatTimeFromId should format time correctly', () => {
  const time = formatTimeFromId('BN-260609-123456')
  runner.assertEqual(time, '12:34:56')
})

runner.test('formatTimeFromId should handle midnight', () => {
  const time = formatTimeFromId('BN-260609-000000')
  runner.assertEqual(time, '0:0:0')
})

runner.test('formatTimeFromId should handle single digit hours', () => {
  const time = formatTimeFromId('BN-260609-093045')
  runner.assertEqual(time, '9:30:45')
})

runner.test('formatDateTimeFromId should format datetime correctly', () => {
  const datetime = formatDateTimeFromId('BN-260609-123456')
  runner.assertEqual(datetime, '26/6/2009 12:34:56')
})

// ============================================================================
// TEST SUITE 5: BATCH GENERATION
// ============================================================================

console.log('\n--- Batch Generation Tests ---')

runner.test('generateBatchIds should generate specified count', () => {
  const ids = generateBatchIds('BN', 3)
  runner.assertArrayLength(ids, 3)
})

runner.test('generateBatchIds should generate unique IDs', () => {
  const ids = generateBatchIds('BN', 5)
  const uniqueIds = new Set(ids)
  runner.assertEqual(uniqueIds.size, 5, 'All IDs should be unique')
})

runner.test('generateBatchIds with count 1 should return single ID', () => {
  const ids = generateBatchIds('PA', 1)
  runner.assertArrayLength(ids, 1)
  runner.assertTrue(ids[0].startsWith('PA-'))
})

runner.test('generateBatchIds should handle larger batches', () => {
  const ids = generateBatchIds('BN', 20)
  runner.assertArrayLength(ids, 20)
  const uniqueIds = new Set(ids)
  runner.assertEqual(uniqueIds.size, 20, 'All IDs should be unique')
})

runner.test('generateBatchIds should throw error on impossible count', () => {
  runner.assertThrows(() => generateBatchIds('BN', 10000), 'Failed to generate')
})

// ============================================================================
// TEST SUITE 6: ID COMPARISON
// ============================================================================

console.log('\n--- ID Comparison Tests ---')

runner.test('comparePatientIds should return negative when id1 < id2', () => {
  const result = comparePatientIds('BN-260609-123456', 'BN-260609-123457')
  runner.assertTrue(result < 0)
})

runner.test('comparePatientIds should return positive when id1 > id2', () => {
  const result = comparePatientIds('BN-260609-123457', 'BN-260609-123456')
  runner.assertTrue(result > 0)
})

runner.test('comparePatientIds should return zero when ids are equal', () => {
  const result = comparePatientIds('BN-260609-123456', 'BN-260609-123456')
  runner.assertEqual(result, 0)
})

runner.test('comparePatientIds should compare by date', () => {
  const result = comparePatientIds('BN-250609-123456', 'BN-260609-123456')
  runner.assertTrue(result < 0, 'Earlier date should be less')
})

runner.test('comparePatientIds should compare by time when dates equal', () => {
  const result = comparePatientIds('BN-260609-123456', 'BN-260609-123457')
  runner.assertTrue(result < 0, 'Earlier time should be less')
})

// ============================================================================
// TEST SUITE 7: EDGE CASES
// ============================================================================

console.log('\n--- Edge Case Tests ---')

runner.test('Should reject February 29 in non-leap year', () => {
  const result = validatePatientId('BN-290209-123456')
  runner.assertFalse(result.isValid, 'Feb 29 2009 should be invalid (not leap year)')
})

runner.test('Should accept February 29 in leap year', () => {
  const result = validatePatientId('BN-290208-123456')
  runner.assertTrue(result.isValid, 'Feb 29 2008 should be valid (leap year)')
})

runner.test('Should handle February 28 in non-leap year', () => {
  const result = validatePatientId('BN-280209-123456')
  runner.assertTrue(result.isValid, 'Feb 28 2009 should be valid')
})

runner.test('Should handle December 31 23:59:59', () => {
  const result = validatePatientId('BN-311209-235959')
  runner.assertTrue(result.isValid, 'Dec 31 23:59:59 should be valid')
})

runner.test('Should handle January 1 00:00:00', () => {
  const result = validatePatientId('BN-010101-000000')
  runner.assertTrue(result.isValid, 'Jan 1 00:00:00 should be valid')
})

runner.test('Should reject April 31', () => {
  const result = validatePatientId('BN-310409-123456')
  runner.assertFalse(result.isValid)
  runner.assertTrue(result.error?.includes('has only'))
})

runner.test('Should reject June 31', () => {
  const result = validatePatientId('BN-310609-123456')
  runner.assertFalse(result.isValid)
  runner.assertTrue(result.error?.includes('has only'))
})

runner.test('Should reject September 31', () => {
  const result = validatePatientId('BN-310909-123456')
  runner.assertFalse(result.isValid)
})

runner.test('Should handle long prefix', () => {
  const id = generatePatientId('MEDICAL')
  runner.assertTrue(id.startsWith('MEDICAL-'), 'Should handle long prefix')
})

runner.test('Should handle single letter prefix', () => {
  const id = generatePatientId('A')
  runner.assertTrue(id.startsWith('A-'), 'Should handle single letter prefix')
})

runner.test('parsePatientId should set isPast for past dates', () => {
  const pastId = 'BN-010100-000000'
  const info = parsePatientId(pastId)
  runner.assertTrue(info.isPast, 'Past date should have isPast = true')
})

runner.test('parsePatientId should set isPast false for future dates', () => {
  const futureId = 'BN-311299-235959'
  const info = parsePatientId(futureId)
  runner.assertFalse(info.isPast, 'Future date should have isPast = false')
})

// ============================================================================
// TEST SUITE 8: INTEGRATION TESTS
// ============================================================================

console.log('\n--- Integration Tests ---')

runner.test('Full workflow: generate, validate, parse, format', () => {
  // Generate
  const id = generatePatientId('PA')

  // Validate
  const validation = validatePatientId(id)
  runner.assertTrue(validation.isValid, 'Generated ID should be valid')

  // Parse
  const info = parsePatientId(id)
  runner.assertEqual(info.prefix, 'PA', 'Should parse prefix correctly')

  // Format
  const dateStr = formatDateFromId(id)
  const timeStr = formatTimeFromId(id)
  runner.assertTrue(dateStr.includes('/'), 'Date should be formatted')
  runner.assertTrue(timeStr.includes(':'), 'Time should be formatted')
})

runner.test('Batch generation with validation', () => {
  const ids = generateBatchIds('BN', 10)

  // All should be valid
  for (const id of ids) {
    const validation = validatePatientId(id)
    runner.assertTrue(validation.isValid, `ID ${id} should be valid`)
  }

  // All should be unique
  const uniqueIds = new Set(ids)
  runner.assertEqual(uniqueIds.size, 10, 'All batch IDs should be unique')
})

runner.test('Sorting IDs using comparison function', () => {
  const ids = [
    'BN-260609-123457',
    'BN-260609-123456',
    'BN-250609-123456'
  ]

  const sorted = [...ids].sort(comparePatientIds)
  runner.assertEqual(sorted[0], 'BN-250609-123456')
  runner.assertEqual(sorted[1], 'BN-260609-123456')
  runner.assertEqual(sorted[2], 'BN-260609-123457')
})

runner.test('Handle same-second generation (collision avoidance)', () => {
  // This test verifies collision handling in batch generation
  const ids = generateBatchIds('BN', 3)
  const uniqueIds = new Set(ids)
  runner.assertEqual(uniqueIds.size, 3, 'Should handle same-second collisions')
})

// ============================================================================
// RESULTS SUMMARY
// ============================================================================

runner.printSummary()
