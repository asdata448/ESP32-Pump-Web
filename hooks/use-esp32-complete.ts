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

  // ===== REFS =====
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const failedRequestsRef = useRef(0)
  const lastNhatKyIdRef = useRef(0)
  const visibilityCheckRef = useRef(true)

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
      } catch (err) {
        setCauHinhKetNoi((prev) => ({
          ...prev,
          daKetNoi: false,
          dangKetNoi: false,
          loiKetNoi: 'Kết nối thất bại',
        }))
      }
    },
    [ping, startPolling]
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
  const batDauBom = useCallback(async () => {
    await callApi('/api/start')
    themLog('thanh_cong', 'Bắt đầu truyền dịch')
  }, [callApi, themLog])

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

  // ===== LOAD TỪ LOCALSTORAGE =====
  useEffect(() => {
    const saved = localStorage.getItem('esp32_base_url')
    if (saved) {
      ketNoi(saved.replace('http://', ''))
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
    capNhatCauHinh,
    chuanBi,
    batDauBom,
    tamDung,
    tiepTuc,
    dungBom,
    veHome,
    xacNhanBaoDong,
    layLichSu,
    themLog,
  }
}
