# Patient Management Components

Component architecture for patient registration, search, and pump session history management.

## Component Structure

```
components/patient/
├── patient-registration-dialog.tsx    # Patient registration form dialog
├── patient-search-bar.tsx              # Patient search with autocomplete
├── patient-info-card.tsx               # Patient information display
├── patient-pump-history-table.tsx     # Pump session history table
├── patient-pump-session-card.tsx      # Individual session display
└── session-status-badge.tsx           # Session status indicator
```

## 1. PatientRegistrationDialog

**File:** `components/patient/patient-registration-dialog.tsx`

### Purpose
Dialog component for registering new patients with form validation.

### Props
```typescript
interface PatientRegistrationDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (patient: Patient) => void
}
```

### Features
- Form fields:
  - Full name (Họ và tên) - text input
  - Date of birth (Ngày tháng năm sinh) - date picker
  - Gender (Giới tính) - radio buttons (Nam/Nữ)
  - Weight (Cân nặng) - number input (kg)
- Auto-generated patient ID display
- Form validation with error messages
- Submit/Cancel buttons
- Loading state during submission

### Usage Example
```tsx
import { PatientRegistrationDialog } from '@/components/patient/patient-registration-dialog'

function App() {
  const [isOpen, setIsOpen] = useState(false)

  const handleSuccess = (patient) => {
    console.log('Patient registered:', patient)
    setIsOpen()
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Register Patient</Button>
      <PatientRegistrationDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  )
}
```

### UI Structure
```
┌─────────────────────────────────────────────┐
│  ĐĂNG KÝ BỆNH NHÂN MỚI                      │
├─────────────────────────────────────────────┤
│                                              │
│  Họ và tên *                                 │
│  [_____________________________]            │
│  Vui lòng nhập họ tên                        │
│                                              │
│  Ngày tháng năm sinh *                       │
│  [DD/MM/YYYY ______________] (📅)           │
│                                              │
│  Giới tính *                                 │
│  ⚪ Nam    ⚪ Nữ                             │
│                                              │
│  Cân nặng (kg) *                             │
│  [____.__] kg                                │
│                                              │
│  Mã bệnh nhân: BN-260609-123456             │
│  (Tự động tạo)                               │
│                                              │
│  [Cancel]                    [Register]      │
└─────────────────────────────────────────────┘
```

---

## 2. PatientSearchBar

**File:** `components/patient/patient-search-bar.tsx`

### Purpose
Search bar with autocomplete for finding patients by ID or name.

### Props
```typescript
interface PatientSearchBarProps {
  onPatientSelect: (patient: PatientSearchResult) => void
  placeholder?: string
  disabled?: boolean
}
```

### Features
- Autocomplete dropdown
- Search by patient ID or name
- Shows patient preview (ID, name, age)
- Loading state during search
- Debounced search (300ms)
- Keyboard navigation (Arrow keys, Enter, Esc)

### Usage Example
```tsx
import { PatientSearchBar } from '@/components/patient/patient-search-bar'

function App() {
  const handlePatientSelect = (patient) => {
    console.log('Selected patient:', patient)
  }

  return (
    <div className="w-96">
      <PatientSearchBar
        onPatientSelect={handlePatientSelect}
        placeholder="Tìm kiếm bệnh nhân..."
      />
    </div>
  )
}
```

### UI Structure
```
┌──────────────────────────────────────────┐
│ 🔍 Tìm kiếm bệnh nhân...                  │
└──────────────────────────────────────────┘
│                                           │
│ ▼ Dropdown                                │
│ ┌─────────────────────────────────────┐  │
│ │ BN-260609-123456                     │  │
│ │ Nguyễn Văn A (36 tuổi)               │  │
│ └─────────────────────────────────────┘  │
│ ┌─────────────────────────────────────┐  │
│ │ BN-250589-234567                     │  │
│ │ Trần Thị B (37 tuổi)                 │  │
│ └─────────────────────────────────────┘  │
```

---

## 3. PatientInfoCard

**File:** `components/patient/patient-info-card.tsx`

### Purpose
Display patient information in a card format.

