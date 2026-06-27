# Patient ID Generator Utility

Complete utility for generating, parsing, and validating patient IDs in medical systems.

## Overview

This utility provides a robust system for generating unique patient identifiers in the format:
```
PREFIX-DDMMYY-HHMMSS
```

Example: `BN-260609-123456`

- **PREFIX**: Customizable prefix (default: 'BN' for 'Beneficiary Number')
- **DDMMYY**: Date components (Day, Month, Year - last 2 digits)
- **HHMMSS**: Time components (Hour, Minute, Second)

## Features

- ✅ Unique ID generation with Vietnam timezone support (GMT+7)
- ✅ Comprehensive validation and error handling
- ✅ Parsing and extraction of ID components
- ✅ Date/time formatting functions
- ✅ Batch generation with collision handling
- ✅ Edge case handling (leap years, month boundaries)
- ✅ TypeScript type safety

## Installation

```typescript
import {
  generatePatientId,
  parsePatientId,
  validatePatientId,
  formatDateFromId,
  formatTimeFromId,
  formatDateTimeFromId,
  generateBatchIds,
  comparePatientIds
} from './lib/patient-id-generator';
```

## API Reference

### `generatePatientId(prefix?: string): string`

Generate a unique patient ID.

**Parameters:**
- `prefix` (optional): Custom prefix (default: 'BN'). Must be uppercase letters only.

**Returns:** Unique patient ID string

**Example:**
```typescript
generatePatientId()           // 'BN-260609-123456'
generatePatientId('PA')       // 'PA-260609-123456'
generatePatientId('MEDICAL')  // 'MEDICAL-260609-123456'
```

**Throws:**
- Error if prefix is invalid (empty, lowercase, or contains non-letters)

---

### `parsePatientId(id: string): PatientIdInfo`

Parse a patient ID and extract all components.

**Parameters:**
- `id`: Patient ID string to parse

**Returns:** `PatientIdInfo` object containing:
- `prefix`: The prefix part of the ID
- `dateString`: Full date in DDMMYY format
- `timeString`: Full time in HHMMSS format
- `day`, `month`, `year`: Individual date components
- `hour`, `minute`, `second`: Individual time components
- `timestamp`: Full Date object
- `isPast`: Whether the timestamp is in the past

**Example:**
```typescript
const info = parsePatientId('BN-260609-123456');
console.log(info);
// {
//   prefix: 'BN',
//   dateString: '260609',
//   timeString: '123456',
//   day: 26,
//   month: 6,
//   year: 9,
//   hour: 12,
//   minute: 34,
//   second: 56,
//   timestamp: Date(2009-06-26T12:34:56.000Z),
//   isPast: true
// }
```

**Throws:**
- Error if ID format is invalid

---

### `validatePatientId(id: string): PatientIdValidationResult`

Validate a patient ID format and components.

**Parameters:**
- `id`: Patient ID string to validate

**Returns:** `PatientIdValidationResult` object:
- `isValid`: Boolean indicating validity
- `error`: Error message if invalid
- `info`: Parsed `PatientIdInfo` if valid

**Example:**
```typescript
validatePatientId('BN-260609-123456')
// { isValid: true, info: {...} }

validatePatientId('INVALID')
// { isValid: false, error: 'ID must match format: PREFIX-DDMMYY-HHMMSS' }

validatePatientId('BN-320609-123456')
// { isValid: false, error: 'Invalid day: 32. Must be between 01 and 31' }

validatePatientId('BN-290209-123456')
// { isValid: false, error: 'Invalid day: 29. Month 2 has only 28 days' }
```

---

### `formatDateFromId(id: string): string`

Format a readable date from a patient ID.

**Parameters:**
- `id`: Patient ID string

**Returns:** Date string in format "DD/MM/YYYY"

**Example:**
```typescript
formatDateFromId('BN-260609-123456')  // '26/6/2009'
formatDateFromId('BN-010609-123456')  // '1/6/2009'
```

---

### `formatTimeFromId(id: string): string`

Format a readable time from a patient ID.

**Parameters:**
- `id`: Patient ID string

**Returns:** Time string in format "HH:MM:SS"

**Example:**
```typescript
formatTimeFromId('BN-260609-123456')  // '12:34:56'
formatTimeFromId('BN-260609-000000')  // '0:0:0'
```

---

### `formatDateTimeFromId(id: string): string`

Format a full datetime from a patient ID.

**Parameters:**
- `id`: Patient ID string

**Returns:** DateTime string in format "DD/MM/YYYY HH:MM:SS"

**Example:**
```typescript
formatDateTimeFromId('BN-260609-123456')  // '26/6/2009 12:34:56'
```

---

### `generateBatchIds(prefix?: string, count?: number): string[]`

Generate multiple unique IDs with collision handling.

**Parameters:**
- `prefix` (optional): Custom prefix (default: 'BN')
- `count` (optional): Number of IDs to generate (default: 1)

**Returns:** Array of unique patient IDs

**Example:**
```typescript
generateBatchIds('BN', 5)
// ['BN-260609-123456', 'BN-260609-123457', 'BN-260609-123458', ...]

generateBatchIds('PA', 3)
// ['PA-260609-123459', 'PA-260609-123500', 'PA-260609-123501']
```

**Throws:**
- Error if unable to generate unique IDs after maximum attempts

---

### `comparePatientIds(id1: string, id2: string): number`

Compare two patient IDs chronologically.

**Parameters:**
- `id1`: First patient ID
- `id2`: Second patient ID

