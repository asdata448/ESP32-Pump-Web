# Firebase Patient Management Integration

## Overview
This document describes the Firebase Firestore integration for the ESP32 Patient Management System. The integration provides persistent storage for patient records and pump session history.

## Firestore Structure

### Collections

#### 1. `patients` (Root Collection)
Stores patient information.

**Document ID:** Patient ID (e.g., "BN-150590-123456")

**Document Structure:**
```typescript
{
  id: string                    // Document ID (same as patientId)
  patientId: string            // BN-DDMMYY-HHMMSS
  fullName: string              // Full name
  dateOfBirth: string          // YYYY-MM-DD format
  gender: 'MALE' | 'FEMALE'    // Gender
  weight: number               // Weight in kg
  metadata: {
    registrationSource: 'WEB' | 'MOBILE' | 'API'
    registeredAt: string        // ISO 8601 timestamp
    notes?: string
    tags?: string[]
  }
  createdAt: string            // ISO 8601 timestamp
  updatedAt: string            // ISO 8601 timestamp
}
```

#### 2. `pumpSessions` (Subcollection under each patient)
Stores pump session history for each patient.

**Collection Path:** `patients/{patientId}/pumpSessions`

**Document ID:** Session number as string (e.g., "1", "2", "3")

**Document Structure:**
```typescript
{
  id: string                    // Document ID (session number)
  sessionNumber: number         // Session number for this patient
  patientId: string             // Reference to parent patient
  pumpId: string                // Pump identifier

  // Session details
  infusionDate: string          // YYYY-MM-DD
  startTime: string             // HH:mm:ss
  endTime?: string              // HH:mm:ss (null if running)

  // Pump configuration
  configuredRate: number       // mL/h
  configuredVolume: number     // mL
  infusedVolume: number        // mL
  remainingVolume: number     // mL

  // Status
  status: 'SCHEDULED' | 'PREPARING' | 'RUNNING' | 'PAUSED' |
         'COMPLETED' | 'STOPPED' | 'ERROR' | 'CANCELLED'
  durationSeconds?: number     // Total duration in seconds
  durationFormatted?: string   // e.g., "2h 30m"

  // Medical protocol
  protocolId?: string          // Protocol ID
  protocolName?: string        // Protocol display name
  syringeType: string          // '10CC' | '20CC'

  // Additional data
  notes?: string
  errorDetails?: string
  stoppedBy?: string

  // Timestamps
  createdAt: string            // ISO 8601
  updatedAt: string            // ISO 8601
}
```

## Firestore Indexes

### Required Indexes

Create these indexes in Firebase Console:
**Firestore → Indexes → Create Index**

#### 1. Patient Search by Gender & Weight
- **Collection ID:** `patients`
- **Fields:**
  - `gender` (Ascending)
  - `weight` (Ascending)
  - `createdAt` (Descending)

#### 2. Pump Sessions by Date (for a patient)
- **Collection Group ID:** `pumpSessions`
- **Fields:**
  - `patientId` (Ascending)
  - `infusionDate` (Descending)
  - `startTime` (Descending)

#### 3. Active Pump Sessions
- **Collection Group ID:** `pumpSessions`
- **Fields:**
  - `status` (Ascending)
  - `startTime` (Descending)

#### 4. Pump Sessions by Protocol
- **Collection Group ID:** `pumpSessions`
- **Fields:**
  - `protocolId` (Ascending)
  - `infusionDate` (Descending)

## API Endpoints

### Patient Management

#### 1. Register Patient
**Endpoint:** `POST /api/patients`

**Request Body:**
```json
{
  "fullName": "Nguyễn Văn A",
  "dateOfBirth": "1990-05-15",
  "gender": "MALE",
  "weight": 70.5
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "patient": {
    "id": "BN-150590-123456",
    "patientId": "BN-150590-123456",
    "fullName": "Nguyễn Văn A",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "weight": 70.5,
    "metadata": {
      "registrationSource": "WEB",
      "registeredAt": "2026-06-16T10:30:00.000Z"
    },
    "createdAt": "2026-06-16T10:30:00.000Z",
    "updatedAt": "2026-06-16T10:30:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Dữ liệu không hợp lệ",
  "validationErrors": {
    "fullName": "Tên phải có ít nhất 2 ký tự",
    "weight": "Cân nặng phải lớn hơn 0"
  }
}
```