### Props
```typescript
interface PatientInfoCardProps {
  patient: Patient | PatientSearchResult
  showActions?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onViewSessions?: () => void
  compact?: boolean
}
```

### Features
- Display patient ID, name, age, gender, weight
- Optional action buttons (Edit, Delete, View Sessions)
- Compact mode for smaller display
- Gender icon/emoji
- Color-coded by gender

### Usage Example
```tsx
import { PatientInfoCard } from '@/components/patient/patient-info-card'

function App() {
  const patient = {
    patientId: 'BN-260609-123456',
    fullName: 'Nguyễn Văn A',
    dateOfBirth: '1990-05-15',
    gender: 'MALE',
    weight: 70.5,
    age: 36,
  }

  return (
    <PatientInfoCard
      patient={patient}
      showActions={true}
      onViewSessions={() => console.log('View sessions')}
      onEdit={() => console.log('Edit patient')}
      onDelete={() => console.log('Delete patient')}
    />
  )
}
```

### UI Structure
```
┌─────────────────────────────────────────────┐
│ 👨 Nguyễn Văn A                             │
│ BN-260609-123456                            │
├─────────────────────────────────────────────┤
│ 📅 36 tuổi (15/05/1990)                     │
│ ⚖️ 70.5 kg                                  │
│ 🚻 Nam                                      │
├─────────────────────────────────────────────┤
│ [View Sessions] [Edit] [Delete]             │
└─────────────────────────────────────────────┘
```

---

## 4. PatientPumpHistoryTable

**File:** `components/patient/patient-pump-history-table.tsx`

### Purpose
Table displaying pump session history for a patient.

### Props
```typescript
interface PatientPumpHistoryTableProps {
  patientId: string
  sessions?: PumpSession[]
  loading?: boolean
  onSessionClick?: (session: PumpSession) => void
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
}
```

### Features
- Sortable columns
- Status badges with colors
- Date/time formatting
- Volume progress bars
- Pagination
- Empty state
- Loading skeleton
- Session details on click

### Columns
1. Mã bệnh nhân (Patient ID)
2. Ngày truyền (Infusion date)
3. Giờ bắt đầu (Start time)
4. Giờ kết thúc (End time)
5. Tốc độ cài (Configured rate)
6. Thể tích cài (Configured volume)
7. Thể tích đã bơm (Infused volume)
8. Trạng thái (Status)

### Usage Example
```tsx
import { PatientPumpHistoryTable } from '@/components/patient/patient-pump-history-table'

function App() {
  const [patientId] = useState('BN-260609-123456')

  const handleSessionClick = (session) => {
    console.log('Session clicked:', session)
  }

  return (
    <PatientPumpHistoryTable
      patientId={patientId}
      onSessionClick={handleSessionClick}
      pagination={{
        page: 1,
        pageSize: 10,
        total: 45,
        onPageChange: (page) => console.log('Page:', page),
      }}
    />
  )
}
```

### UI Structure
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Lịch sử truyền dịch                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Mã BN │ Ngày    │ Giờ BĐ │ Giờ KT │ Tốc độ │ Thể tích │Đã bơm│ Trạng│ │
│ │       │         │         │         │ (ml/h) │  (ml)   │ (ml)  │ thái │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ P001  │15/06/26│14:30   │15:45   │  10.0  │  20.0   │ 20.0  │✅ Hoàn│ │
│ │ ███████████████████████████████████████████████████████████████████ │ │
│ │ P002  │15/06/26│10:00   │10:30   │   5.0  │  10.0   │ 10.0  │✅ Hoàn│ │
│ │ ███████████████████████████████████████████████████████████████████ │ │
│ │ P003  │14/06/26│16:00   │───     │   2.0  │  15.0   │  5.0  │⏸️ Tạm │ │
│ │ ████████████                                                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│                          [< 1, 2, 3, ... 5 >]                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. PatientPumpSessionCard

**File:** `components/patient/patient-pump-session-card.tsx`

### Purpose
Detailed display of a single pump session.

### Props
```typescript
interface PatientPumpSessionCardProps {
  session: PumpSession
  patient?: PatientSearchResult
  showPatient?: boolean
  onUpdate?: (session: PumpSession) => void
  onStop?: (session: PumpSession) => void
}
```

