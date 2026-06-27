/**
 * Patient ID Generator Utility
 *
 * Generates unique patient IDs in the format: PREFIX-DDMMYY-HHMMSS
 * Example: BN-260609-1234
 *
 * Timezone: Vietnam (GMT+7)
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Information extracted from a patient ID
 */
export interface PatientIdInfo {
  /** The prefix part of the ID (e.g., 'BN') */
  prefix: string;
  /** Full date string in DDMMYY format */
  dateString: string;
  /** Full time string in HHMMSS format */
  timeString: string;
  /** Day of month (01-31) */
  day: number;
  /** Month (01-12) */
  month: number;
  /** Year (last 2 digits) */
  year: number;
  /** Hour (00-23) */
  hour: number;
  /** Minute (00-59) */
  minute: number;
  /** Second (00-59) */
  second: number;
  /** Full Date object representing the ID timestamp */
  timestamp: Date;
  /** Whether this timestamp is in the past */
  isPast: boolean;
}

/**
 * Result of patient ID validation
 */
export interface PatientIdValidationResult {
  /** Whether the ID is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Parsed ID info if valid */
  info?: PatientIdInfo;
}

// ============================================================================
// Constants
// ============================================================================

const VIETNAM_TIMEZONE_OFFSET = 7 * 60; // GMT+7 in minutes
const ID_FORMAT_REGEX = /^([A-Z]+)-(\d{6})-(\d{6})$/;

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate a unique patient ID in format: PREFIX-DDMMYY-HHMMSS
 *
 * @param prefix - The prefix for the ID (default: 'BN')
 * @returns A unique patient ID string
 *
 * @example
 * generatePatientId() // 'BN-260609-123456'
 * generatePatientId('PA') // 'PA-260609-123456'
 */
export function generatePatientId(prefix: string = 'BN'): string {
  const now = getVietnamTime();

  // Validate prefix
  if (!prefix || !/^[A-Z]+$/.test(prefix)) {
    throw new Error('Prefix must be a non-empty string containing only uppercase letters');
  }

  const day = padTwoDigits(now.getDate());
  const month = padTwoDigits(now.getMonth() + 1); // Months are 0-indexed
  const year = String(now.getFullYear()).slice(-2); // Last 2 digits
  const hour = padTwoDigits(now.getHours());
  const minute = padTwoDigits(now.getMinutes());
  const second = padTwoDigits(now.getSeconds());

  return `${prefix}-${day}${month}${year}-${hour}${minute}${second}`;
}

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Parse a patient ID and extract its information
 *
 * @param id - The patient ID to parse
 * @returns PatientIdInfo object containing all extracted information
 * @throws Error if the ID is invalid
 *
 * @example
 * parsePatientId('BN-260609-123456')
 * // Returns: { prefix: 'BN', day: 26, month: 6, year: 9, ... }
 */
export function parsePatientId(id: string): PatientIdInfo {
  const validation = validatePatientId(id);

  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid patient ID');
  }

  const match = id.match(ID_FORMAT_REGEX);
  if (!match) {
    throw new Error('ID does not match expected format');
  }

  const [, prefix, dateStr, timeStr] = match;

  const day = parseInt(dateStr.slice(0, 2), 10);
  const month = parseInt(dateStr.slice(2, 4), 10);
  const year = parseInt(dateStr.slice(4, 6), 10);
  const hour = parseInt(timeStr.slice(0, 2), 10);
  const minute = parseInt(timeStr.slice(2, 4), 10);
  const second = parseInt(timeStr.slice(4, 6), 10);

  // Construct full year (assuming 2000s for years 00-99)
  const fullYear = 2000 + year;

  // Create timestamp in Vietnam timezone
  const timestamp = new Date(Date.UTC(fullYear, month - 1, day, hour - 7, minute, second));

  const now = getVietnamTime();
  const isPast = timestamp < now;

  return {
    prefix,
    dateString: dateStr,
    timeString: timeStr,
    day,
    month,
    year,
    hour,
    minute,
    second,
    timestamp,
    isPast
  };
}

/**
 * Validate a patient ID format and components
 *
 * @param id - The patient ID to validate
 * @returns PatientIdValidationResult indicating validity and any errors
 *
 * @example
 * validatePatientId('BN-260609-123456') // { isValid: true, info: {...} }
 * validatePatientId('INVALID') // { isValid: false, error: '...' }
 */
