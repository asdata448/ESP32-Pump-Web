# Patient Management Components - Quick Start

## 🚀 Installation

These components are part of your ESP32 Pump project and are already integrated. No additional installation needed.

## 📋 Prerequisites

Ensure you have these dependencies in your `package.json`:

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "date-fns": "^3.x",
    "lucide-react": "^0.x",
    "framer-motion": "^11.x",
    "sonner": "^1.x",
    "firebase": "^10.x"
  }
}
```

## 🎯 Basic Usage

### 1. Import Components

```tsx
import {
  PatientSearchBar,
  PatientInfoCard,
  PumpHistoryTable,
  PatientDashboardExample
} from '@/components/patients'
```

### 2. Simple Patient Search

```tsx
'use client'

import { PatientSearchBar } from '@/components/patients'
import { useState } from 'react'

export default function SimpleSearch() {
  const [selectedPatient, setSelectedPatient] = useState(null)

  return (
    <div>
      <PatientSearchBar
        onPatientSelect={setSelectedPatient}
        placeholder="Search patients..."
      />

      {selectedPatient && (
        <div>
          Selected: {selectedPatient.fullName}
        </div>
      )}
    </div>
  )
}
```

### 3. Display Patient Info

```tsx
'use client'

import { PatientInfoCard } from '@/components/patients'

export default function PatientDisplay({ patient }) {
  return (
    <PatientInfoCard
      patient={patient}
      onEdit={(p) => console.log('Edit:', p)}
      onDelete={async (id) => {
        await deletePatient(id)
        return true
      }}
    />
  )
}
```

### 4. Show Pump History

```tsx
'use client'

import { PumpHistoryTable } from '@/components/patients'

export default function HistoryDisplay({ historyData }) {
  return (
    <PumpHistoryTable
      data={historyData}
      onRowClick={(entry) => console.log('View:', entry)}
      showFilters
      showExport
    />
  )
}
```

## 🔥 Firebase Integration

### Complete Dashboard with Firebase

```tsx
'use client'

import { PatientDashboardExample } from '@/components/patients'
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
} from 'firebase/firestore'
import { getFirestoreDB } from '@/lib/firebase'

export default function PatientManagementPage() {
  const db = getFirestoreDB()

  // Search patients
  const searchPatients = async (queryStr: string) => {
    const q = query(
      collection(db, 'patients'),
      where('patientId', '>=', queryStr),
      where('patientId', '<=', queryStr + '')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dateOfBirth: doc.data().dateOfBirth.toDate(),
    }))
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    }))
  }

  // Real-time updates
  const subscribeToHistory = (patientId: string, callback: (data: any[]) => void) => {
    const q = query(
      collection(db, 'pump_history'),
      where('patientId', '==', patientId),
      orderBy('timestamp', 'desc'),
      limit(50)
    )
    return onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }))
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

## 🎨 Customization Examples

### Custom Search with API

```tsx
const customSearchFunction = async (query: string) => {
  const response = await fetch(`/api/patients/search?q=${query}`)
  const data = await response.json()

  return data.patients.map(patient => ({
    patient: patient,
    matchScore: 0.8,
    matchFields: ['patientId'],
  }))
}

<PatientSearchBar searchFunction={customSearchFunction} />
```

### Custom Patient Card Actions

```tsx
<PatientInfoCard
  patient={patient}
  onEdit={(p) => {
    // Navigate to edit page
    router.push(`/patients/${p.id}/edit`)
  }}
  onDelete={async (id) => {
    // Custom delete logic
    const confirmed = await showCustomConfirmDialog()
    if (confirmed) {
      await deleteFromAPI(id)
      toast.success('Deleted successfully')
      return true
    }
    return false
  }}
  showActions
  variant="outline"
/>
```

### Custom History Table Columns

```tsx
// In pump-history-table.tsx, modify columns array:
const columns = [
  { id: 'patientId', label: 'Patient ID', sortable: true },
  { id: 'sessionId', label: 'Session ID', sortable: true },
  { id: 'date', label: 'Date', sortable: true },
  { id: 'speed', label: 'Rate (ml/h)', sortable: true },
  { id: 'volume', label: 'Volume (ml)', sortable: true },
  { id: 'status', label: 'Status', sortable: true },
  // Add your custom columns here
]
```

## 📱 Responsive Behavior

Components automatically adapt to screen size:

- **Mobile**: Stacked layout, compact cards, hidden columns
- **Tablet**: Optimized spacing, selected columns
- **Desktop**: Full features, all columns visible

## 🔧 Troubleshooting

### Issue: Search not working

**Solution:**
```tsx
// Ensure searchFunction returns correct format
const searchFunction = async (query: string) => {
  return results.map(r => ({
    patient: r,           // Required
    matchScore: 0.9,      // Required
    matchFields: ['id']   // Required
  }))
}
```

### Issue: Firebase timestamps

**Solution:**
```tsx
// Convert Firestore timestamps to Date objects
const patient = {
  ...doc.data(),
  dateOfBirth: doc.data().dateOfBirth.toDate(),
  createdAt: doc.data().createdAt?.toDate(),
}
```

### Issue: Table columns not showing

**Solution:**
```tsx
// Ensure visibleColumns includes column IDs
const [visibleColumns, setVisibleColumns] = useState([
  'patientId',
  'date',
  'speed',
  'volume',
  'status',
])
```

## 📚 Additional Examples

See `patient-dashboard-example.tsx` for complete integration examples.

## 🎯 Next Steps

1. **Add Firebase Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /patients/{patientId} {
         allow read, write: if true;
       }
       match /pump_history/{historyId} {
         allow read, write: if true;
       }
     }
   }
   ```

2. **Create Indexes** (Firebase Console)
   - Patients collection: `patientId` (ascending)
   - Pump history: `patientId`, `timestamp` (composite)

3. **Add Error Boundaries**
   ```tsx
   import { ErrorBoundary } from 'react-error-boundary'

   <ErrorBoundary fallback={<ErrorFallback />}>
     <PatientDashboardExample {...props} />
   </ErrorBoundary>
   ```

4. **Implement Analytics**
   ```tsx
   import { analytics } from '@/lib/firebase'

   const handlePatientSelect = (patient) => {
     analytics.logEvent('patient_selected', {
       patient_id: patient.patientId,
     })
     setSelectedPatient(patient)
   }
   ```

---

For complete documentation, see [README.md](./README.md)
