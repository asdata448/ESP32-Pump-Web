'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarIcon, CheckCircle2, Copy, User, Calendar, Weight, Baby, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'

// ═══════════════════════════════════════════════════════════════════════════
// FORM SCHEMA - Patient Registration Validation
// ═══════════════════════════════════════════════════════════════════════════

const patientFormSchema = z.object({
  fullName: z.string()
    .min(2, { message: 'Họ và tên phải có ít nhất 2 ký tự' })
    .max(100, { message: 'Họ và tên không được vượt quá 100 ký tự' }),
  dateOfBirth: z.date({
    required_error: 'Vui lòng chọn ngày tháng năm sinh',
    invalid_type_error: 'Ngày sinh không hợp lệ',
  })
    .refine((date) => date <= new Date(), {
      message: 'Ngày sinh không được là ngày trong tương lai',
    })
    .refine((date) => {
      const minDate = new Date()
      minDate.setFullYear(minDate.getFullYear() - 120)
      return date >= minDate
    }, { message: 'Tuổi không hợp lệ (quá 120 tuổi)' }),
  gender: z.enum(['MALE', 'FEMALE'], {
    required_error: 'Vui lòng chọn giới tính',
  }),
  weight: z.number({
    required_error: 'Vui lòng nhập cân nặng',
    invalid_type_error: 'Cân nặng phải là số',
  })
    .min(1, { message: 'Cân nặng phải lớn hơn 0 kg' })
    .max(300, { message: 'Cân nặng không được vượt quá 300 kg' }),
})

type PatientFormValues = z.infer<typeof patientFormSchema>

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT REGISTRATION DIALOG COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface PatientRegistrationDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (patientData: PatientFormValues & { patientId: string }) => void
}

interface GeneratedPatient {
  patientId: string
  patientData: PatientFormValues
}