export function validatePatientId(id: string): PatientIdValidationResult {
  // Check if string is provided
  if (!id || typeof id !== 'string') {
    return {
      isValid: false,
      error: 'Patient ID must be a non-empty string'
    };
  }

  // Check format with regex
  const match = id.match(ID_FORMAT_REGEX);
  if (!match) {
    return {
      isValid: false,
      error: 'ID must match format: PREFIX-DDMMYY-HHMMSS (e.g., BN-260609-123456)'
    };
  }

  const [, prefix, dateStr, timeStr] = match;

  // Validate prefix
  if (!/^[A-Z]+$/.test(prefix)) {
    return {
      isValid: false,
      error: 'Prefix must contain only uppercase letters'
    };
  }

  // Parse date components
  const day = parseInt(dateStr.slice(0, 2), 10);
  const month = parseInt(dateStr.slice(2, 4), 10);
  const year = parseInt(dateStr.slice(4, 6), 10);

  // Validate date ranges
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      error: `Invalid month: ${month}. Must be between 01 and 12`
    };
  }

  if (day < 1 || day > 31) {
    return {
      isValid: false,
      error: `Invalid day: ${day}. Must be between 01 and 31`
    };
  }

  // Check for valid day in month
  const daysInMonth = getDaysInMonth(month, 2000 + year);
  if (day > daysInMonth) {
    return {
      isValid: false,
      error: `Invalid day: ${day}. Month ${month} has only ${daysInMonth} days`
    };
  }

  // Parse time components
  const hour = parseInt(timeStr.slice(0, 2), 10);
  const minute = parseInt(timeStr.slice(2, 4), 10);
  const second = parseInt(timeStr.slice(4, 6), 10);

  // Validate time ranges
  if (hour > 23) {
    return {
      isValid: false,
      error: `Invalid hour: ${hour}. Must be between 00 and 23`
    };
  }

  if (minute > 59) {
    return {
      isValid: false,
      error: `Invalid minute: ${minute}. Must be between 00 and 59`
    };
  }

  if (second > 59) {
    return {
      isValid: false,
      error: `Invalid second: ${second}. Must be between 00 and 59`
    };
  }

  // Parse and return info
  try {
    const info = parsePatientId(id);
    return {
      isValid: true,
      info
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Failed to parse ID: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================================
// Formatter Functions
// ============================================================================

/**
 * Format a readable date from a patient ID
 *
 * @param id - The patient ID
 * @returns Formatted date string in format "DD/MM/YYYY"
 *
 * @example
 * formatDateFromId('BN-260609-123456') // '26/06/2009'
 */
export function formatDateFromId(id: string): string {
  const info = parsePatientId(id);
  const fullYear = 2000 + info.year;
  return `${info.day}/${info.month}/${fullYear}`;
}

/**
 * Format a readable time from a patient ID
 *
 * @param id - The patient ID
 * @returns Formatted time string in format "HH:MM:SS"
 *
 * @example
 * formatTimeFromId('BN-260609-123456') // '12:34:56'
 */
export function formatTimeFromId(id: string): string {
  const info = parsePatientId(id);
  return `${info.hour}:${info.minute}:${info.second}`;
}

/**
 * Format a full datetime from a patient ID
 *
 * @param id - The patient ID
 * @returns Formatted datetime string in format "DD/MM/YYYY HH:MM:SS"
 *
 * @example
 * formatDateTimeFromId('BN-260609-123456') // '26/06/2009 12:34:56'
 */
export function formatDateTimeFromId(id: string): string {
  return `${formatDateFromId(id)} ${formatTimeFromId(id)}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get current time in Vietnam timezone (GMT+7)
 *
 * @returns Date object adjusted to Vietnam timezone
 */
function getVietnamTime(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (VIETNAM_TIMEZONE_OFFSET * 60000));
}

/**
 * Pad a number to 2 digits with leading zero if needed
 *
 * @param num - Number to pad (0-99)
 * @returns Two-digit string
 */
function padTwoDigits(num: number): string {
  return num.toString().padStart(2, '0');
}

/**
 * Get the number of days in a specific month
 *
 * @param month - Month (1-12)
 * @param year - Full year
 * @returns Number of days in the month
 */
function getDaysInMonth(month: number, year: number): number {
  const monthsWith31Days = [1, 3, 5, 7, 8, 10, 12];
  const monthsWith30Days = [4, 6, 9, 11];

  if (month === 2) {
    // February - check for leap year
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeapYear ? 29 : 28;
  }

  if (monthsWith31Days.includes(month)) {
    return 31;
  }

  if (monthsWith30Days.includes(month)) {
    return 30;
  }

  return 30; // Default fallback
}

/**
 * Generate multiple unique IDs with collision handling
 *
 * @param prefix - The prefix for the IDs
 * @param count - Number of IDs to generate
 * @returns Array of unique patient IDs
 *
 * @example
 * generateBatchIds('BN', 5) // ['BN-260609-123456', 'BN-260609-123457', ...]
 */
export function generateBatchIds(prefix: string = 'BN', count: number = 1): string[] {
  const ids: string[] = [];
  let attempts = 0;
  const maxAttempts = count * 10;

  while (ids.length < count && attempts < maxAttempts) {
    const id = generatePatientId(prefix);

    // Check for uniqueness (in case of same-second generation)
    if (!ids.includes(id)) {
      ids.push(id);
    }

    attempts++;

    // Small delay to ensure different second if needed
    if (ids.length < count && attempts % count === 0) {
      // Wait for next second
      const start = Date.now();
      while (Date.now() - start < 1100) {
        // Busy wait (not ideal for production, but ensures second change)
      }
    }
  }

  if (ids.length < count) {
    throw new Error(`Failed to generate ${count} unique IDs after ${maxAttempts} attempts`);
  }

  return ids;
}

/**
 * Compare two patient IDs
 *
 * @param id1 - First patient ID
 * @param id2 - Second patient ID
 * @returns Number < 0 if id1 < id2, 0 if equal, > 0 if id1 > id2
 *
 * @example
 * comparePatientIds('BN-260609-123456', 'BN-260609-123457') // -1
 */
export function comparePatientIds(id1: string, id2: string): number {
  const info1 = parsePatientId(id1);
  const info2 = parsePatientId(id2);

  const time1 = info1.timestamp.getTime();
  const time2 = info2.timestamp.getTime();

  return time1 - time2;
}