**Returns:**
- `< 0` if id1 < id2
- `0` if equal
- `> 0` if id1 > id2

**Example:**
```typescript
comparePatientIds('BN-260609-123456', 'BN-260609-123457')  // -1 (id1 is earlier)
comparePatientIds('BN-260609-123457', 'BN-260609-123456')  // 1 (id1 is later)
comparePatientIds('BN-260609-123456', 'BN-260609-123456')  // 0 (equal)
```

## Type Definitions

```typescript
interface PatientIdInfo {
  prefix: string;
  dateString: string;
  timeString: string;
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
  second: number;
  timestamp: Date;
  isPast: boolean;
}

interface PatientIdValidationResult {
  isValid: boolean;
  error?: string;
  info?: PatientIdInfo;
}
```

## Usage Examples

### Basic ID Generation

```typescript
import { generatePatientId } from './lib/patient-id-generator';

// Generate with default prefix
const patientId = generatePatientId();
console.log(patientId); // 'BN-260609-123456'

// Generate with custom prefix
const id = generatePatientId('MED');
console.log(id); // 'MED-260609-123456'
```

### Validation

```typescript
import { validatePatientId } from './lib/patient-id-generator';

const result = validatePatientId('BN-260609-123456');

if (result.isValid) {
  console.log('Valid ID:', result.info);
} else {
  console.error('Invalid ID:', result.error);
}
```

### Parsing and Formatting

```typescript
import {
  parsePatientId,
  formatDateFromId,
  formatTimeFromId,
  formatDateTimeFromId
} from './lib/patient-id-generator';

const id = 'BN-260609-123456';

// Parse all components
const info = parsePatientId(id);
console.log('Day:', info.day);        // 26
console.log('Month:', info.month);    // 6
console.log('Year:', info.year);       // 9

// Format for display
console.log(formatDateFromId(id));     // '26/6/2009'
console.log(formatTimeFromId(id));     // '12:34:56'
console.log(formatDateTimeFromId(id)); // '26/6/2009 12:34:56'
```

### Batch Generation

```typescript
import { generateBatchIds } from './lib/patient-id-generator';

// Generate 10 unique IDs
const ids = generateBatchIds('BN', 10);
console.log(ids);
// ['BN-260609-123456', 'BN-260609-123457', ...]
```

### Sorting Patient IDs

```typescript
import { comparePatientIds } from './lib/patient-id-generator';

const ids = [
  'BN-260609-123457',
  'BN-260609-123456',
  'BN-260609-123458'
];

// Sort chronologically
ids.sort(comparePatientIds);
// ['BN-260609-123456', 'BN-260609-123457', 'BN-260609-123458']
```

## Error Handling

```typescript
import {
  generatePatientId,
  validatePatientId,
  parsePatientId
} from './lib/patient-id-generator';

// Invalid prefix
try {
  generatePatientId(''); // Error: Prefix must be non-empty
} catch (error) {
  console.error(error.message);
}

try {
  generatePatientId('bn'); // Error: must be uppercase
} catch (error) {
  console.error(error.message);
}

// Invalid ID format
const validation = validatePatientId('INVALID');
if (!validation.isValid) {
  console.error(validation.error);
  // "ID must match format: PREFIX-DDMMYY-HHMMSS"
}

// Invalid date components
const validation = validatePatientId('BN-320609-123456');
if (!validation.isValid) {
  console.error(validation.error);
  // "Invalid day: 32. Must be between 01 and 31"
}

// Invalid time components
const validation = validatePatientId('BN-260609-256456');
if (!validation.isValid) {
  console.error(validation.error);
  // "Invalid hour: 25. Must be between 00 and 23"
}

// Parse invalid ID
try {
  parsePatientId('INVALID'); // Error: Invalid patient ID
} catch (error) {
  console.error(error.message);
}
```

## Testing

Run the test suite:

```bash
cd esp/lib
ts-node patient-id-generator.test.ts
```

Expected output:
```
======================================================================
Patient ID Generator Test Suite
======================================================================

✓ generatePatientId() should return ID with default prefix BN
✓ generatePatientId() should return 16 character ID
✓ generatePatientId() should match format PREFIX-DDMMYY-HHMMSS
...

======================================================================
Test Results Summary
======================================================================
Total Tests: 60
Passed: 60
Failed: 0
Success Rate: 100.0%
======================================================================
✓ All tests passed!
```

## Technical Details

### Timezone Handling

- All generated IDs use **Vietnam timezone (GMT+7)**
- Timezone offset: +7 hours (420 minutes)
- Dates and times are automatically adjusted

### Uniqueness Guarantee

- Uniqueness is ensured through second-level precision
- Batch generation includes collision detection and retry logic
- Maximum attempts: 10x the requested count

### Validation Rules

1. **Format**: PREFIX-DDMMYY-HHMMSS
   - Prefix: 1+ uppercase letters
   - Date: 6 digits (DDMMYY)
   - Time: 6 digits (HHMMSS)

2. **Date Validation**:
   - Day: 01-31 (validated against month)
   - Month: 01-12
   - Year: 00-99

3. **Time Validation**:
   - Hour: 00-23
   - Minute: 00-59
   - Second: 00-59

4. **Special Cases**:
   - Leap years handled (February 29)
   - Month-specific day counts (30 vs 31 days)
   - February: 28 or 29 days (leap year dependent)

## License

MIT

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting.

## Support

For issues or questions, please contact the development team.
