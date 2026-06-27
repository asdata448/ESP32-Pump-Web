# Patient Management Components - Visual Guide

## 🎨 Component Gallery

This guide provides a visual overview of all patient management components and their features.

---

## 1️⃣ Patient Search Bar

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Tìm kiếm theo mã bệnh nhân hoặc tên...        [+ Register]    │
└─────────────────────────────────────────────────────────────────┘

                    ↓ (when searching)

┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Nguyễn Văn An                           [×]  [Register]      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [Avatar]  Nguyễn Văn An              ✓ Khớp tốt                │
│            BN-240616-1234            [ID] [Tên]                │
│            38 tuổi • Nam • 70 kg                               │
│                                                                 │
│  [Avatar]  Nguyễn Thị Bình                                     │
│            BN-240616-5678            [ID]                      │
│            34 tuổi • Nữ • 55 kg                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                 Tìm thấy 2 bệnh nhân                            │
└─────────────────────────────────────────────────────────────────┘
```

**Features Visualized:**
- 🔍 Search icon + input field
- 🎯 Real-time dropdown results
- 👤 Patient avatars with initials
- ✨ Highlighted search matches
- 🏷️ Match indicators (ID, Tên badges)
- ⚡ Loading skeletons during search
- 📊 Match score badges ("Khớp tốt")
- 🎯 Keyboard navigation support
- ➕ Quick registration button

---

## 2️⃣ Patient Info Card (Standard)

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ BN-240616-1234  [Copy]              [Edit] [Delete]      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  👤 Nguyễn Văn An                                               │
│                                                                 │
│  📅 Ngày sinh         ⚖️ Cân nặng                               │
│     15/03/1985            70 kg                                 │
│     (38 tuổi)                                                   │
│                                                                 │
│  👁️ Giới tính                                                   │
│     Nam                                                         │
│                                                                 │
│  🕐 Ngày đăng ký                                               │
│     16/06/2024                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features Visualized:**
- 🏷️ Large patient ID badge with copy button
- 👤 Avatar with patient initial
- ✏️ Edit and delete action buttons
- 📅 Auto-calculated age display
- 📱 Organized information grid
- 🎨 Medical theme styling
- 🔗 Clickable actions

---

## 3️⃣ Patient Info Card (Compact)

```
┌─────────────────────────────────────────────────────────────────┐
│  👤                    BN-240616-1234        [Edit] [Delete]    │
│                      Nguyễn Văn An                             │
│                      38 tuổi • Nam • 70 kg                     │
└─────────────────────────────────────────────────────────────────┘
```

**Features Visualized:**
- 📱 Space-efficient layout
- 🎯 All essential info visible
- 🔗 Inline action buttons
- 📊 Single-row design for lists

---

## 4️⃣ Pump History Table (Full View)

```
┌─────────────────────────────────────────────────────────────────┐
│  Lịch sử truyền dịch                             [Export CSV]   │
│                                                                 │
│  [Search] [Status ▼] [Date Range] [7d] [30d] [90d] [Clear]    │
│                                                                 │
│  Showing 1-10 of 25 records                        ● Live      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────┬──────────┬──────────┬────────┬────────┬────────┐  │
│  │Patient│ Session  │   Date   │ Start  │  Speed │ Volume │  │
│  ├──────┼──────────┼──────────┼────────┼────────┼────────┤  │
│  │BN-... │ 001      │16/06/2024│ 10:30  │  5.0   │  20.0  │  │
│  │      │          ├──────────┼────────┼────────┼────────┤  │
│  │      │          │  14:15   │  12:00 │ 10.0   │  20.0  │  │
│  │      │          ├──────────┼────────┼────────┼────────┤  │
│  │      │          │  Status   │ Infused│ Status │        │  │
│  │      │          │ ✓ Hoàn thành│18.5ml│ ✓      │        │  │
│  │      │          │ ✓ Hoàn thành│20.0ml│ ✓      │        │  │
│  └──────┴──────────┴──────────┴────────┴────────┴────────┘  │
│                                                                 │
│  Page 1 / 3                    [◀ Previous] [Next ▶]           │
└─────────────────────────────────────────────────────────────────┘
```

**Features Visualized:**
- 📊 9 sortable columns with indicators
- 🔍 Multi-field search bar
- 📅 Date range picker with quick filters
- 🎯 Status dropdown filter
- 📄 Export to CSV button
- 🔗 Clickable patient IDs
- 📋 Real-time updates indicator
- 📑 Pagination controls
- 🎨 Status badges with icons
- ⬆️⬇️ Sort direction indicators

---

## 5️⃣ Pump History Table (Filtered View)

```
┌─────────────────────────────────────────────────────────────────┐
│  Lịch sử truyền dịch                             [Export CSV]   │
│                                                                 │
│  [Nguyễn Văn...] [COMPLETED ▼] [16/06/2024 - 16/06/2024]       │
│                                                                 │
│  Showing 3 of 3 records  [× Clear filters]                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────┬────────┬──────────┬────────┬────────┬────────┐      │
│  │Patient│  Date  │  Start   │  Speed │ Volume │ Status │      │
│  ├──────┼────────┼──────────┼────────┼────────┼────────┤      │
│  │BN-...│16/06/24│  10:30   │  5.0   │  20.0  │  ✓     │      │
│  │      │        ├──────────┼────────┼────────┤        │      │
│  │      │        │  14:15   │        │        │        │      │
│  │      ├────────┼──────────┼────────┼────────┼────────┤      │
│  │      │16/06/24│  09:00   │  10.0  │  20.0  │  ✓     │      │
│  └──────┴────────┴──────────┴────────┴────────┴────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features Visualized:**
- 🎯 Active filter display
- 🔍 Patient name search query
- 📋 Status filter applied
- 📅 Date range selected
- ❌ Clear filters button
- 📊 Filtered results count