### Features
- All session details
- Progress bar for infusion
- Status badge
- Duration display
- Protocol information
- Action buttons (if active)
- Error details (if failed)

### Usage Example
```tsx
import { PatientPumpSessionCard } from '@/components/patient/patient-pump-session-card'

function App() {
  const session = {
    sessionNumber: 1,
    patientId: 'BN-260609-123456',
    pumpId: 'PUMP-001',
    infusionDate: '2026-06-15',
    startTime: '14:30:00',
    endTime: '15:45:00',
    configuredRate: 10.0,
    configuredVolume: 20.0,
    infusedVolume: 20.0,
    status: 'COMPLETED',
    durationSeconds: 4500,
    durationFormatted: '1h 15p',
    protocolName: 'Người lớn cấp cứu',
    syringeType: '20CC',
  }

  return (
    <PatientPumpSessionCard
      session={session}
      showPatient={true}
    />
  )
}
```

### UI Structure
```
┌─────────────────────────────────────────────────┐
│ Session #1 - PUMP-001                           │
├─────────────────────────────────────────────────┤
│                                                  │
│ 👤 BN-260609-123456 - Nguyễn Văn A              │
│                                                  │
│ 📅 15/06/2026                                    │
│ 🕐 14:30 → 15:45 (1h 15p)                       │
│                                                  │
│ ⚙️ Protocol: Người lớn cấp cứu                   │
│ 💉 Syringe: 20CC                                │
│                                                  │
│ ⚡ Tốc độ: 10.0 ml/h                            │
│ 💧 Thể tích: 20.0 ml                            │
│ ✅ Đã bơm: 20.0 ml (100%)                       │
│ ███████████████████████████████████████████████ │
│                                                  │
│ 🏷️ Trạng thái: ✅ Hoàn thành                   │
└─────────────────────────────────────────────────┘
```

---

## 6. SessionStatusBadge

**File:** `components/patient/session-status-badge.tsx`

### Purpose
Color-coded badge for session status.

### Props
```typescript
interface SessionStatusBadgeProps {
  status: PumpSessionStatus
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}
```

### Features
- Color-coded by status
- Optional icon
- Multiple sizes
- Vietnamese labels

### Status Colors
- SCHEDULED: Blue (Đã lên lịch)
- PREPARING: Yellow (Đang chuẩn bị)
- RUNNING: Green (Đang chạy)
- PAUSED: Orange (Đã tạm dừng)
- COMPLETED: Emerald (Hoàn thành)
- STOPPED: Red (Đã dừng)
- ERROR: Red (Lỗi)
- CANCELLED: Gray (Đã hủy)

### Usage Example
```tsx
import { SessionStatusBadge } from '@/components/patient/session-status-badge'

function App() {
  return (
    <div className="flex gap-2">
      <SessionStatusBadge status="RUNNING" showIcon={true} />
      <SessionStatusBadge status="COMPLETED" showIcon={true} />
      <SessionStatusBadge status="ERROR" showIcon={true} />
    </div>
  )
}
```

### UI Examples
```
┌──────────────────────────────────────┐
│ 🔵 Đã lên lịch                      │
│ 🟡 Đang chuẩn bị                    │
│ 🟢 Đang chạy                        │
│ 🟠 Đã tạm dừng                      │
│ 🟢 Hoàn thành                       │
│ 🔴 Đã dừng                          │
│ 🔴 Lỗi                              │
│ ⚪ Đã hủy                            │
└──────────────────────────────────────┘
```

---

## Firebase Integration Examples

### Fetching Patient Data
```typescript
import { COLLECTIONS } from '@/lib/patient-types'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'

const db = getFirestore()

// Get patient by ID
async function getPatient(patientId: string) {
  const patientsRef = collection(db, COLLECTIONS.PATIENTS)
  const q = query(patientsRef, where('patientId', '==', patientId))
  const snapshot = await getDocs(q)

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() }
}

// Get patient sessions
async function getPatientSessions(patientId: string) {
  const sessionsRef = collection(db, COLLECTIONS.PATIENTS, patientId, COLLECTIONS.PUMP_SESSIONS)
  const snapshot = await getDocs(sessionsRef)

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}
```

