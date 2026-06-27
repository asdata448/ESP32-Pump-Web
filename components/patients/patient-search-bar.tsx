'use client'

import { useState, useCallback, useMemo } from 'react'
import { debounce } from 'lodash'
import { parseISO } from 'date-fns'
import { Search, Loader2, X, UserPlus, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Patient {
  id: string
  patientId: string
  fullName: string
  dateOfBirth: string // YYYY-MM-DD (canonical)
  gender: 'MALE' | 'FEMALE' // canonical
  weight: number
  createdAt?: string
}

export interface PatientSearchResult {
  patient: Patient
  matchScore: number
  matchFields: ('patientId' | 'fullName')[]
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
//════════════════════════════════════════════════════════════════════════════

interface PatientSearchBarProps {
  onPatientSelect: (patient: Patient) => void
  onRegisterNew?: () => void
  searchFunction?: (query: string) => Promise<PatientSearchResult[]>
  className?: string
  placeholder?: string
  showRegisterButton?: boolean
  debounceMs?: number
  disabled?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT SEARCH BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PatientSearchBar({
  onPatientSelect,
  onRegisterNew,
  searchFunction,
  className,
  placeholder = 'Tìm kiếm theo mã bệnh nhân hoặc tên...',
  showRegisterButton = true,
  debounceMs = 300,
  disabled = false,
}: PatientSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Default search function (in-memory search)
  const defaultSearchFunction = useCallback(async (query: string): Promise<PatientSearchResult[]> => {
    // This is a placeholder - in real app, this would query Firebase
    return []
  }, [])

  const performSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query.trim()) {
          setSearchResults([])
          setShowResults(false)
          setError(null)
          return
        }

        setIsSearching(true)
        setError(null)

        try {
          const searchFn = searchFunction || defaultSearchFunction
          const results = await searchFn(query)
          setSearchResults(results)
          setShowResults(true)
          setSelectedIndex(-1)
        } catch (err) {
          console.error('Search error:', err)
          setError('Tìm kiếm thất bại. Vui lòng thử lại.')
          setSearchResults([])
          setShowResults(false)
        } finally {
          setIsSearching(false)
        }
      }, debounceMs),
    [searchFunction, defaultSearchFunction, debounceMs]
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    performSearch(query)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
    setError(null)
    setSelectedIndex(-1)
  }

  const handleSelectPatient = (patient: Patient) => {
    onPatientSelect(patient)
    clearSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleSelectPatient(searchResults[selectedIndex].patient)
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowResults(false)
        setSelectedIndex(-1)
        break
    }
  }

  const calculateAge = (dateOfBirth: string): number => {
    const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : new Date(dateOfBirth as any)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    return age
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-primary/30 text-white rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  return (
    <div className={cn('relative w-full', className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          {isSearching ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <Input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true)
            }
          }}
          placeholder={placeholder}
          className={cn(
            'medical-input pl-10 pr-24',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={disabled}
          autoComplete="off"
        />

        {/* Action Buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              className="h-8 w-8 hover:bg-primary/20"
              title="Xóa tìm kiếm"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {showRegisterButton && onRegisterNew && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRegisterNew}
              className="h-8 w-8 hover:bg-primary/20 text-primary"
              title="Đăng ký bệnh nhân mới"
              disabled={disabled}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {showResults && (isSearching || searchResults.length > 0 || !searchQuery) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 medical-card border border-border rounded-lg shadow-lg overflow-hidden"
          >
            <div className="max-h-[400px] overflow-y-auto">
              {/* Loading State */}
              {isSearching && (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isSearching && searchResults.length === 0 && searchQuery && (
                <div className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">
                    Không tìm thấy bệnh nhân nào
                  </p>
                  {showRegisterButton && onRegisterNew && (
                    <Button
                      onClick={onRegisterNew}
                      className="medical-button"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Đăng ký bệnh nhân mới
                    </Button>
                  )}
                </div>
              )}

              {/* Results List */}
              {!isSearching && searchResults.length > 0 && (
                <div className="py-2">
                  {searchResults.map((result, index) => (
                    <motion.button
                      key={result.patient.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSelectPatient(result.patient)}
                      className={cn(
                        'w-full px-4 py-3 flex items-center gap-3 transition-colors',
                        'hover:bg-primary/10 text-left',
                        selectedIndex === index && 'bg-primary/20'
                      )}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-semibold">
                            {result.patient.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Patient Info */}
                      <div className="flex-1 min-w-0">
                        {/* Name */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white truncate">
                            {highlightMatch(result.patient.fullName, searchQuery)}
                          </span>
                          {result.matchScore > 0.7 && (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              Khớp tốt
                            </Badge>
                          )}
                        </div>

                        {/* Patient ID */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <span className="font-mono text-xs">
                            {highlightMatch(result.patient.patientId, searchQuery)}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {calculateAge(result.patient.dateOfBirth)} tuổi
                          </span>
                          <span>•</span>
                          <span>
                            {result.patient.gender === 'MALE' ? 'Nam' : 'Nữ'}
                          </span>
                          <span>•</span>
                          <span>{result.patient.weight} kg</span>
                        </div>
                      </div>

                      {/* Match Indicators */}
                      {result.matchFields.length > 0 && (
                        <div className="flex-shrink-0">
                          <div className="flex gap-1">
                            {result.matchFields.includes('patientId') && (
                              <Badge variant="outline" className="text-xs border-primary/50">
                                ID
                              </Badge>
                            )}
                            {result.matchFields.includes('fullName') && (
                              <Badge variant="outline" className="text-xs border-primary/50">
                                Tên
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Results Footer */}
              {!isSearching && searchResults.length > 0 && (
                <div className="px-4 py-2 border-t border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground text-center">
                    Tìm thấy {searchResults.length} bệnh nhân
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
