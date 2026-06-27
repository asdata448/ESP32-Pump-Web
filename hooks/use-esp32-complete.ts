'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  TrangThaiESP32,
  CauHinhKetNoi,
  TrangThaiUseESP32,
  MucNhatKy,
  MucLichSu,
  CAU_HINH_KET_NOI_MAC_DINH,
  TRANG_THAI_ESP32_MAC_DINH,
  LOAI_ONG_TIEM,
} from '@/lib/esp32-types'
import {
  sendESP32Command,
  subscribeToESP32Status,
  autoDetectDeviceId,
  getAllDevices,
  type ESP32DeviceStatus,
  type ESP32Command,
} from '@/lib/firebase'
import { chuanHoaTenAscii } from '@/lib/patient-utils'

/**
 * Fetch với timeout 5 giây dùng AbortController
 */
async function fetchVoiTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs = 5000
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return res
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

/**
 * useESP32 - Hook chính quản lý tất cả logic kết nối và điều khiển máy bơm
 */
export function useESP32(): TrangThaiUseESP32 {
  // ===== STATE =====
  const [cauHinhKetNoi, setCauHinhKetNoi] = useState<CauHinhKetNoi>(
    CAU_HINH_KET_NOI_MAC_DINH
  )
  const [trangThaiESP32, setTrangThaiESP32] = useState<TrangThaiESP32 | null>(
    null
  )
  const [nhatKySuKien, setNhatKySuKien] = useState<MucNhatKy[]>([])
  const [lichSuBom, setLichSuBom] = useState<MucLichSu[]>([])
  const [cheDoDemo, setCheDoDemo] = useState(false)

  // ===== FIREBASE STATE =====
  const [cheDoKetNoi, setCheDoKetNoi] = useState<'HTTP' | 'FIREBASE'>('FIREBASE')
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [dangKetNoiFirebase, setDangKetNoiFirebase] = useState(false)

  // ===== REFS =====
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const failedRequestsRef = useRef(0)
  const lastNhatKyIdRef = useRef(0)
  const visibilityCheckRef = useRef(true)
  const firebaseUnsubscribeRef = useRef<(() => void) | null>(null)

  // ===== THÊM LOG =====
  const themLog = useCallback((loai: MucNhatKy['loai'], noiDung: string) => {
    setNhatKySuKien((prev) => [
      {
        id: ++lastNhatKyIdRef.current,
        loai,
        noiDung,
        thoiGian: new Date(),
      },
      ...prev,
    ].slice(0, 50)) // Lưu tối đa 50 dòng
  }, [])

  // ===== XỬ LÝ VISIBILITY (không poll khi tab ẩn) =====
  useEffect(() => {
    const handleVisibilityChange = () => {
      visibilityCheckRef.current = document.visibilityState === 'visible'
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // ===== PING ESP32 =====
  const ping = useCallback(async (baseUrl: string) => {
    const startTime = Date.now()
    try {
      const res = await fetchVoiTimeout(`${baseUrl}/api/status`, {}, 5000)
      const latency = Date.now() - startTime

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data: TrangThaiESP32 = await res.json()
      setCauHinhKetNoi((prev) => ({
        ...prev,
        daKetNoi: true,
        dangKetNoi: false,
        doTreMs: latency,
        loiKetNoi: null,
      }))
      setTrangThaiESP32(data)
      failedRequestsRef.current = 0
      themLog('thanh_cong', `Kết nối ESP32 thành công (${latency}ms)`)
    } catch (err) {
      let errorMsg = 'Không biết lỗi'
      if (err instanceof TypeError) {
        errorMsg = 'Không tìm thấy thiết bị'
      } else if ((err as Error).name === 'AbortError') {
        errorMsg = 'Hết thời gian kết nối'
      }

      setCauHinhKetNoi((prev) => ({
        ...prev,
        daKetNoi: false,
        loiKetNoi: errorMsg,
      }))

      themLog('loi', `Lỗi kết nối: ${errorMsg}`)
    }
  }, [themLog])

  // ===== POLLING STATUS =====
  const startPolling = useCallback(
    (baseUrl: string) => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }

      pollingIntervalRef.current = setInterval(async () => {
        if (!visibilityCheckRef.current) return // Bỏ qua khi tab ẩn

        try {
          const res = await fetchVoiTimeout(`${baseUrl}/api/status`, {}, 5000)

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`)
          }

          const data: TrangThaiESP32 = await res.json()
          setTrangThaiESP32(data)
          setCauHinhKetNoi((prev) => ({
            ...prev,
            daKetNoi: true,
            loiKetNoi: null,
          }))
          failedRequestsRef.current = 0
        } catch (err) {
          failedRequestsRef.current++

          // Nếu lỗi 3 lần liên tiếp → đánh dấu mất kết nối
          if (failedRequestsRef.current >= 3) {
            setCauHinhKetNoi((prev) => ({
              ...prev,
              daKetNoi: false,
              loiKetNoi: 'Mất kết nối ESP32',
            }))
            themLog('canh_bao', 'Mất kết nối ESP32')
          }
        }
      }, 1000) // Polling mỗi 1 giây
    },
    [themLog]
  )

  // ===== KẾT NỐI =====
  const ketNoi = useCallback(
    async (ip: string) => {
      const baseUrl = `http://${ip}`
      // CRITICAL: Switch to HTTP mode when connecting direct
      setCheDoKetNoi('HTTP')

      setCauHinhKetNoi((prev) => ({
        ...prev,
        baseUrl,
        dangKetNoi: true,
        loiKetNoi: null,
      }))

      try {
        await ping(baseUrl)
        localStorage.setItem('esp32_base_url', baseUrl)
        startPolling(baseUrl)
        themLog('thanh_cong', `Đã kết nối ESP32 tại ${baseUrl}`)
      } catch (err) {
        setCauHinhKetNoi((prev) => ({
          ...prev,
          daKetNoi: false,
          dangKetNoi: false,
          loiKetNoi: 'Kết nối thất bại',
        }))
        themLog('loi', 'Kết nối ESP32 thất bại')
      }
    },
    [ping, startPolling, themLog]
  )

  // ===== NGẮT KẾT NỐI =====
  const ngKetNoi = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    if (reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current)
      reconnectIntervalRef.current = null
    }

    setCauHinhKetNoi((prev) => ({
      ...prev,
      daKetNoi: false,
      loiKetNoi: null,
    }))
    setTrangThaiESP32(null)
    localStorage.removeItem('esp32_base_url')
    themLog('thong_tin', 'Đã ngắt kết nối')
  }, [themLog])

  // ===== API CALLS =====

  const callApi = useCallback(
    async (endpoint: string, method = 'POST') => {
      if (!cauHinhKetNoi.daKetNoi) {
        throw new Error('Không kết nối ESP32')
      }

      const url = `${cauHinhKetNoi.baseUrl}${endpoint}`
      const res = await fetchVoiTimeout(url, { method }, 5000)

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `HTTP ${res.status}`)
      }

      return res.json()
    },
    [cauHinhKetNoi]
  )

  // CẬP NHẬT CẤU HÌNH
  const capNhatCauHinh = useCallback(
    async (index: number, speed: number, volume: number) => {
      if (!cauHinhKetNoi.daKetNoi) throw new Error('Không kết nối')

      const body = JSON.stringify({
        syringe_index: index,
        speed_mlh: speed,
        volume_ml: volume,
      })

      const url = `${cauHinhKetNoi.baseUrl}/api/config`
      const res = await fetchVoiTimeout(url, { method: 'POST', body }, 5000)

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `HTTP ${res.status}`)
      }

      themLog('thong_tin', `Cập nhật cấu hình: ${speed} ml/h, ${volume} ml`)
    },
    [cauHinhKetNoi, themLog]
  )

  // CHUẨN BỊ
  const chuanBi = useCallback(async () => {
    await callApi('/api/prepare')
    themLog('thong_tin', 'Bắt đầu chuẩn bị ống')
  }, [callApi, themLog])

  // BẮT ĐẦU BƠM
  const batDauBom = useCallback(
    async (benhNhan?: { patientId?: string; fullName?: string }) => {
      if (!cauHinhKetNoi.daKetNoi) throw new Error('Khong ket noi ESP32')

      const body = JSON.stringify({
        patient_id: benhNhan?.patientId ?? '',
        patient_name: chuanHoaTenAscii(benhNhan?.fullName),
      })

      const url = `${cauHinhKetNoi.baseUrl}/api/start`
      const res = await fetchVoiTimeout(url, { method: 'POST', body }, 5000)

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `HTTP ${res.status}`)
      }

      themLog('thanh_cong', 'Bat dau truyen dich')
    },
    [cauHinhKetNoi, themLog]
  )

  // TẠM DỪNG
  const tamDung = useCallback(async () => {
    await callApi('/api/pause')
    themLog('canh_bao', 'Tạm dừng bơm')
  }, [callApi, themLog])

  // TIẾP TỤC
  const tiepTuc = useCallback(async () => {
    await callApi('/api/resume')
    themLog('thanh_cong', 'Tiếp tục bơm')
  }, [callApi, themLog])

  // DỪNG
  const dungBom = useCallback(async () => {
    await callApi('/api/stop')
    themLog('thong_tin', 'Đã dừng bơm')
  }, [callApi, themLog])

  // VỀ HOME
  const veHome = useCallback(async () => {
    await callApi('/api/rehome')
    themLog('thong_tin', 'Đang về home')
  }, [callApi, themLog])

  // XÁC NHẬN BÁO ĐỘNG
  const xacNhanBaoDong = useCallback(async () => {
    await callApi('/api/reset_alarm')
    themLog('thanh_cong', 'Đã xác nhận báo động')
  }, [callApi, themLog])

  // LẤY LỊCH SỬ
  const layLichSu = useCallback(async () => {
    if (!cauHinhKetNoi.daKetNoi) return

    try {
      const url = `${cauHinhKetNoi.baseUrl}/api/history`
      const res = await fetchVoiTimeout(url, {}, 5000)

      if (res.ok) {
        const data: Array<{
          speed_mlh: number
          volume_ml: number
          total_sec: number
          syringe: string
        }> = await res.json()

        setLichSuBom(
          data.map((item) => ({
            ...item,
            thoiGianGhi: new Date(),
          }))
        )
      }
    } catch (err) {
      // Bỏ qua lỗi lấy lịch sử
    }
  }, [cauHinhKetNoi])

  // ===== FIREBASE FUNCTIONS =====

  // Auto-detect device ID from Firebase
  const tuongThichDeviceId = useCallback(async () => {
    setDangKetNoiFirebase(true)
    themLog('thong_tin', 'Đang tìm kiếm device...')

    try {
      const detectedId = await autoDetectDeviceId()
      if (detectedId) {
        setDeviceId(detectedId)
        localStorage.setItem('esp32_device_id', detectedId)
        themLog('thanh_cong', `Tìm thấy device: ${detectedId}`)
        return detectedId
      } else {
        themLog('canh_bao', 'Không tìm thấy device nào')
        return null
      }
    } catch (err) {
      themLog('loi', 'Lỗi tìm device: ' + (err as Error).message)
      return null
    } finally {
      setDangKetNoiFirebase(false)
    }
  }, [themLog])

  // Connect to Firebase device
  const ketNoiFirebase = useCallback(async (id?: string) => {
    const targetDeviceId = id || deviceId

    if (!targetDeviceId) {
      const detected = await tuongThichDeviceId()
      if (!detected) {
        setCauHinhKetNoi((prev) => ({
          ...prev,
          daKetNoi: false,
          loiKetNoi: 'Không tìm thấy device',
        }))
        return
      }
      setDeviceId(detected)
    }

    setCheDoKetNoi('FIREBASE')
    setCauHinhKetNoi((prev) => ({
      ...prev,
      daKetNoi: true,
      dangKetNoi: false,
      loiKetNoi: null,
    }))

    themLog('thong_tin', 'Đã kết nối Firebase')
  }, [deviceId, tuongThichDeviceId, themLog])

  // Subscribe to Firebase status updates
  useEffect(() => {
    if (cheDoKetNoi !== 'FIREBASE' || !deviceId) {
      return
    }

    themLog('thong_tin', `Đang theo dõi status từ device: ${deviceId}`)

    firebaseUnsubscribeRef.current = subscribeToESP32Status(
      deviceId,
      (status) => {
        if (status) {
          // Convert ESP32DeviceStatus to TrangThaiESP32
          setTrangThaiESP32({
            state: status.state as TrangThaiESP32['state'],
            syringe: status.syringe,
            syringe_index: status.syringe_index,
            speed_mlh: status.speed_mlh,
            volume_ml: status.volume_ml,
            remaining_sec: status.remaining_sec,
            steps_completed: status.steps_completed,
            steps_total: status.steps_total,
            homed: status.homed,
            contact_found: status.contact_found,
            fsr_alert: status.fsr_alert,
            pump_running: status.pump_running,
            paused: status.paused,
            fsr_raw: status.fsr_raw,
            fsr_presence_threshold: status.fsr_presence_threshold,
            fsr_occlusion_threshold: status.fsr_occlusion_threshold,
            limit_pressed: status.limit_pressed,
            buzzer_on: status.buzzer_on,
            ip: status.ip,
            wifi_mode: status.wifi_mode,
          })
          setCauHinhKetNoi((prev) => ({
            ...prev,
            daKetNoi: true,
            loiKetNoi: null,
          }))
        } else {
          setCauHinhKetNoi((prev) => ({
            ...prev,
            daKetNoi: false,
            loiKetNoi: 'Không nhận được status',
          }))
        }
      }
    )

    return () => {
      if (firebaseUnsubscribeRef.current) {
        firebaseUnsubscribeRef.current()
        firebaseUnsubscribeRef.current = null
      }
    }
  }, [cheDoKetNoi, deviceId])

  // Firebase command functions
  const guiLenhFirebase = useCallback(async (
    command: ESP32Command
  ): Promise<boolean> => {
    if (!deviceId) {
      themLog('loi', 'Chưa có device ID')
      return false
    }

    if (cheDoKetNoi !== 'FIREBASE') {
      themLog('loi', 'Chưa ở chế độ Firebase')
      return false
    }

    const success = await sendESP32Command(deviceId, command)
    if (success) {
      themLog('thong_tin', `Đã gửi lệnh: ${command.type}`)
    } else {
      themLog('loi', `Lỗi gửi lệnh: ${command.type}`)
    }
    return success
  }, [deviceId, cheDoKetNoi, themLog])

  // Override command functions to use Firebase when in Firebase mode
  const capNhatCauHinhFirebase = useCallback(async (
    index: number,
    speed: number,
    volume: number
  ) => {
    return await guiLenhFirebase({
      type: 'CONFIG',
      params: { syringe_index: index, speed_mlh: speed, volume_ml: volume }
    })
  }, [guiLenhFirebase])

  const chuanBiFirebase = useCallback(async () => {
    return await guiLenhFirebase({ type: 'PREPARE' })
  }, [guiLenhFirebase])

  const batDauBomFirebase = useCallback(
    async (benhNhan?: { patientId?: string; fullName?: string }) => {
      return await guiLenhFirebase({
        type: 'START',
        params: {
          patient_id: benhNhan?.patientId ?? '',
          patient_name: chuanHoaTenAscii(benhNhan?.fullName),
        },
      })
    },
    [guiLenhFirebase]
  )

  const tamDungFirebase = useCallback(async () => {
    return await guiLenhFirebase({ type: 'PAUSE' })
  }, [guiLenhFirebase])

  const tiepTucFirebase = useCallback(async () => {
    return await guiLenhFirebase({ type: 'RESUME' })
  }, [guiLenhFirebase])

  const dungBomFirebase = useCallback(async () => {
    return await guiLenhFirebase({ type: 'STOP' })
  }, [guiLenhFirebase])

  const veHomeFirebase = useCallback(async () => {
    return await guiLenhFirebase({ type: 'REHOME' })
  }, [guiLenhFirebase])

  const xacNhanBaoDongFirebase = useCallback(async () => {
    return await guiLenhFirebase({ type: 'RESET_ALARM' })
  }, [guiLenhFirebase])

  // Wrapper functions that route to HTTP or Firebase based on mode
  const capNhatCauHinhWrapper = useCallback(async (index: number, speed: number, volume: number) => {
    if (cheDoKetNoi === 'FIREBASE') {
      return await capNhatCauHinhFirebase(index, speed, volume)
    }
    return await capNhatCauHinh(index, speed, volume)
  }, [cheDoKetNoi, capNhatCauHinhFirebase, capNhatCauHinh])

  const chuanBiWrapper = useCallback(async () => {
    if (cheDoKetNoi === 'FIREBASE') {
      return await chuanBiFirebase()
    }
    return await chuanBi()
  }, [cheDoKetNoi, chuanBiFirebase, chuanBi])

  const batDauBomWrapper = useCallback(
    async (benhNhan?: { patientId?: string; fullName?: string }) => {
      if (cheDoKetNoi === 'FIREBASE') {
        return await batDauBomFirebase(benhNhan)
      }
      return await batDauBom(benhNhan)
    },
    [cheDoKetNoi, batDauBomFirebase, batDauBom]
  )

  const tamDungWrapper = useCallback(async () => {
    if (cheDoKetNoi === 'FIREBASE') {
      return await tamDungFirebase()
    }
    return await tamDung()
  }, [cheDoKetNoi, tamDungFirebase, tamDung])

  const tiepTucWrapper = useCallback(async () => {
    if (cheDoKetNoi === 'FIREBASE') {
      return await tiepTucFirebase()
    }
    return await tiepTuc()
  }, [cheDoKetNoi, tiepTucFirebase, tiepTuc])

  const dungBomWrapper = useCallback(async () => {
    if (cheDoKetNoi === 'FIREBASE') {
      return await dungBomFirebase()
    }
    return await dungBom()
  }, [cheDoKetNoi, dungBomFirebase, dungBom])

  const veHomeWrapper = useCallback(async () => {
    if (cheDoKetNoi === 'FIREBASE') {
      return await veHomeFirebase()
    }
    return await veHome()
  }, [cheDoKetNoi, veHomeFirebase, veHome])

  const xacNhanBaoDongWrapper = useCallback(async () => {
    if (cheDoKetNoi === 'FIREBASE') {
      return await xacNhanBaoDongFirebase()
    }
    return await xacNhanBaoDong()
  }, [cheDoKetNoi, xacNhanBaoDongFirebase, xacNhanBaoDong])

  // ===== LOAD TỪ LOCALSTORAGE =====
  useEffect(() => {
    // Load device ID from localStorage
    const savedDeviceId = localStorage.getItem('esp32_device_id')
    if (savedDeviceId) {
      setDeviceId(savedDeviceId)
    }

    // Mặc định WiFi Direct (HTTP). KHÔNG bao giờ tự vào chế độ Firebase Cloud nữa.
    setCheDoKetNoi('HTTP')

    // Chỉ tự kết nối lại khi trước đó đã dùng HTTP (WiFi Direct) và còn lưu base URL
    const savedMode = localStorage.getItem('esp32_connection_mode')
    const savedBaseUrl = localStorage.getItem('esp32_base_url')
    if (savedMode === 'HTTP' && savedBaseUrl) {
      ketNoi(savedBaseUrl.replace('http://', ''))
    }
  }, [ketNoi])

  // ===== RETURN =====
  return {
    cauHinhKetNoi,
    trangThaiESP32,
    nhatKySuKien,
    lichSuBom,
    cheDoDemo,
    ketNoi,
    ngKetNoi,
    capNhatCauHinh: capNhatCauHinhWrapper,
    chuanBi: chuanBiWrapper,
    batDauBom: batDauBomWrapper,
    tamDung: tamDungWrapper,
    tiepTuc: tiepTucWrapper,
    dungBom: dungBomWrapper,
    veHome: veHomeWrapper,
    xacNhanBaoDong: xacNhanBaoDongWrapper,
    layLichSu,
    themLog,
    // Firebase state and functions
    cheDoKetNoi,
    setCheDoKetNoiFirebase: setCheDoKetNoi,
    deviceId,
    dangKetNoiFirebase,
    ketNoiFirebase,
    tuongThichDeviceId,
  }
}