---

## 6️⃣ Complete Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Quản lý bệnh nhân                        [Register New]        │
│  Tìm kiếm, đăng ký và theo dõi lịch sử truyền dịch              │
│                                                                 │
│  [Demo Mode/Firebase Mode]                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  🔍 Tìm kiếm bệnh nhân                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🔍 Search patients...                    [Register]     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  [📋 Info] [📊 History (5)]                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  BN-240616-1234                    [Edit] [Delete]       │    │
│  │  Nguyễn Văn An - 38 tuổi - Nam - 70 kg                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────┬─────────────────────────────────┐    │
│  │  Thống kê nhanh      │  Hoạt động gần đây              │    │
│  │  • 5 lần truyền      │  • Lần cuối: 16/06 14:15        │    │
│  │  • 4 hoàn thành      │  • Trạng thái: ✓ Hoàn thành     │    │
│  │  • 98.5 ml tổng      │                                 │    │
│  └─────────────────────┴─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Lịch sử truyền dịch                                    [Export] │
│                                                                 │
│  [Search] [Status] [Date] [Quick Filters]                      │
│                                                                 │
│  ┌────────┬────────┬──────┬──────┬────────┬────────┬────────┐│
│  │Patient │  Date  │ Start│ Speed│ Volume│ Infused│ Status ││
│  ├────────┼────────┼──────┼──────┼────────┼────────┼────────┤│
│  │BN-12.. │16/06/24│10:30 │ 5.0  │  20.0 │  18.5  │  ✓     ││
│  │        │        │14:15 │      │        │        │        ││
│  │BN-12.. │16/06/24│09:00 │10.0  │  20.0 │  20.0  │  ✓     ││
│  │        │        │11:00 │      │        │        │        ││
│  └────────┴────────┴──────┴──────┴────────┴────────┴────────┘│
│                                                                 │
│  Page 1 / 1                                   [◀] [▶]          │
└─────────────────────────────────────────────────────────────────┘
```

**Features Visualized:**
- 📱 Complete patient management workflow
- 🔍 Integrated search and registration
- 📋 Tabbed interface (Info/History)
- 📊 Statistics cards
- 📄 Full history table with filters
- 🎨 Cohesive medical theme
- 📱 Responsive layout

---

## 7️⃣ Status Badge Styles

```
┌─────────────────────────────────────────────┐
│  ✓ Hoàn thành  (green badge with check)    │
│  ⏱️ Đã dừng     (yellow badge with clock)  │
│  ✗ Lỗi         (red badge with X)          │
│  ⚡ Đang chạy   (blue badge with bolt)      │
└─────────────────────────────────────────────┘
```

**Status Config:**
- **COMPLETED**: Green background, success text, CheckCircle2 icon
- **STOPPED**: Yellow background, warning text, Clock icon
- **ERROR**: Red background, destructive text, XCircle icon
- **RUNNING**: Blue background, primary text, AlertCircle icon

---

## 8️⃣ Responsive Design Breakpoints

### Desktop (> 1024px)
```
┌────────────────┬────────────────┬────────────────┐
│  Patient Search│  Patient Info  │  History Table │
│                │                │                │
│  Full width    │  2-column grid │  All 9 cols    │
└────────────────┴────────────────┴────────────────┘
```

### Tablet (768px - 1024px)
```
┌────────────────────────────────────────────────┐
│  Patient Search                                │
├────────────────────────────────────────────────┤
│  Patient Info (stacked)                        │
├────────────────────────────────────────────────┤
│  History Table (selected columns)              │
└────────────────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌────────────────────────┐
│  Patient Search        │
├────────────────────────┤
│  Patient Info           │
│  (compact mode)         │
├────────────────────────┤
│  History Table          │
│  (horizontal scroll)    │
└────────────────────────┘
```

---

## 9️⃣ Interaction States

### Loading State
```
┌────────────────────────────────────────────┐
│  ⏳ Đang tải dữ liệu...                    │
│                                            │
│  [████░░░░░░] Skeleton animation           │
│  [████░░░░░░] Skeleton animation           │
│  [████░░░░░░] Skeleton animation           │
└────────────────────────────────────────────┘
```

### Empty State
```
┌────────────────────────────────────────────┐
│                                            │
│         👤                                 │
│                                            │
│   Chưa chọn bệnh nhân                      │
│                                            │
│   Tìm kiếm hoặc đăng ký mới                 │
│                                            │
│   [Đăng ký bệnh nhân mới]                  │
│                                            │
└────────────────────────────────────────────┘
```

### Error State
```
┌────────────────────────────────────────────┐
│  ⚠️  Lỗi                                  │
│                                            │
│  Không thể tải dữ liệu. Vui lòng thử lại.  │
│                                            │
└────────────────────────────────────────────┘
```

### Success State
```
┌────────────────────────────────────────────┐
│  ✓ Đã sao chép mã bệnh nhân                │
│                                            │
│  ✓ Đăng ký thành công                      │
│                                            │
│  ✓ Đã xuất dữ liệu thành công              │
└────────────────────────────────────────────┘
```

---

## 🎨 Color Scheme

### Medical Theme Colors
```css
/* Primary */
--primary: #3B82F6          /* Blue */
--primary-foreground: #FFFFFF

