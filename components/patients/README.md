# Patient Management Components

Comprehensive React components for patient search, information display, and pump history tracking with Firebase real-time integration.

## 📦 Components

### 1. PatientSearchBar

Real-time patient search with debounce and smart matching.

**Features:**
- 🔍 Real-time search with 300ms debounce
- 🎯 Search by Patient ID or full name
- ⌨️ Keyboard navigation (Arrow keys, Enter, Escape)
- 🎨 Highlighted search matches
- 📊 Match score indicators
- 🚫 Empty state with registration prompt
- ⚡ Loading skeleton states
- 🎭 Accessible with ARIA labels

**Usage:**
```tsx
import { PatientSearchBar } from '@/components/patients'

<PatientSearchBar
  onPatientSelect={(patient) => console.log('Selected:', patient)}
  onRegisterNew={() => setShowRegistration(true)}
  searchFunction={async (query) => {
    // Your search logic here
    return searchResults
  }}
  placeholder="Tìm kiếm bệnh nhân..."
  showRegisterButton
  debounceMs={300}
/>
```

**Props:**
- `onPatientSelect: (patient: Patient) => void` - Callback when patient is selected
- `onRegisterNew?: () => void` - Callback for new patient registration
- `searchFunction?: (query: string) => Promise<PatientSearchResult[]>` - Custom search function
- `placeholder?: string` - Input placeholder text
- `showRegisterButton?: boolean` - Show registration button (default: true)
- `debounceMs?: number` - Debounce delay in ms (default: 300)

---

### 2. PatientInfoCard

Beautiful patient information display with edit/delete actions.

**Features:**
- 👤 Large patient ID badge with copy functionality
- 📅 Auto-calculated age from DOB
- ⚖️ Weight, gender, and registration date
- ✏️ Edit and delete actions with confirmation
- 🎨 Three variants: default, outline, ghost
- 📱 Compact mode for space-constrained layouts
- 🎭 Delete confirmation dialog

**Usage:**
```tsx
import { PatientInfoCard } from '@/components/patients'

<PatientInfoCard
  patient={patientData}
  onEdit={(patient) => console.log('Edit:', patient)}
  onDelete={async (patientId) => {
    // Handle deletion
    return true
  }}
  showActions
  compact={false}
  variant="default"
/>
```

**Minimal Version:**
```tsx
import { PatientInfoCardMinimal } from '@/components/patients'

<PatientInfoCardMinimal
  patient={patientData}
  onClick={() => console.log('Clicked')}
/>
```

**Props:**
- `patient: Patient` - Patient data object
- `onEdit?: (patient: Patient) => void` - Edit callback
- `onDelete?: (patientId: string) => Promise<boolean>` - Delete callback
- `showActions?: boolean` - Show action buttons (default: true)
- `compact?: boolean` - Compact layout (default: false)
- `variant?: 'default' | 'outline' | 'ghost'` - Card style variant

---

### 3. PumpHistoryTable

Advanced data table for pump history with sorting, filtering, and export.

**Features:**
- 📊 Sortable columns with visual indicators
- 🔍 Multi-field filtering (date range, status, patient search)
- 📅 Quick date filters (Today, 7 days, 30 days, 90 days)
- 📄 Export to CSV with UTF-8 BOM
- 📄 Pagination with customizable page size
- 👁️ Column visibility toggle
- 🎨 Status badges with icons and colors
- ⚡ Real-time updates indicator
- 📱 Responsive design
- 🎯 Click-to-view row details
- 🔗 Clickable patient IDs

**Usage:**
```tsx
import { PumpHistoryTable } from '@/components/patients'

<PumpHistoryTable
  data={historyData}
  isLoading={false}
  onRowClick={(entry) => console.log('View details:', entry)}
  onPatientClick={(patientId) => console.log('Patient:', patientId)}
  pageSize={10}
  showFilters
  showExport
  realTime
/>
```

**Props:**
- `data: PumpHistoryEntry[]` - History records
- `isLoading?: boolean` - Loading state
- `onRowClick?: (entry: PumpHistoryEntry) => void` - Row click handler
- `onPatientClick?: (patientId: string) => void` - Patient ID click handler
- `pageSize?: number` - Rows per page (default: 10)
- `showFilters?: boolean` - Show filter controls (default: true)
- `showExport?: boolean` - Show export button (default: true)
- `realTime?: boolean` - Show real-time indicator (default: false)

---

## 🔥 Firebase Integration

### Complete Dashboard Example