### Creating Patient & Session
```typescript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

// Create patient
async function createPatient(data: PatientRegistrationForm) {
  const patientsRef = collection(db, COLLECTIONS.PATIENTS)

  const patientData = {
    patientId: generatePatientId(),
    fullName: data.fullName,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    weight: data.weight,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(patientsRef, patientData)
  return { id: docRef.id, ...patientData }
}

// Create pump session
async function createPumpSession(patientId: string, data: PumpSessionCreate) {
  const sessionsRef = collection(db, COLLECTIONS.PATIENTS, patientId, COLLECTIONS.PUMP_SESSIONS)

  const sessionData = {
    ...data,
    infusedVolume: 0,
    remainingVolume: data.configuredVolume,
    status: 'SCHEDULED',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(sessionsRef, sessionData)
  return { id: docRef.id, ...sessionData }
}
```

---

## API Endpoint Summary

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/patients` | Register new patient | `PatientRegistrationForm` | `PatientRegistrationResponse` |
| GET | `/api/patients` | List/search patients | Query params | `PatientSearchResponse` |
| GET | `/api/patients/search` | Advanced search | Query params | `PatientSearchResponse` |
| GET | `/api/patients/[id]` | Get patient by ID | - | `ApiResponse<Patient>` |
| PUT | `/api/patients/[id]` | Update patient | Partial patient data | `ApiResponse<Patient>` |
| DELETE | `/api/patients/[id]` | Delete patient | - | `ApiResponse` |
| GET | `/api/patients/[id]/sessions` | Get patient sessions | Query params | `PumpSessionHistoryResponse` |
| POST | `/api/patients/[id]/sessions` | Create pump session | `PumpSessionCreate` | `ApiResponse<PumpSession>` |
| GET | `/api/patients/[id]/sessions/[sessionId]` | Get session | - | `ApiResponse<PumpSession>` |
| PATCH | `/api/patients/[id]/sessions/[sessionId]` | Update session | `PumpSessionUpdate` | `ApiResponse<PumpSession>` |
| DELETE | `/api/patients/[id]/sessions/[sessionId]` | Delete session | - | `ApiResponse` |

---

## Data Flow Diagram

```
┌─────────────────┐
│  User Interface │
│  (React App)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Routes     │
│  (Next.js)      │
│  - Validation   │
│  - Auth         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Firebase       │
│  Firestore      │
│  - Storage      │
│  - Indexing     │
└─────────────────┘
```

---

## Firestore Index Requirements

Create these indexes in Firebase Console for optimal query performance:

### 1. Patient Search by Name
```
Collection: patients
Fields:
  - fullName (ascending)
  - createdAt (descending)
```

### 2. Patient Search by Gender & Weight
```
Collection: patients
Fields:
  - gender (ascending)
  - weight (ascending)
  - createdAt (descending)
```

### 3. Pump Sessions by Date
```
Collection Group: pumpSessions
Fields:
  - patientId (ascending)
  - infusionDate (descending)
  - startTime (descending)
```

### 4. Active Sessions
```
Collection Group: pumpSessions
Fields:
  - status (ascending)
  - startTime (descending)
```

---

## Complete Type Definitions

All TypeScript interfaces are defined in:
- `lib/patient-types.ts` - Core types and interfaces
- `lib/patient-utils.ts` - Utility functions and helpers

### Key Types
- `Patient` - Complete patient information
- `PatientSearchResult` - Lightweight patient data
- `PatientRegistrationForm` - Form data for registration
- `PumpSession` - Pump session with all details
- `PumpSessionCreate` - Data for creating session
- `PumpSessionUpdate` - Data for updating session
- `PumpSessionStatus` - Session status enum
- `PatientGender` - Gender enum

---

## Implementation Checklist

- [x] TypeScript interfaces and types
- [x] Utility functions for validation and formatting
- [x] API routes (Next.js)
- [ ] React components
- [ ] Firebase integration
- [ ] Firestore indexes
- [ ] Error handling
- [ ] Loading states
- [ ] Unit tests
- [ ] Integration tests
- [ ] Documentation