export function PatientRegistrationDialog({
  isOpen,
  onClose,
  onSuccess,
}: PatientRegistrationDialogProps) {
  const [generatedPatient, setGeneratedPatient] = useState<GeneratedPatient | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Initialize form with default values
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      fullName: '',
      dateOfBirth: undefined,
      gender: undefined,
      weight: undefined,
    },
    mode: 'onChange', // Validate on change for better UX
  })

  // Handle form submission — POST to API, ID generated server-side
  const onSubmit = async (data: PatientFormValues) => {
    setSubmitError(null)

    // Convert Date -> YYYY-MM-DD string for the API
    const payload = {
      fullName: data.fullName,
      dateOfBirth: format(data.dateOfBirth, 'yyyy-MM-dd'),
      gender: data.gender,
      weight: data.weight,
    }

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        // Server returned validation or server error
        const message =
          result?.error || 'Không thể lưu hồ sơ. Vui lòng thử lại.'
        setSubmitError(message)
        return
      }

      // API returns { success, patient: { patientId, ... } }
      const patientId: string = result?.patient?.patientId || result?.data?.patientId
      if (!patientId) {
        setSubmitError('Phản hồi từ server không chứa mã bệnh nhân.')
        return
      }

      const patientWithId: GeneratedPatient = { patientId, patientData: data }
      setGeneratedPatient(patientWithId)
      setShowSuccess(true)

      // Notify parent component
      if (onSuccess) {
        onSuccess({ ...data, patientId })
      }
    } catch (error) {
      console.error('Error registering patient:', error)
      setSubmitError('Lỗi kết nối tới server. Vui lòng kiểm tra mạng và thử lại.')
    }
  }

  // Copy Patient ID to clipboard
  const copyToClipboard = async () => {
    if (!generatedPatient) return

    try {
      await navigator.clipboard.writeText(generatedPatient.patientId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Start new pump session with this patient
  const handleStartSession = () => {
    if (onSuccess && generatedPatient) {
      onSuccess(generatedPatient)
      handleClose()
    }
  }

  // Reset form and close dialog
  const handleClose = () => {
    form.reset()
    setGeneratedPatient(null)
    setShowSuccess(false)
    setCopied(false)
    setSubmitError(null)
    onClose()
  }

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date()
    let age = today.getFullYear() - dateOfBirth.getFullYear()
    const monthDiff = today.getMonth() - dateOfBirth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--
    }
    return age
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="medical-card max-w-2xl max-h-[90vh] overflow-y-auto">
        {!showSuccess ? (
          <>
            {/* Header */}
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-white">
                    Tiếp nhận bệnh nhân mới
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Nhập thông tin bệnh nhân để tạo hồ sơ
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Full Name */}
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-medium">
                        Họ và tên <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nguyễn Văn A"
                          className="medical-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date of Birth — chọn Ngày / Tháng / Năm bằng dropdown (chọn năm sinh nhanh) */}
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => {
                    const dob = field.value as Date | undefined
                    const curY = dob ? dob.getFullYear() : 0
                    const curM = dob ? dob.getMonth() : -1 // 0-11
                    const curD = dob ? dob.getDate() : 0
                    const daysInMonth =
                      curY > 0 && curM >= 0 ? new Date(curY, curM + 1, 0).getDate() : 31
                    const nowYear = new Date().getFullYear()
                    const years = Array.from({ length: nowYear - 1925 + 1 }, (_, i) => nowYear - i)

                    const setPart = (part: 'y' | 'm' | 'd', val: number) => {
                      const y = part === 'y' ? val : curY
                      const m = part === 'm' ? val : curM < 0 ? 0 : curM
                      const d = part === 'd' ? val : curD || 1
                      if (y > 0) {
                        const dim = new Date(y, m + 1, 0).getDate()
                        field.onChange(new Date(y, m, Math.min(d, dim)))
                      }
                    }

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-white font-medium">
                          Ngày tháng năm sinh <span className="text-destructive">*</span>
                        </FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {/* Ngày */}
                          <select
                            className="medical-input"
                            value={curD || ''}
                            onChange={(e) => setPart('d', parseInt(e.target.value, 10))}
                          >
                            <option value="" disabled>Ngày</option>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dn) => (
                              <option key={dn} value={dn}>{dn}</option>
                            ))}
                          </select>
                          {/* Tháng */}
                          <select
                            className="medical-input"
                            value={curM >= 0 ? curM : ''}
                            onChange={(e) => setPart('m', parseInt(e.target.value, 10))}
                          >
                            <option value="" disabled>Tháng</option>
                            {Array.from({ length: 12 }, (_, i) => i).map((mm) => (
                              <option key={mm} value={mm}>Tháng {mm + 1}</option>
                            ))}
                          </select>
                          {/* Năm */}
                          <select
                            className="medical-input"
                            value={curY || ''}
                            onChange={(e) => setPart('y', parseInt(e.target.value, 10))}
                          >
                            <option value="" disabled>Năm</option>
                            {years.map((yn) => (
                              <option key={yn} value={yn}>{yn}</option>
                            ))}
                          </select>
                        </div>
                        {field.value && (
                          <FormDescription className="text-muted-foreground">
                            Tuổi: {calculateAge(field.value)} tuổi
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                {/* Gender */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-medium">
                        Giới tính <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="MALE" id="male" />
                            <label
                              htmlFor="male"
                              className="cursor-pointer text-white select-none"
                            >
                              Nam
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="FEMALE" id="female" />
                            <label
                              htmlFor="female"
                              className="cursor-pointer text-white select-none"
                            >
                              Nữ
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Weight */}
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-medium">
                        Cân nặng <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="70"
                            className="medical-input pr-12"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? undefined : parseFloat(value))
                            }}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                            kg
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-muted-foreground">
                        Phạm vi: 1 - 300 kg
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Patient ID (Disabled) */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Mã bệnh nhân
                  </label>
                  <Input
                    disabled
                    placeholder="Hệ thống tự động cấp sau khi lưu"
                    className="medical-input opacity-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mã bệnh nhân sẽ được tự động tạo sau khi lưu hồ sơ
                  </p>
                </div>

                {/* Submit error (if any) */}
                {submitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                {/* Form Actions */}
                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="medical-button-outline"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="medical-button"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu hồ sơ'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            {/* Success Dialog */}
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-6"
              >
                {/* Success Icon */}
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center"
                  >
                    <CheckCircle2 className="h-10 w-10 text-success" />
                  </motion.div>
                </div>

                {/* Success Message */}
                <div>
                  <DialogTitle className="text-2xl font-bold text-white mb-2">
                    Đăng ký thành công!
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Hồ sơ bệnh nhân đã được tạo thành công
                  </DialogDescription>
                </div>

                {/* Patient ID Display */}
                {generatedPatient && (
                  <div className="medical-card bg-primary/10 border-primary/30 p-6 rounded-lg space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground block mb-2">
                        Mã bệnh nhân
                      </label>
                      <div className="flex items-center justify-center gap-3">
                        <div className="text-3xl font-mono font-bold text-primary tracking-wider">
                          {generatedPatient.patientId}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={copyToClipboard}
                          className="hover:bg-primary/20 transition-colors"
                          title="Sao chép mã bệnh nhân"
                        >
                          {copied ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <Copy className="h-5 w-5 text-primary" />
                          )}
                        </Button>
                      </div>
                      {copied && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-success mt-1"
                        >
                          Đã sao chép vào clipboard
                        </motion.p>
                      )}
                    </div>

                    {/* Patient Summary */}
                    <div className="text-left space-y-2 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-white">{generatedPatient.patientData.fullName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-white">
                          {format(generatedPatient.patientData.dateOfBirth, 'dd/MM/yyyy')}
                          {' ('}
                          {calculateAge(generatedPatient.patientData.dateOfBirth)} tuổi
                          {')'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Giới tính:</span>
                        <span className="text-white">
                          {generatedPatient.patientData.gender === 'MALE' ? 'Nam' : 'Nữ'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Weight className="h-4 w-4 text-muted-foreground" />
                        <span className="text-white">{generatedPatient.patientData.weight} kg</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <DialogFooter className="gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="medical-button-outline"
                  >
                    Đóng
                  </Button>
                  <Button
                    onClick={handleStartSession}
                    className="medical-button"
                  >
                    <Baby className="h-4 w-4 mr-2" />
                    Bắt đầu phiên bơm mới
                  </Button>
                </DialogFooter>
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type { PatientFormValues }