#### 2. Get Patient by ID
**Endpoint:** `GET /api/patients/{patientId}`

**URL Parameter:**
- `patientId`: Patient ID (e.g., "BN-150590-123456")

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "BN-150590-123456",
    "patientId": "BN-150590-123456",
    "fullName": "Nguyễn Văn A",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "weight": 70.5,
    "age": 36,
    "metadata": { ... },
    "createdAt": "2026-06-16T10:30:00.000Z",
    "updatedAt": "2026-06-16T10:30:00.000Z"
  },
  "timestamp": "2026-06-16T10:30:00.000Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "message": "Không tìm thấy bệnh nhân với mã BN-150590-123456"
  },
  "timestamp": "2026-06-16T10:30:00.000Z"
}
```

#### 3. Update Patient
**Endpoint:** `PUT /api/patients/{patientId}`

**URL Parameter:**
- `patientId`: Patient ID

**Request Body (all fields optional):**
```json
{
  "fullName": "Nguyễn Văn B",
  "weight": 75.0
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "BN-150590-123456",
    "patientId": "BN-150590-123456",
    "fullName": "Nguyễn Văn B",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "weight": 75.0,
    ...
  },
  "timestamp": "2026-06-16T10:35:00.000Z"
}
```

#### 4. Delete Patient
**Endpoint:** `DELETE /api/patients/{patientId}`

**URL Parameter:**
- `patientId`: Patient ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "patientId": "BN-150590-123456"
  },
  "timestamp": "2026-06-16T10:40:00.000Z"
}
```

**Note:** This will also delete all associated pump sessions.

### Patient Search

#### 5. Search Patients
**Endpoint:** `GET /api/patients`

**Query Parameters:**
- `searchTerm`: string (search by patient ID or name)
- `gender`: 'MALE' | 'FEMALE'
- `minWeight`: number (kg)
- `maxWeight`: number (kg)
- `limit`: number (default 50)
- `offset`: number (default 0)

**Example Request:**
```
GET /api/patients?searchTerm=Nguyễn&gender=MALE&minWeight=50&maxWeight=100&limit=20&offset=0
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "patientId": "BN-150590-123456",
      "fullName": "Nguyễn Văn A",
      "dateOfBirth": "1990-05-15",
      "gender": "MALE",
      "weight": 70.5,
      "age": 36
    }
  ],
  "total": 1,
  "hasMore": false,
  "query": {
    "searchTerm": "Nguyễn",
    "gender": "MALE",
    "minWeight": 50,
    "maxWeight": 100,
    "limit": 20,
    "offset": 0
  }
}
```

#### 6. Advanced Search
**Endpoint:** `GET /api/patients/search`

**Query Parameters:**
- `q`: string (search term)
- `gender`: 'MALE' | 'FEMALE'
- `minWeight`: number
- `maxWeight`: number
- `minAge`: number
- `maxAge`: number
- `dateOfBirthFrom`: string (YYYY-MM-DD)
- `dateOfBirthTo`: string (YYYY-MM-DD)
- `sortBy`: 'createdAt' | 'name' | 'weight' | 'dateOfBirth'
- `sortOrder`: 'asc' | 'desc'
- `limit`: number (default 50)
- `offset`: number (default 0)

**Example Request:**
```
GET /api/patients/search?q=Nguyễn&minAge=18&maxAge=65&sortBy=name&sortOrder=asc
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "results": [...],
    "total": 10,
    "hasMore": false,
    "query": { ... }
  },
  "timestamp": "2026-06-16T10:45:00.000Z"
}
```

### Pump Sessions

#### 7. Get Patient Pump Sessions
**Endpoint:** `GET /api/patients/{patientId}/sessions`

**URL Parameter:**
- `patientId`: Patient ID

**Query Parameters:**
- `status`: Filter by status (optional)
- `limit`: number (default 50)
- `offset`: number (default 0)