```tsx
import { PatientDashboardExample } from '@/components/patients'
import { collection, query, where, getDocs, onSnapshot, addDoc, doc, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore'
import { getFirestoreDB } from '@/lib/firebase'

export default function PatientManagementPage() {
  const db = getFirestoreDB()

  // Search patients by ID or name
  const searchPatients = async (queryStr: string) => {
    const q = query(
      collection(db, 'patients'),
      where('patientId', '>=', queryStr),
      where('patientId', '<=', queryStr + '')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

  // Register new patient
  const registerPatient = async (patientData: any) => {
    const docRef = await addDoc(collection(db, 'patients'), {
      ...patientData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return docRef.id
  }

  // Get patient history
  const getPatientHistory = async (patientId: string) => {
    const q = query(
      collection(db, 'pump_history'),
      where('patientId', '==', patientId),
      orderBy('timestamp', 'desc'),
      limit(50)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

  // Subscribe to real-time updates
  const subscribeToHistory = (patientId: string, callback: (data: any[]) => void) => {
    const q = query(
      collection(db, 'pump_history'),
      where('patientId', '==', patientId),
      orderBy('timestamp', 'desc'),
      limit(50)
    )
    return onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      callback(history)
    })
  }

  // Update patient
  const updatePatient = async (patientId: string, data: any) => {
    await updateDoc(doc(db, 'patients', patientId), {
      ...data,
      updatedAt: new Date(),
    })
    return true
  }

  // Delete patient
  const deletePatient = async (patientId: string) => {
    await deleteDoc(doc(db, 'patients', patientId))
    return true
  }

  return (
    <PatientDashboardExample
      searchPatients={searchPatients}
      registerPatient={registerPatient}
      getPatientHistory={getPatientHistory}
      subscribeToHistory={subscribeToHistory}
      updatePatient={updatePatient}
      deletePatient={deletePatient}
    />
  )
}
```

---

## 📝 Type Definitions

### Patient
```typescript
interface Patient {
  id: string                // Firebase document ID
  patientId: string         // Patient ID (e.g., BN-240616-1234)
  fullName: string          // Full name
  dateOfBirth: Date         // Date of birth
  gender: 'male' | 'female' // Gender
  weight: number            // Weight in kg
  createdAt?: Date          // Registration date
  updatedAt?: Date          // Last update
  notes?: string            // Optional notes
}
```

### PumpHistoryEntry
```typescript
interface PumpHistoryEntry extends PumpHistoryRecord {
  patientId?: string      // Patient ID
  patientName?: string    // Patient name
  startTime?: Date        // Session start time
  endTime?: Date          // Session end time
}

type PumpStatus = 'COMPLETED' | 'STOPPED' | 'ERROR' | 'RUNNING'
```

---

## 🎨 Styling

All components use the medical theme through custom CSS classes:

- `medical-card` - Card styling with gradient background
- `medical-input` - Input field styling
- `medical-button` - Primary button styling
- `medical-button-outline` - Outline button styling

---

## 🔧 Customization

### Custom Search Function

```typescript
const customSearch = async (query: string) => {
  // Your custom search logic
  const results = await yourSearchAPI(query)

  // Return formatted results
  return results.map(patient => ({
    patient: patient,
    matchScore: 0.9,
    matchFields: ['patientId', 'fullName']
  }))
}

<PatientSearchBar searchFunction={customSearch} />
```

### Custom Status Styling

Modify `STATUS_CONFIG` in `pump-history-table.tsx`:

```typescript
const STATUS_CONFIG = {
  COMPLETED: {
    label: 'Hoàn thành',
    color: 'text-success',
    bgColor: 'bg-success/10',
    icon: CheckCircle2,
  },
  // Add your custom statuses...
}
```

---

## 🚀 Features Checklist

### Patient Search Bar
- ✅ Real-time search with debounce
- ✅ Search by patient ID or name
- ✅ Keyboard navigation
- ✅ Highlighted matches
- ✅ Match score indicators
- ✅ Loading skeletons
- ✅ Empty state with registration prompt
- ✅ Copy patient ID to clipboard

### Patient Info Card
- ✅ Patient ID display and copy
- ✅ Auto-calculated age
- ✅ Gender, weight display
- ✅ Registration date
- ✅ Edit and delete actions
- ✅ Delete confirmation dialog
- ✅ Three display variants
- ✅ Compact mode
- ✅ Notes display

### Pump History Table
- ✅ Sortable columns
- ✅ Multi-field filtering
- ✅ Date range picker
- ✅ Quick date filters
- ✅ Status filtering
- ✅ Patient search
- ✅ Column visibility toggle
- ✅ Export to CSV
- ✅ Pagination
- ✅ Real-time updates indicator
- ✅ Clickable patient IDs
- ✅ Row details on click
- ✅ Status badges with icons
- ✅ Responsive design
- ✅ Loading states
- ✅ Empty states

### Integration
- ✅ Firebase real-time updates
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ Confirmation dialogs
- ✅ Responsive design
- ✅ TypeScript support
- ✅ Accessibility features

---

## 📱 Responsive Design

All components are fully responsive:

- **Mobile (< 768px)**: Stacked layouts, compact views
- **Tablet (768px - 1024px)**: Adjusted spacing, optimized columns
- **Desktop (> 1024px)**: Full features, multi-column layouts

---

## 🌐 Localization

Components use Vietnamese labels by default. Customize through props or modify the component files.

---

## 📄 License

These components are part of the ESP32 Pump Control project.

---

## 🤝 Contributing

When adding features:
1. Maintain TypeScript type safety
2. Follow existing code style
3. Add accessibility attributes
4. Include error handling
5. Test on mobile devices
6. Update this README

---

## 🔗 Related Components

- `PatientRegistrationDialog` - Patient registration form
- `FirebaseHistoryPanel` - Firebase history display
- `DemoHistoryPanel` - Demo history display

---

## 📞 Support

For issues or questions, please refer to the main project documentation.