/* Success */
--success: #10B981          /* Green */
--success-foreground: #FFFFFF

/* Warning */
--warning: #F59E0B          /* Amber */
--warning-foreground: #FFFFFF

/* Destructive */
--destructive: #EF4444      /* Red */
--destructive-foreground: #FFFFFF

/* Background */
--background: #0F172A       /* Dark blue */
--card: #1E293B             /* Lighter blue */
--border: #334155           /* Border blue */

/* Text */
--foreground: #F8FAFC       /* White */
--muted-foreground: #94A3B8  /* Gray */
```

---

## 📱 Component Hierarchy

```
PatientManagementApp
├── PatientSearchBar
│   ├── SearchInput
│   ├── ResultsDropdown
│   │   ├── PatientResultItem
│   │   └── LoadingSkeleton
│   └── RegisterButton
│
├── PatientInfoCard
│   ├── PatientIdBadge
│   ├── PatientDetails
│   └── ActionButtons
│
├── PumpHistoryTable
│   ├── FilterBar
│   │   ├── SearchInput
│   │   ├── StatusFilter
│   │   ├── DateRangePicker
│   │   └── ColumnToggle
│   ├── DataTable
│   │   ├── TableHeader
│   │   ├── TableBody
│   │   └── Pagination
│   └── ExportButton
│
└── PatientRegistrationDialog
    ├── FormFields
    └── SuccessMessage
```

---

## 🎯 Keyboard Shortcuts

### In Search Bar
- `↑/↓` - Navigate results
- `Enter` - Select patient
- `Escape` - Close dropdown

### In History Table
- `Tab` - Navigate cells
- `Enter` - View row details
- `Escape` - Close details

---

## 📊 Data Flow

```
User Action
     ↓
Component Event Handler
     ↓
State Update
     ↓
Firebase/API Call
     ↓
Data Refresh
     ↓
UI Re-render
     ↓
Animation/Transition
```

---

## 🎭 Accessibility Features

- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation support
- ✅ Focus management
- ✅ Screen reader friendly
- ✅ High contrast mode support
- ✅ Touch-friendly tap targets
- ✅ Semantic HTML structure

---

## 🚀 Performance Optimizations

- ⚡ Debounced search (300ms)
- ⚡ Virtual pagination (configurable page size)
- ⚡ Lazy loading of history data
- ⚡ Optimized re-renders with useMemo/useCallback
- ⚡ Efficient Firebase queries with indexes
- ⚡ Image lazy loading for avatars
- ⚡ Animation performance with Framer Motion

---

This visual guide provides a comprehensive overview of all patient management components. Use this as a reference for customization and integration!