**Example Request:**
```
GET /api/patients/BN-150590-123456/sessions?status=COMPLETED&limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "patientId": "BN-150590-123456",
    "patient": null,
    "sessions": [
      {
        "id": "3",
        "sessionNumber": 3,
        "patientId": "BN-150590-123456",
        "pumpId": "PUMP-001",
        "infusionDate": "2026-06-16",
        "startTime": "14:30:00",
        "endTime": "15:30:00",
        "configuredRate": 10.5,
        "configuredVolume": 20.0,
        "infusedVolume": 20.0,
        "remainingVolume": 0.0,
        "status": "COMPLETED",
        "durationSeconds": 3600,
        "durationFormatted": "1h 0m",
        "protocolId": "ADULT_ACUTE_SLOW",
        "protocolName": "Người lớn cấp cứu",
        "syringeType": "20CC",
        "createdAt": "2026-06-16T14:30:00.000Z",
        "updatedAt": "2026-06-16T15:30:00.000Z"
      }
    ],
    "totalSessions": 3,
    "totalInfusedVolume": 60.0
  },
  "timestamp": "2026-06-16T15:35:00.000Z"
}
```

#### 8. Create Pump Session
**Endpoint:** `POST /api/patients/{patientId}/sessions`

**URL Parameter:**
- `patientId`: Patient ID

**Request Body:**
```json
{
  "pumpId": "PUMP-001",
  "infusionDate": "2026-06-16",
  "startTime": "14:30:00",
  "configuredRate": 10.5,
  "configuredVolume": 20.0,
  "protocolId": "ADULT_ACUTE_SLOW",
  "protocolName": "Người lớn cấp cứu",
  "syringeType": "20CC",
  "notes": "Optional session notes"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "sessionNumber": 1,
    "patientId": "BN-150590-123456",
    "pumpId": "PUMP-001",
    "infusionDate": "2026-06-16",
    "startTime": "14:30:00",
    "configuredRate": 10.5,
    "configuredVolume": 20.0,
    "infusedVolume": 0.0,
    "remainingVolume": 20.0,
    "status": "SCHEDULED",
    "syringeType": "20CC",
    "protocolId": "ADULT_ACUTE_SLOW",
    "protocolName": "Người lớn cấp cứu",
    "createdAt": "2026-06-16T14:30:00.000Z",
    "updatedAt": "2026-06-16T14:30:00.000Z"
  },
  "timestamp": "2026-06-16T14:30:00.000Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "MISSING_REQUIRED_FIELDS",
    "message": "Thiếu thông tin bắt buộc: pumpId, infusionDate, startTime, configuredRate, configuredVolume, syringeType"
  },
  "timestamp": "2026-06-16T14:30:00.000Z"
}
```

## Firebase Functions

### Patient Operations

#### `createPatientInFirestore(formData)`
Creates a new patient document in Firestore.

**Parameters:**
- `formData`: PatientRegistrationForm with generated patientId

**Returns:** `Promise<Patient | null>`

**Example:**
```typescript
const patient = await createPatientInFirestore({
  patientId: 'BN-150590-123456',
  fullName: 'Nguyễn Văn A',
  dateOfBirth: '1990-05-15',
  gender: 'MALE',
  weight: 70.5
})
```

#### `getPatientFromFirestore(patientId)`
Retrieves a patient by ID.

**Parameters:**
- `patientId`: Patient ID string

**Returns:** `Promise<Patient | null>`

#### `updatePatientInFirestore(patientId, updates)`
Updates patient information.

**Parameters:**
- `patientId`: Patient ID string
- `updates`: Partial patient data (excluding id, patientId, createdAt)

**Returns:** `Promise<Patient | null>`

#### `deletePatientFromFirestore(patientId)`
Deletes a patient and all associated sessions.

**Parameters:**
- `patientId`: Patient ID string

**Returns:** `Promise<boolean>`

#### `searchPatientsInFirestore(searchQuery)`
Searches patients with filters.

**Parameters:**
- `searchQuery`: PatientSearchQuery object

**Returns:** `Promise<{ results: PatientSearchResult[]; total: number }>`

### Pump Session Operations

#### `createPumpSessionInFirestore(patientId, sessionData, sessionNumber)`
Creates a new pump session.

**Parameters:**
- `patientId`: Patient ID string
- `sessionData`: PumpSessionCreate object
- `sessionNumber`: Session number for this patient

**Returns:** `Promise<PumpSession | null>`

#### `getPumpSessionsFromFirestore(patientId, statusFilter, limitCount)`
Retrieves pump sessions for a patient.

**Parameters:**
- `patientId`: Patient ID string
- `statusFilter`: Optional status filter
- `limitCount`: Maximum number of sessions (default 50)

**Returns:** `Promise<PumpSession[]>`

#### `getPumpSessionFromFirestore(patientId, sessionId)`
Retrieves a specific pump session.

**Parameters:**
- `patientId`: Patient ID string
- `sessionId`: Session ID string

**Returns:** `Promise<PumpSession | null>`

#### `updatePumpSessionInFirestore(patientId, sessionId, updates)`
Updates a pump session.

**Parameters:**
- `patientId`: Patient ID string
- `sessionId`: Session ID string
- `updates`: PumpSessionUpdate object

**Returns:** `Promise<PumpSession | null>`

#### `deletePumpSessionFromFirestore(patientId, sessionId)`
Deletes a pump session.

**Parameters:**
- `patientId`: Patient ID string
- `sessionId`: Session ID string

**Returns:** `Promise<boolean>`

### Utility Functions

#### `getPatientSessionCount(patientId)`
Gets the total number of sessions for a patient.

**Returns:** `Promise<number>`

#### `getNextSessionNumber(patientId)`
Gets the next session number for a patient.

**Returns:** `Promise<number>`

#### `getTotalInfusedVolume(patientId)`
Calculates total infused volume from all completed sessions.

**Returns:** `Promise<number>`

#### `patientExists(patientId)`
Checks if a patient exists.

**Returns:** `Promise<boolean>`

## Error Handling

All API endpoints return consistent error responses:

```typescript
{
  success: false,
  error: {
    code: string,           // Error code
    message: string,        // Human-readable error message
    details?: any          // Additional error details
  },
  timestamp: string        // ISO 8601 timestamp
}
```

### Common Error Codes

- `INVALID_PATIENT_ID`: Patient ID format is invalid
- `PATIENT_NOT_FOUND`: Patient does not exist
- `MISSING_REQUIRED_FIELDS`: Required form fields are missing
- `INVALID_VALUES`: Invalid data values (e.g., negative weight)
- `SEARCH_ERROR`: Error during search operation
- `SERVER_ERROR`: Internal server error
- `CREATION_FAILED`: Failed to create resource
- `UPDATE_FAILED`: Failed to update resource
- `DELETE_FAILED`: Failed to delete resource

## Security Rules

Configure Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Patients collection
    match /patients/{patientId} {
      // Allow read/write for authenticated users
      allow read, write: if request.auth != null;

      // Pump sessions subcollection
      match /pumpSessions/{sessionId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

## Testing

### Test Firebase Connection
```bash
curl http://localhost:3000/api/firebase-test
```

### Register a Patient
```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Patient",
    "dateOfBirth": "1990-01-01",
    "gender": "MALE",
    "weight": 70.0
  }'
```

### Search Patients
```bash
curl "http://localhost:3000/api/patients?searchTerm=Test&limit=10"
```

### Create Pump Session
```bash
curl -X POST http://localhost:3000/api/patients/BN-010190-123456/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "pumpId": "PUMP-001",
    "infusionDate": "2026-06-16",
    "startTime": "14:30:00",
    "configuredRate": 10.0,
    "configuredVolume": 20.0,
    "syringeType": "20CC"
  }'
```

## Files Modified

1. **esp/lib/firebase-patients.ts** - Firebase integration functions
2. **esp/app/api/patients/route.ts** - Patient registration and search
3. **esp/app/api/patients/[id]/route.ts** - Individual patient operations
4. **esp/app/api/patients/[id]/sessions/route.ts** - Pump session management
5. **esp/app/api/patients/search/route.ts** - Advanced patient search

## Migration from In-Memory Storage

The system has been migrated from in-memory storage to Firebase Firestore:

**Before:**
- Data stored in memory arrays
- Data lost on server restart
- No persistence across sessions

**After:**
- Data persisted in Firebase Firestore
- Data survives server restarts
- Real-time sync across multiple clients
- Scalable cloud storage

## Next Steps

1. Set up Firestore indexes in Firebase Console
2. Configure security rules
3. Test all API endpoints
4. Implement real-time subscriptions for live updates
5. Add analytics and reporting features
