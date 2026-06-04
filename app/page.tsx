'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Home,
  X,
  Plus,
  Minus,
  Check,
  Wifi,
  WifiOff,
  Bell,
  Activity,
  Trash2,
  RefreshCw,
  Volume2,
  VolumeX,
  History,
  Cloud,
  Lock,
} from 'lucide-react'
import { useESP32 } from '@/hooks/use-esp32-complete'
import { TrangThaiESP32, MucNhatKy, MucLichSu } from '@/lib/esp32-types'
import { useFirebaseHistory } from '@/hooks/use-firebase-history'
import { FirebaseHistoryPanel } from '@/components/firebase/firebase-history-panel'
import { ProtocolSelectionDialog } from '@/components/esp32/protocol-selection-dialog'
import { PROTOCOLS, type ProtocolId, type SyringeType } from '@/lib/pump-types'

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT - Toàn bộ logic trong 1 file
// ═══════════════════════════════════════════════════════════════════════════

export default function App() {
  const esp32 = useESP32()
  const {
    cauHinhKetNoi,
    trangThaiESP32,
    nhatKySuKien,
    lichSuBom,
    ketNoi,
    ngKetNoi,
    themLog,
    capNhatCauHinh,
    chuanBi,
    batDauBom,
    tamDung,
    tiepTuc,
    dungBom,
    veHome,
    xacNhanBaoDong,
    layLichSu,
    cheDoDemo,
    // Firebase
    cheDoKetNoi: cheDoKetNoiFirebase,
    deviceId: deviceIdFromHook,
    dangKetNoiFirebase,
    ketNoiFirebase,
    tuongThichDeviceId,
  } = esp32

  // ===== STATE UI =====
  const [diaChi, setDiaChi] = useState('192.168.4.1')
  const [loi, setLoi] = useState<string | null>(null)
  const [connectionMode, setConnectionMode] = useState<'FIREBASE' | 'HTTP'>('FIREBASE')
  const [hienThiModalTocDo, setHienThiModalTocDo] = useState(false)
  const [hienThiModalTheTich, setHienThiModalTheTich] = useState(false)
  const [hienThiModalOng, setHienThiModalOng] = useState(false)
  const [hienThiXacNhanDung, setHienThiXacNhanDung] = useState(false)
  const [hienThiModalHoanTat, setHienThiModalHoanTat] = useState(false)
  const [hienThiLichSuLocal, setHienThiLichSuLocal] = useState(false)
  const [thoiGianHienTai, setThoiGianHienTai] = useState('--:--')
  const [cheDoKetNoi, setCheDoKetNoi] = useState(false)
  const [prevTrangThai, setPrevTrangThai] = useState<TrangThaiESP32 | null>(null)

  // THÊM: Popup xác nhận & Màn hình chỉnh sửa
  const [hienThiPopupXacNhan, setHienThiPopupXacNhan] = useState(false)
  const [hienThiManHinhChinhSua, setHienThiManHinhChinhSua] = useState(false)
  const [chinhSuaSyringe, setChinhSuaSyringe] = useState(0)
  const [chinhSuaSpeed, setChinhSuaSpeed] = useState(60)
  const [chinhSuaVolume, setChinhSuaVolume] = useState(5)
  const [prevContactFound, setPrevContactFound] = useState(false)

  // ===== PROTOCOL STATE =====
  const [hienThiProtocolSelect, setHienThiProtocolSelect] = useState(false)
  const [selectedProtocolId, setSelectedProtocolId] = useState<ProtocolId | null>(null)
  const [selectedProtocol, setSelectedProtocol] = useState<any>(null)

  // ===== HANDLERS =====
  const handleSelectProtocol = (
    protocolId: ProtocolId | null,
    syringeType: SyringeType,
    speed: number,
    volume: number
  ) => {
    if (protocolId) {
      const protocol = PROTOCOLS.find(p => p.id === protocolId)
      setSelectedProtocolId(protocolId)
      setSelectedProtocol(protocol)
      setChinhSuaSpeed(speed)
      setChinhSuaVolume(volume)
      setChinhSuaSyringe(syringeType === '10CC' ? 0 : 1)
      // Sync to ESP32/Firebase
      capNhatCauHinh(syringeType === '10CC' ? 0 : 1, speed, volume)
    } else {
      setSelectedProtocolId(null)
      setSelectedProtocol(null)
      // Manual mode - giữ nguyên speed/volume hiện tại
      // Không gửi command để không thay đổi settings
    }
  }

  const openProtocolSelect = () => {
    setHienThiProtocolSelect(true)
  }

  // ===== FIREBASE STATE =====
  const [hienThiLichSuFirebase, setHienThiLichSuFirebase] = useState(false)
  const [firebaseEnabled, setFirebaseEnabled] = useState(true)
  const [deviceId, setDeviceId] = useState<string>('')
  const [dangLuuFirebase, setDangLuuFirebase] = useState(false)
  const [loiLuuFirebase, setLoiLuuFirebase] = useState<string | null>(null)

  // Get device ID from localStorage on mount (client-side only)
  useEffect(() => {
    let id = localStorage.getItem('esp32_device_id')
    if (!id) {
      id = 'esp32-pump-' + Date.now().toString(36)
      localStorage.setItem('esp32_device_id', id)
    }
    setDeviceId(id)
  }, [])

  // Firebase history hook - only enable when deviceId is available
  const firebase = useFirebaseHistory({
    deviceId: deviceId,
    enabled: firebaseEnabled && !!deviceId,
    limit: 20,
    dataSource: 'real', // Data thật từ ESP32
  })

  // ===== LOAD LOCALSTORAGE =====
  useEffect(() => {
    const saved = localStorage.getItem('esp32_base_url')
    if (saved) {
      setCheDoKetNoi(true)
    } else {
      setCheDoKetNoi(false)
    }
  }, [])

  // ===== CẬP NHẬT THỜI GIAN =====
  useEffect(() => {
    const cap = () => {
      const now = new Date()
      setThoiGianHienTai(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      )
    }
    cap()
    const interval = setInterval(cap, 1000)
    return () => clearInterval(interval)
  }, [])

  // ===== PHÁT HIỆN TRẠNG THÁI HOÀN TẤT =====
  useEffect(() => {
    if (trangThaiESP32 && trangThaiESP32.state === 'DONE' && prevTrangThai?.state !== 'DONE') {
      setHienThiModalHoanTat(true)
    }
    setPrevTrangThai(trangThaiESP32)
  }, [trangThaiESP32])

  // ===== THÊM: PHÁT HIỆN CONTACT_FOUND - HIỆN POPUP XÁC NHẬN =====
  useEffect(() => {
    if (trangThaiESP32?.contact_found && !prevContactFound) {
      setHienThiPopupXacNhan(true)
    }
    setPrevContactFound(trangThaiESP32?.contact_found || false)
  }, [trangThaiESP32?.contact_found])

  // ===== LẤY LỊCH SỬ LOCAL =====
  useEffect(() => {
    if (cauHinhKetNoi.daKetNoi) {
      layLichSu()
    }
  }, [cauHinhKetNoi.daKetNoi, trangThaiESP32?.state])

  // ===== THÊM: COPY GIÁ TRỊ KHI MỞ MÀN HÌNH CHỈNH SỬA =====
  useEffect(() => {
    if (hienThiManHinhChinhSua && trangThaiESP32) {
      setChinhSuaSyringe(trangThaiESP32.syringe_index || 0)
      setChinhSuaSpeed(trangThaiESP32.speed_mlh || 60)
      setChinhSuaVolume(trangThaiESP32.volume_ml || 5)
    }
  }, [hienThiManHinhChinhSua, trangThaiESP32])

  // ===== XỬ LÝ KẾT NỐI =====
  const xuLyKetNoi = async () => {
    setLoi(null)
    try {
      await ketNoi(diaChi)
      setCheDoKetNoi(true)
    } catch (err) {
      setLoi('Kết nối thất bại')
    }
  }

  const xuLyNgKetNoi = () => {
    ngKetNoi()
    setCheDoKetNoi(false)
  }

  // ===== LƯU VÀO FIREBASE =====
  const luuVaoFirebase = async () => {
    if (!trangThaiESP32) {
      themLog('loi', 'Không có dữ liệu ESP32 để lưu!')
      setLoiLuuFirebase('Không có dữ liệu ESP32')
      return
    }

    setDangLuuFirebase(true)
    setLoiLuuFirebase(null)

    try {
      const response = await fetch('/api/firebase-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceId,
          overrideData: trangThaiESP32,
        }),
      })

      const result = await response.json()

      if (result.status === 'ok') {
        themLog('thanh_cong', `Đã lưu vào Firebase: ${result.data.volume_ml}ml (${result.data.percentage}%)`)
        setLoiLuuFirebase(null)
      } else {
        themLog('loi', 'Không thể lưu vào Firebase')
        setLoiLuuFirebase('Lỗi lưu Firebase')
      }
    } catch (error) {
      console.error('Error saving to Firebase:', error)
      themLog('loi', 'Lỗi kết nối Firebase')
      setLoiLuuFirebase('Lỗi kết nối')
    } finally {
      setDangLuuFirebase(false)
    }
  }

  // ===== TRỢ GIÚP TÍNH TOÁN =====
  const phanTramDaTruyen =
    trangThaiESP32 && trangThaiESP32.steps_total > 0
      ? (trangThaiESP32.steps_completed / trangThaiESP32.steps_total) * 100
      : 0

  const mlDaTruyen =
    trangThaiESP32 && trangThaiESP32.steps_total > 0
      ? (phanTramDaTruyen / 100) * trangThaiESP32.volume_ml
      : 0

  // ═══════════════════════════════════════════════════════════════════════════
  // Nếu chưa kết nối → hiện màn hình kết nối WiFi
  // ═══════════════════════════════════════════════════════════════════════════

  if (!cauHinhKetNoi.daKetNoi && !cheDoKetNoi) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#1a2a4a] to-[#0d1b35]">
        <div className="w-full max-w-[480px]">
          {/* CARD KẾT NỐI */}
          <div className="medical-card p-8">
            {/* HEADER */}
            <div className="text-center mb-8">
              <div className="mb-4 flex justify-center">
                <Wifi className="w-16 h-16 text-[#4dd9f0] animate-pulse" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Kết nối ESP32
              </h1>
              <p className="text-sm text-white/60">
                Chọn chế độ kết nối của bạn
              </p>
            </div>

            {/* CHỌN CHẾ ĐỘ KẾT NỐI */}
            <div className="mb-6">
              <label className="param-label block mb-3">Chế độ kết nối</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setConnectionMode('FIREBASE')
                    setLoi(null)
                  }}
                  className={`p-4 rounded-lg border-2 transition ${
                    connectionMode === 'FIREBASE'
                      ? 'border-[#4dd9f0] bg-[#4dd9f0]/10'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-center">
                    <Cloud className="w-6 h-6 mx-auto mb-2 text-[#4dd9f0]" />
                    <div className="text-white font-semibold text-sm mb-1">Firebase Cloud</div>
                    <div className="text-white/50 text-xs">Kết nối từ bất kỳ đâu</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setConnectionMode('HTTP')
                    setLoi(null)
                  }}
                  className={`p-4 rounded-lg border-2 transition ${
                    connectionMode === 'HTTP'
                      ? 'border-[#4dd9f0] bg-[#4dd9f0]/10'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-center">
                    <Wifi className="w-6 h-6 mx-auto mb-2 text-[#4dd9f0]" />
                    <div className="text-white font-semibold text-sm mb-1">WiFi Direct</div>
                    <div className="text-white/50 text-xs">Cùng mạng với ESP32</div>
                  </div>
                </button>
              </div>
            </div>

            {/* FIREBASE MODE */}
            {connectionMode === 'FIREBASE' ? (
              <>
                {/* DEVICE INFO */}
                {deviceIdFromHook ? (
                  <div className="mb-4 p-4 rounded-lg bg-[#162840] border border-[#4dd9f0]/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-4 h-4 text-[#00cc66]" />
                      <span className="text-sm font-semibold text-white">Device ID</span>
                    </div>
                    <div className="text-xs text-white/70 font-mono break-all">
                      {deviceIdFromHook}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-4 rounded-lg bg-yellow-500/15 border border-yellow-500/30">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                      <span className="text-sm text-yellow-300">
                        Đang tìm kiếm device... Hãy đảm bảo ESP32 đang kết nối WiFi
                      </span>
                    </div>
                  </div>
                )}

                {/* NÚT KẾT NỐI FIREBASE */}
                <button
                  onClick={async () => {
                    setLoi(null)
                    if (!deviceIdFromHook) {
                      const detected = await tuongThichDeviceId()
                      if (!detected) {
                        setLoi('Không tìm thấy device. Hãy đảm bảo ESP32 đang kết nối WiFi')
                        return
                      }
                    }
                    await ketNoiFirebase()
                    setCheDoKetNoi(true)
                  }}
                  disabled={dangKetNoiFirebase}
                  className="w-full btn-primary py-3 mb-3 font-semibold"
                >
                  {dangKetNoiFirebase ? (
                    <>
                      <Activity className="inline w-4 h-4 mr-2 animate-spin" />
                      Đang kết nối Firebase...
                    </>
                  ) : (
                    'KẾT NỐI FIREBASE'
                  )}
                </button>
              </>
            ) : (
              <>
                {/* HƯỚNG DẪN HTTP */}
                <details open className="mb-6">
                  <summary className="cursor-pointer text-white font-semibold mb-3 flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" />
                    Hướng dẫn kết nối WiFi
                  </summary>
                  <ol className="text-sm text-white/70 space-y-2 ml-6 list-decimal">
                    <li>Vào Cài đặt WiFi trên điện thoại</li>
                    <li>Chọn mạng "ESP32-PUMP"</li>
                    <li>Nhập mật khẩu: 12345678</li>
                    <li>Quay lại ứng dụng này</li>
                  </ol>
                </details>

                {/* FORM INPUT */}
                <div className="mb-4">
                  <label className="param-label block mb-2">Địa chỉ IP ESP32</label>
                  <input
                    type="text"
                    value={diaChi}
                    onChange={(e) => setDiaChi(e.target.value)}
                    placeholder="192.168.4.1"
                    className="w-full px-4 py-3 rounded-lg bg-[#162840] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#4dd9f0]"
                  />
                </div>

                {/* NÚT KẾT NỐI HTTP */}
                <button
                  onClick={xuLyKetNoi}
                  disabled={cauHinhKetNoi.dangKetNoi}
                  className="w-full btn-primary py-3 mb-3 font-semibold"
                >
                  {cauHinhKetNoi.dangKetNoi ? (
                    <>
                      <Activity className="inline w-4 h-4 mr-2 animate-spin" />
                      Đang kết nối...
                    </>
                  ) : (
                    'KẾT NỐI WIFI'
                  )}
                </button>
              </>
            )}

            {/* HIỂN THỊ LỖI */}
            {loi && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-sm text-red-300">{loi}</span>
              </div>
            )}

            {/* NÚT DEMO */}
            <button
              onClick={() => {
                window.location.href = '/demo'
              }}
              className="w-full px-4 py-3 rounded-lg border border-white/20 text-white font-medium hover:bg-white/5 transition"
            >
              Dùng thử Demo
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Đã kết nối → hiển thị giao diện chính
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#1a2a4a] to-[#0d1b35]">
      <div className="w-full max-w-[680px]">
        {/* CARD CHÍNH */}
        <div className="medical-card">
          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              {trangThaiESP32?.pump_running && !trangThaiESP32?.paused && (
                <span className="w-2 h-2 rounded-full bg-[#00cc66] animate-pulse" />
              )}
              <h1 className="text-2xl font-bold text-[#4dd9f0]">
                {getTrangThaiText(trangThaiESP32)}
              </h1>
              {/* Connection Mode Badge */}
              {cheDoKetNoiFirebase === 'FIREBASE' && deviceIdFromHook && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#4dd9f0]/10 border border-[#4dd9f0]/30">
                  <Cloud className="w-3 h-3 text-[#4dd9f0]" />
                  <span className="text-xs font-semibold text-[#4dd9f0]">Firebase Cloud</span>
                </div>
              )}
              {cheDoKetNoiFirebase === 'HTTP' && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#00cc66]/10 border border-[#00cc66]/30">
                  <Wifi className="w-3 h-3 text-[#00cc66]" />
                  <span className="text-xs font-semibold text-[#00cc66]">WiFi Direct</span>
                </div>
              )}
            </div>
            {cheDoKetNoi && (
              <button
                onClick={xuLyNgKetNoi}
                className="px-3 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-300 hover:bg-red-500/30"
              >
                Ngắt kết nối
              </button>
            )}
          </div>

          {/* KHỐI THIẾT LẬP */}
          <div className="px-6 py-3 border-b border-white/10 space-y-2">
            <button
              onClick={() => setHienThiModalOng(true)}
              className="w-full flex items-center justify-between dropdown-trigger px-4 py-2.5"
            >
              <span className="param-label">Ống tiêm</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">
                  {trangThaiESP32?.syringe || 'N/A'}
                </span>
                <ChevronRight className="h-4 w-4 text-white/50" />
              </div>
            </button>

            {/* Protocol Info */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 rounded-lg">
              <span className="param-label">Protocol</span>
              <div className="flex items-center gap-2">
                {selectedProtocol ? (
                  <>
                    <span className="text-xs font-medium text-[#4dd9f0]">
                      {selectedProtocol.shortName}
                    </span>
                    {selectedProtocol.fixedRate && (
                      <Lock className="h-3 w-3 text-yellow-500" />
                    )}
                  </>
                ) : (
                  <span className="text-xs text-white/50">
                    Thủ công
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KHỐI SỐ LIỆU 2x2 */}
          <div className="medical-card-inner mx-4 my-4">
            <div className="data-grid">
              {/* Tốc độ */}
              <button
                onClick={() => setHienThiModalTocDo(true)}
                className="data-grid-cell p-4 text-left hover:bg-white/5"
              >
                <div className="param-label mb-2">Tốc độ truyền</div>
                <div className="flex items-baseline">
                  <span className="value-large">
                    {trangThaiESP32?.speed_mlh.toFixed(1) || '-'}
                  </span>
                  <span className="value-unit">ml/h</span>
                </div>
              </button>

              {/* Thể tích */}
              <button
                onClick={() => setHienThiModalTheTich(true)}
                className="data-grid-cell p-4 text-left hover:bg-white/5"
              >
                <div className="param-label mb-2">Thể tích truyền</div>
                <div className="flex items-baseline">
                  <span className="value-large">
                    {trangThaiESP32?.volume_ml || '-'}
                  </span>
                  <span className="value-unit">ml</span>
                </div>
              </button>

              {/* Đã truyền */}
              <div className="data-grid-cell p-4">
                <div className="param-label mb-2">Đã truyền</div>
                <div className="flex items-baseline mb-3">
                  <span className="value-large">{mlDaTruyen.toFixed(1)}</span>
                  <span className="value-unit">
                    /{trangThaiESP32?.volume_ml || '-'} ml
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="progress-track flex-1">
                    <div
                      className="progress-fill"
                      style={{ width: `${phanTramDaTruyen}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/50">
                    {Math.round(phanTramDaTruyen)}%
                  </span>
                </div>
              </div>

              {/* Thời gian */}
              <div className="data-grid-cell p-4">
                <div className="param-label mb-2">Thời gian còn lại</div>
                <div className="flex items-baseline mb-3">
                  <span className="value-large">
                    {formatThoiGian(trangThaiESP32?.remaining_sec || 0)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (trangThaiESP32?.pump_running) {
                      trangThaiESP32.paused ? tiepTuc() : tamDung()
                    } else if (
                      trangThaiESP32?.state === 'READY' &&
                      trangThaiESP32?.contact_found
                    ) {
                      batDauBom()
                    }
                  }}
                  disabled={
                    trangThaiESP32?.state !== 'READY' &&
                    !trangThaiESP32?.pump_running
                  }
                  className="btn-secondary w-full py-2 text-sm"
                >
                  {trangThaiESP32?.pump_running
                    ? trangThaiESP32.paused
                      ? 'Tiếp tục'
                      : 'Tạm dừng'
                    : 'Bắt đầu'}
                </button>
              </div>
            </div>

            {/* Trạng thái kết nối */}
            <div className="px-4 py-2.5 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {cauHinhKetNoi.daKetNoi ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-[#00cc66]" />
                    <span className="text-[#00cc66]">
                      ESP32: {trangThaiESP32?.ip || 'N/A'}
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-[#ff6666]" />
                    <span className="text-[#ff6666]">Mất kết nối</span>
                  </>
                )}
              </div>
              {cauHinhKetNoi.doTreMs && (
                <span className="text-white/40">{cauHinhKetNoi.doTreMs}ms</span>
              )}
            </div>
          </div>

          {/* CẢNH BÁO */}
          {trangThaiESP32?.fsr_alert && (
            <div className="alert-warning mx-4 mb-4 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#f5a623] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[#f5a623] text-sm font-medium">
                  Cảnh báo tắc ống - Áp lực tăng bất thường
                </span>
              </div>
              <button
                onClick={() => xacNhanBaoDong()}
                className="btn-secondary px-3 py-1 text-xs shrink-0"
              >
                Xác nhận
              </button>
            </div>
          )}

          {trangThaiESP32?.state === 'READY' &&
            !trangThaiESP32?.contact_found && (
              <div className="alert-warning mx-4 mb-4 px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#f5a623] shrink-0 mt-0.5" />
                <span className="text-[#f5a623] text-sm font-medium">
                  Chưa nhận diện ống - Nhấn Chuẩn bị để nhận diện
                </span>
              </div>
            )}

          {trangThaiESP32?.state === 'ERROR' && (
            <div className="alert-warning mx-4 mb-4 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span className="text-red-400 text-sm font-medium">
                Lỗi hệ thống
              </span>
            </div>
          )}

          {trangThaiESP32?.state === 'DONE' && (
            <div className="alert-warning mx-4 mb-4 px-4 py-3 flex items-start gap-3 bg-[#00cc66]/15 border-l-[#00cc66]">
              <Check className="w-5 h-5 text-[#00cc66] shrink-0 mt-0.5" />
              <span className="text-[#00cc66] text-sm font-medium">
                Đã hoàn tất truyền dịch
              </span>
            </div>
          )}

          {!cauHinhKetNoi.daKetNoi && (
            <div className="alert-warning mx-4 mb-4 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span className="text-red-400 text-sm font-medium">
                Mất kết nối ESP32 - Đang thử kết nối lại...
              </span>
            </div>
          )}

          {/* NÚT HÀNH ĐỘNG */}
          <div className="px-4 pb-4 grid grid-cols-3 gap-3">
            <button
              onClick={() => chuanBi()}
              disabled={trangThaiESP32?.state === 'PREPARE' || !cauHinhKetNoi.daKetNoi}
              className="btn-primary py-3 font-semibold"
            >
              {trangThaiESP32?.state === 'PREPARE' ? '...' : 'Chuẩn bị'}
            </button>

            <button
              onClick={() => setHienThiXacNhanDung(true)}
              className="btn-secondary py-3 flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Về home</span>
            </button>

            <button
              onClick={() => xacNhanBaoDong()}
              disabled={!trangThaiESP32?.fsr_alert && trangThaiESP32?.state !== 'ERROR'}
              className="btn-secondary py-3 flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4" />
              <span>Báo động</span>
            </button>
          </div>

          {/* NÚT LƯU VÀO FIREBASE */}
          <div className="mx-4 mb-4">
            <button
              onClick={() => luuVaoFirebase()}
              disabled={dangLuuFirebase || !cauHinhKetNoi.daKetNoi}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 font-semibold"
            >
              {dangLuuFirebase ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Lưu vào Firebase
                </>
              )}
            </button>
            {loiLuuFirebase && (
              <div className="mt-2 text-center text-xs text-red-400">
                {loiLuuFirebase}
              </div>
            )}
          </div>

          {/* NHẬT KÝ */}
          <div className="medical-card-inner mx-4 mb-4 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/60 uppercase tracking-wider font-medium">
                Nhật ký
              </span>
            </div>
            <div className="space-y-2">
              {nhatKySuKien.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="event-log-item px-3 py-2 flex items-center gap-2"
                >
                  {log.loai === 'canh_bao' && (
                    <AlertTriangle className="w-3.5 h-3.5 text-[#f5a623] shrink-0" />
                  )}
                  {log.loai === 'thanh_cong' && (
                    <Check className="w-3.5 h-3.5 text-[#00cc66] shrink-0" />
                  )}
                  {log.loai === 'thong_tin' && (
                    <Clock className="w-3.5 h-3.5 text-[#4dd9f0] shrink-0" />
                  )}
                  {log.loai === 'loi' && (
                    <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                  <span className="text-xs text-white/70 flex-1">{log.noiDung}</span>
                  <span className="text-xs text-white/40">
                    {log.thoiGian.toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* LỊCH SỬ LOCAL */}
          <div className="medical-card-inner mx-4 mb-4 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-white/40" />
                <span className="text-xs text-white/60 uppercase tracking-wider font-medium">
                  Lịch sử bơm (Local)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => layLichSu()}
                  className="text-xs text-white/60 hover:text-white transition"
                >
                  <RefreshCw className="w-3 h-3 inline" />
                </button>
                <button
                  onClick={() => setHienThiLichSuLocal(!hienThiLichSuLocal)}
                  className="text-xs text-[#4dd9f0] hover:text-[#4dd9f0]/80 transition"
                >
                  {hienThiLichSuLocal ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            {hienThiLichSuLocal && (
              <div className="space-y-2">
                {lichSuBom.length === 0 ? (
                  <div className="text-center py-8 text-white/40 text-sm">
                    Chưa có lịch sử bơm
                  </div>
                ) : (
                  lichSuBom.slice(0, 5).map((item, idx) => (
                    <div
                      key={idx}
                      className="event-log-item px-3 py-2 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="text-xs text-white font-medium">
                          {item.syringe} • {item.speed_mlh} ml/h • {item.volume_ml} ml
                        </div>
                        <div className="text-xs text-white/50 mt-0.5">
                          Thời gian: {Math.floor(item.total_sec / 60)}p {item.total_sec % 60}s
                        </div>
                      </div>
                      <div className="text-xs text-white/40">
                        {item.thoiGianGhi.toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* LỊCH SỬ FIREBASE */}
          <div className="medical-card-inner mx-4 mb-4 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-white/40" />
                <span className="text-xs text-white/60 uppercase tracking-wider font-medium">
                  Lịch sử bơm (Firebase)
                </span>
              </div>
              <button
                onClick={() => setHienThiLichSuFirebase(!hienThiLichSuFirebase)}
                className="text-xs text-[#4dd9f0] hover:text-[#4dd9f0]/80 transition"
              >
                {hienThiLichSuFirebase ? 'Ẩn' : 'Hiện'}
              </button>
            </div>

            {hienThiLichSuFirebase && (
              <FirebaseHistoryPanel
                history={firebase.history}
                loading={firebase.loading}
                error={firebase.error}
                deviceId={deviceId}
                onTestConnection={firebase.testConnection}
                onSaveRecord={async () => {
                  // Lưu bản ghi bơm hiện tại
                  if (!trangThaiESP32) {
                    themLog('loi', 'Không có dữ liệu bơm để lưu!')
                    return
                  }

                  const phanTram = trangThaiESP32.steps_total > 0
                    ? (trangThaiESP32.steps_completed / trangThaiESP32.steps_total) * 100
                    : 0

                  let totalTime = 0
                  if (trangThaiESP32.speed_mlh && trangThaiESP32.volume_ml) {
                    totalTime = Math.round((trangThaiESP32.volume_ml / trangThaiESP32.speed_mlh) * 3600)
                  }

                  const result = await firebase.saveRecord({
                    syringeType: trangThaiESP32.syringe || '10CC',
                    speedMlh: trangThaiESP32.speed_mlh,
                    volumeMl: trangThaiESP32.volume_ml,
                    infusedVolumeMl: mlDaTruyen,
                    totalTimeSec: totalTime,
                    stepsCompleted: trangThaiESP32.steps_completed,
                    stepsTotal: trangThaiESP32.steps_total,
                    status: phanTram >= 99.9 ? 'COMPLETED' : trangThaiESP32.state === 'ERROR' ? 'ERROR' : 'STOPPED',
                  })

                  if (result) {
                    themLog('thanh_cong', `Đã lưu lịch sử bơm: ${trangThaiESP32.volume_ml}ml ở ${trangThaiESP32.speed_mlh}ml/h`)
                  } else {
                    themLog('loi', 'Không thể lưu bản ghi. Kiểm tra Firebase config.')
                  }
                }}
                // Cho phép lưu khi:
                // - Có trạng thái ESP32
                // - Có thể tích hoặc đã từng bơm (steps_completed > 0)
                // - Không trong state khởi động (BOOT/SYRINGE)
                canSaveRecord={
                  !!trangThaiESP32 &&
                  trangThaiESP32.state !== 'BOOT' &&
                  trangThaiESP32.state !== 'SYRINGE' &&
                  (trangThaiESP32.volume_ml > 0 || trangThaiESP32.steps_completed > 0)
                }
                onDeleteSelected={firebase.deleteSelectedHistory}
                onDeleteAll={firebase.deleteAllHistory}
              />
            )}
          </div>

          {/* FOOTER */}
          <div className="px-6 py-3 border-t border-white/10 text-center text-xs text-white/40">
            <span suppressHydrationWarning>Cập nhật: {thoiGianHienTai}</span>
          </div>
        </div>
      </div>

      {/* MODAL CHỈNH TỐC ĐỘ */}
      {hienThiModalTocDo && (
        <ModalChinhSoLieu
          tieuDe="Tốc độ truyền"
          giaTri={trangThaiESP32?.speed_mlh || 1}
          donVi="ml/h"
          min={0.1}
          max={trangThaiESP32?.syringe_index === 0 ? 60 : 120}
          buoc={0.1}
          onXacNhan={(v) => {
            capNhatCauHinh(
              trangThaiESP32?.syringe_index || 0,
              v,
              trangThaiESP32?.volume_ml || 5
            )
            setHienThiModalTocDo(false)
          }}
          onHuy={() => setHienThiModalTocDo(false)}
        />
      )}

      {/* MODAL CHỈNH THỂ TÍCH */}
      {hienThiModalTheTich && (
        <ModalChinhSoLieu
          tieuDe="Thể tích truyền"
          giaTri={trangThaiESP32?.volume_ml || 5}
          donVi="ml"
          min={1}
          max={trangThaiESP32?.syringe_index === 0 ? 10 : 20}
          buoc={1}
          onXacNhan={(v) => {
            capNhatCauHinh(
              trangThaiESP32?.syringe_index || 0,
              trangThaiESP32?.speed_mlh || 1,
              v
            )
            setHienThiModalTheTich(false)
          }}
          onHuy={() => setHienThiModalTheTich(false)}
        />
      )}

      {/* MODAL CHỌN ỐNG */}
      {hienThiModalOng && (
        <ModalChonOng
          onXacNhan={(idx) => {
            capNhatCauHinh(idx, trangThaiESP32?.speed_mlh || 1, trangThaiESP32?.volume_ml || 5)
            setHienThiModalOng(false)
          }}
          onHuy={() => setHienThiModalOng(false)}
          openProtocolSelect={openProtocolSelect}
        />
      )}

      {/* MODAL CHỌN PROTOCOL */}
      <ProtocolSelectionDialog
        isOpen={hienThiProtocolSelect}
        onClose={() => setHienThiProtocolSelect(false)}
        selectedSyringe={trangThaiESP32?.syringe === '10CC' ? '10CC' : '20CC'}
        onSelectProtocol={handleSelectProtocol}
      />

      {/* XÁC NHẬN DỪNG */}
      {hienThiXacNhanDung && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="modal-content w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {trangThaiESP32?.pump_running ? 'Tạm dừng bơm?' : 'Về trang chủ?'}
            </h3>
            <p className="text-sm text-white/70 mb-4">
              {trangThaiESP32?.pump_running ? 'Bơm sẽ tạm dừng, bạn có thể tiếp tục sau.' : 'Máy bơm sẽ về vị trí ban đầu.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (trangThaiESP32?.pump_running) {
                    tamDung()
                  } else {
                    veHome()
                  }
                  setHienThiXacNhanDung(false)
                }}
                className="flex-1 btn-primary py-2"
              >
                Có
              </button>
              <button
                onClick={() => setHienThiXacNhanDung(false)}
                className="flex-1 btn-secondary py-2"
              >
                Không
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HOÀN TẤT */}
      {hienThiModalHoanTat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="modal-content w-full max-w-sm p-6 text-center">
            <div className="mb-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#00cc66]/20 flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-[#00cc66]" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Hoàn tất!
            </h3>
            <p className="text-white/70 mb-6">
              Lượng tiêm đã được truyền thành công
            </p>

            {/* 3 THÔNG SỐ */}
            <div className="space-y-3 mb-6">
              {/* Thể tích đã truyền */}
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm text-white/60 mb-1">Đã truyền</div>
                <div className="text-2xl font-bold text-[#4dd9f0]">
                  {mlDaTruyen.toFixed(1)} ml
                </div>
              </div>

              {/* Tốc độ truyền */}
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm text-white/60 mb-1">Tốc độ truyền</div>
                <div className="text-2xl font-bold text-white">
                  {trangThaiESP32?.speed_mlh?.toFixed(1) || 0} ml/h
                </div>
              </div>

              {/* Thể tích bơm */}
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm text-white/60 mb-1">Thể tích bơm</div>
                <div className="text-2xl font-bold text-white">
                  {trangThaiESP32?.volume_ml || 0} ml
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  veHome()
                  setHienThiModalHoanTat(false)
                }}
                className="btn-primary py-3 font-semibold"
              >
                <Home className="w-4 h-4 inline mr-2" />
                Về HOME
              </button>
              <button
                onClick={() => {
                  xacNhanBaoDong()
                  setHienThiModalHoanTat(false)
                }}
                className="btn-secondary py-3 font-semibold"
              >
                <VolumeX className="w-4 h-4 inline mr-2" />
                Tắt âm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // POPUP XÁC NHẬN - Sau khi nhận diện pittong
  // ═══════════════════════════════════════════════════════════════════════════
  if (hienThiPopupXacNhan) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl border-4 border-black">
          {/* Header */}
          <h2 className="text-xl font-bold text-center mb-6 text-black border-b-2 border-black pb-3">
            XÁC NHẬN CÀI ĐẶT & BẮT ĐẦU BƠM
          </h2>

          {/* Fields - chỉ hiển thị, không chỉnh */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="font-semibold text-black">Loại ống:</span>
              <span className="text-black">{trangThaiESP32?.syringe || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-black">Tốc độ:</span>
              <span className="text-black">{trangThaiESP32?.speed_mlh?.toFixed(1) || '0'} ml/h</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-black">Thể tích:</span>
              <span className="text-black">{trangThaiESP32?.volume_ml || '0'} ml</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-black">Thời gian:</span>
              <span className="text-black">{tinhThoiGian(trangThaiESP32)} phút</span>
            </div>
          </div>

          {/* 2 nút */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setHienThiPopupXacNhan(false)
                batDauBom()
              }}
              className="flex-1 py-3 bg-cyan-400 text-black font-bold rounded hover:bg-cyan-500"
            >
              Bắt đầu
            </button>
            <button
              onClick={() => {
                setHienThiPopupXacNhan(false)
                setHienThiManHinhChinhSua(true)
              }}
              className="flex-1 py-3 bg-gray-300 text-black font-bold rounded hover:bg-gray-400"
            >
              SỬA CÀI ĐẶT
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÀN HÌNH CHỈNH SỬA CÀI ĐẶT
  // ═══════════════════════════════════════════════════════════════════════════
  if (hienThiManHinhChinhSua) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#1a2a4a] to-[#0d1b35] p-4 z-40 overflow-y-auto">
        <div className="max-w-[680px] mx-auto pb-20">
          {/* Giữ nguyên design card hiện tại */}
          <div className="medical-card">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h1 className="text-2xl font-bold text-[#4dd9f0]">
                CHỈNH SỬA CÀI ĐẶT
              </h1>
              <button
                onClick={() => setHienThiManHinhChinhSua(false)}
                className="px-4 py-2 rounded bg-red-500/20 text-red-300 font-semibold"
              >
                ✕ Đóng
              </button>
            </div>

            {/* Giới hạn tốc độ - THÊM MỚI */}
            <div className="mx-6 my-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-white/70 text-sm mb-2">Giới hạn tốc độ:</div>
              <div className="text-white text-sm">
                • Ống 10cc: max 300ml/h
                <br/>
                • Ống 20cc: max 600ml/h
              </div>
            </div>

            {/* Syringe selector */}
            <div className="px-6 py-3 border-b border-white/10">
              <button
                onClick={() => setHienThiModalOng(true)}
                className="w-full flex items-center justify-between px-4 py-2.5 dropdown-trigger"
              >
                <span className="text-white/70">Loại ống</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">
                    {chinhSuaSyringe === 0 ? 'Vinahankook 10CC' : 'Vinahankook 20CC'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/50" />
                </div>
              </button>
            </div>

            {/* Data grid */}
            <div className="medical-card-inner mx-4 my-4">
              <div className="data-grid">
                <button
                  onClick={() => setHienThiModalTocDo(true)}
                  className="data-grid-cell p-4"
                >
                  <div className="text-white/70 text-sm mb-1">Tốc độ</div>
                  <div className="text-2xl font-bold text-white">
                    {chinhSuaSpeed.toFixed(1)}
                  </div>
                  <div className="text-white/50 text-xs">ml/h</div>
                </button>

                <button
                  onClick={() => setHienThiModalTheTich(true)}
                  className="data-grid-cell p-4"
                >
                  <div className="text-white/70 text-sm mb-1">Thể tích</div>
                  <div className="text-2xl font-bold text-white">
                    {chinhSuaVolume}
                  </div>
                  <div className="text-white/50 text-xs">ml</div>
                </button>
              </div>
            </div>

            {/* 2 nút Lưu/HỶ */}
            <div className="px-6 py-4 flex gap-3">
              <button
                onClick={async () => {
                  try {
                    await capNhatCauHinh(chinhSuaSyringe, chinhSuaSpeed, chinhSuaVolume)
                    setHienThiManHinhChinhSua(false)
                    themLog('thanh_cong', 'Đã lưu cấu hình')
                  } catch (err) {
                    themLog('loi', 'Lỗi lưu: ' + (err as Error).message)
                  }
                }}
                className="flex-1 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700"
              >
                Lưu
              </button>
              <button
                onClick={() => {
                  setHienThiManHinhChinhSua(false)
                  themLog('thong_tin', 'Đã hủy chỉnh sửa')
                }}
                className="flex-1 py-3 bg-gray-600 text-white font-bold rounded hover:bg-gray-700"
              >
                Hủy
              </button>
            </div>
          </div>

          {/* Modal chọn ống - REUSE */}
          {hienThiModalOng && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="medical-card p-6 max-w-sm w-full mx-4">
                <h3 className="text-lg font-bold text-white mb-4">Chọn loại ống tiêm</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setChinhSuaSyringe(0)
                      setHienThiModalOng(false)
                    }}
                    className={`w-full p-3 rounded text-left font-medium transition ${
                      chinhSuaSyringe === 0 ? 'bg-[#4dd9f0]/20 text-[#4dd9f0]' : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    Vinahankook 10CC
                  </button>
                  <button
                    onClick={() => {
                      setChinhSuaSyringe(1)
                      setHienThiModalOng(false)
                    }}
                    className={`w-full p-3 rounded text-left font-medium transition ${
                      chinhSuaSyringe === 1 ? 'bg-[#4dd9f0]/20 text-[#4dd9f0]' : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    Vinahankook 20CC
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal tốc độ - THÊM VALIDATION */}
          {hienThiModalTocDo && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="medical-card p-6 max-w-sm w-full mx-4">
                <h3 className="text-lg font-bold text-white mb-4">Chỉnh tốc độ</h3>

                <div className="mb-4">
                  <input
                    type="range"
                    min="1"
                    max={chinhSuaSyringe === 0 ? 300 : 600}
                    step="0.1"
                    value={chinhSuaSpeed}
                    onChange={(e) => setGiaTriNhap(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-white/70 text-sm mt-2">
                    <span>1</span>
                    <span>{chinhSuaSyringe === 0 ? '300' : '600'} ml/h</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-white/70 text-sm mb-2">Nhập tốc độ (ml/h):</label>
                  <input
                    type="number"
                    value={nhapTay ? giaTriNhap : chinhSuaSpeed}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      setGiaTriNhap(val)
                      setNhapTay(true)
                    }}
                    onFocus={() => setNhapTay(true)}
                    onBlur={() => setNhapTay(false)}
                    className="w-full px-4 py-2 rounded bg-[#162840] border border-white/20 text-white text-center"
                    placeholder="60.0"
                  />
                  {giaTriNhap > (chinhSuaSyringe === 0 ? 300 : 600) && (
                    <div className="text-red-400 text-xs mt-1">
                      Tối đa: {chinhSuaSyringe === 0 ? 300 : 600} ml/h
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (giaTriNhap <= (chinhSuaSyringe === 0 ? 300 : 600)) {
                        setChinhSuaSpeed(giaTriNhap)
                        setGiaTriTam(giaTriNhap)
                        setHienThiModalTocDo(false)
                        setNhapTay(false)
                      }
                    }}
                    disabled={giaTriNhap > (chinhSuaSyringe === 0 ? 300 : 600)}
                    className={`flex-1 py-2 rounded font-semibold ${
                      giaTriNhap > (chinhSuaSyringe === 0 ? 300 : 600)
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-[#4dd9f0] text-black hover:bg-[#4dd9f0]/80'
                    }`}
                  >
                    Xác nhận
                  </button>
                  <button
                    onClick={() => {
                      setHienThiModalTocDo(false)
                      setGiaTriNhap(chinhSuaSpeed)
                      setNhapTay(false)
                    }}
                    className="flex-1 py-2 rounded bg-gray-600 text-white font-semibold hover:bg-gray-700"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal thể tích */}
          {hienThiModalTheTich && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="medical-card p-6 max-w-sm w-full mx-4">
                <h3 className="text-lg font-bold text-white mb-4">Chỉnh thể tích</h3>

                <div className="mb-4">
                  <input
                    type="range"
                    min="1"
                    max={chinhSuaSyringe === 0 ? 10 : 20}
                    step="0.1"
                    value={chinhSuaVolume}
                    onChange={(e) => setGiaTriNhap(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-white/70 text-sm mt-2">
                    <span>1 ml</span>
                    <span>{chinhSuaSyringe === 0 ? '10' : '20'} ml</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-white/70 text-sm mb-2">Nhập thể tích (ml):</label>
                  <input
                    type="number"
                    value={nhapTay ? giaTriNhap : chinhSuaVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      setGiaTriNhap(val)
                      setNhapTay(true)
                    }}
                    onFocus={() => setNhapTay(true)}
                    onBlur={() => setNhapTay(false)}
                    className="w-full px-4 py-2 rounded bg-[#162840] border border-white/20 text-white text-center"
                    placeholder="5"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (giaTriNhap >= 1 && giaTriNhap <= (chinhSuaSyringe === 0 ? 10 : 20)) {
                        setChinhSuaVolume(giaTriNhap)
                        setHienThiModalTheTich(false)
                        setNhapTay(false)
                      }
                    }}
                    disabled={giaTriNhap < 1 || giaTriNhap > (chinhSuaSyringe === 0 ? 10 : 20)}
                    className={`flex-1 py-2 rounded font-semibold ${
                      giaTriNhap < 1 || giaTriNhap > (chinhSuaSyringe === 0 ? 10 : 20)
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-[#4dd9f0] text-black hover:bg-[#4dd9f0]/80'
                    }`}
                  >
                    Xác nhận
                  </button>
                  <button
                    onClick={() => {
                      setHienThiModalTheTich(false)
                      setGiaTriNhap(chinhSuaVolume)
                      setNhapTay(false)
                    }}
                    className="flex-1 py-2 rounded bg-gray-600 text-white font-semibold hover:bg-gray-700"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HÀM TRỢ GIÚP
// ═══════════════════════════════════════════════════════════════════════════

function getTrangThaiText(state: TrangThaiESP32 | null): string {
  if (!state) return 'CHƯA KẾT NỐI'
  if (state.fsr_alert) return 'CẢNH BÁO NGHEN'
  if (state.pump_running && !state.paused) return 'ĐANG TRUYỀN'
  if (state.paused) return 'TẠM DỪNG'
  if (state.state === 'PREPARE') return 'CHUẨN BỊ...'
  if (state.state === 'READY' && state.contact_found) return 'SẴN SÀNG'
  if (state.state === 'READY' && !state.contact_found) return 'CHƯA NHẬN DIỆN'
  if (state.state === 'DONE') return 'HOÀN TẤT'
  if (state.state === 'ERROR') return 'LỖI'
  return state.state
}

function formatThoiGian(giay: number): string {
  const gio = Math.floor(giay / 3600)
  const phut = Math.floor((giay % 3600) / 60)
  const giayConLai = giay % 60
  if (gio > 0) return `${gio}:${phut.toString().padStart(2, '0')}:${giayConLai.toString().padStart(2, '0')}`
  return `${phut}:${giayConLai.toString().padStart(2, '0')}`
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL CHỈNH SỐ LIỆU
// ═══════════════════════════════════════════════════════════════════════════

function ModalChinhSoLieu({
  tieuDe,
  giaTri,
  donVi,
  min,
  max,
  buoc,
  onXacNhan,
  onHuy,
}: {
  tieuDe: string
  giaTri: number
  donVi: string
  min: number
  max: number
  buoc: number
  onXacNhan: (v: number) => void
  onHuy: () => void
}) {
  const [giaTriTam, setGiaTriTam] = useState(giaTri)
  const [nhapTay, setNhapTay] = useState(false)
  const [giaTriNhap, setGiaTriNhap] = useState(giaTri.toString())
  const [loiNhap, setLoiNhap] = useState('')

  // Cập nhật giá trị nhập khi modal mở
  useEffect(() => {
    setGiaTriTam(giaTri)
    setGiaTriNhap(giaTri.toString())
    setNhapTay(false)
    setLoiNhap('')
  }, [giaTri])

  // Xử lý khi chuyển sang chế độ nhập tay
  const batDauNhapTay = () => {
    setNhapTay(true)
    setGiaTriNhap(buoc < 1 ? giaTriTam.toFixed(1) : giaTriTam.toString())
    setLoiNhap('')
  }

  // Xử lý nhập từ bàn phím
  const xuLyNhap = (value: string) => {
    setGiaTriNhap(value)

    // Validate số
    const num = parseFloat(value)
    if (value && (isNaN(num) || num < min || num > max)) {
      setLoiNhap(`Giá trị từ ${min} đến ${max}`)
    } else {
      setLoiNhap('')
    }
  }

  // Xác nhận giá trị nhập tay
  const xacNhanNhapTay = () => {
    const num = parseFloat(giaTriNhap)
    if (!isNaN(num) && num >= min && num <= max) {
      setGiaTriTam(num)
      setNhapTay(false)
      setLoiNhap('')
    }
  }

  // Hủy nhập tay, quay lại nút bấm
  const huyNhapTay = () => {
    setGiaTriNhap(buoc < 1 ? giaTriTam.toFixed(1) : giaTriTam.toString())
    setNhapTay(false)
    setLoiNhap('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="modal-content w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-white mb-6 text-center">
          {tieuDe}
        </h3>

        {!nhapTay ? (
          // Chế độ nút bấm
          <>
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                onClick={() => setGiaTriTam((v) => Math.max(v - buoc, min))}
                className="btn-secondary w-12 h-12 rounded-full flex items-center justify-center"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div
                className="text-center min-w-[120px] cursor-pointer hover:bg-white/5 rounded-lg p-2 transition"
                onClick={batDauNhapTay}
              >
                <span className="text-4xl font-bold text-[#4dd9f0]">
                  {buoc < 1 ? giaTriTam.toFixed(1) : giaTriTam}
                </span>
                <span className="text-lg text-white/60 ml-2">{donVi}</span>
                <div className="text-xs text-white/30 mt-1">Nhấn để nhập</div>
              </div>
              <button
                onClick={() => setGiaTriTam((v) => Math.min(v + buoc, max))}
                className="btn-secondary w-12 h-12 rounded-full flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onXacNhan(giaTriTam)}
                className="flex-1 btn-primary py-2"
              >
                Xác nhận
              </button>
              <button onClick={onHuy} className="flex-1 btn-secondary py-2">
                Hủy
              </button>
            </div>
          </>
        ) : (
          // Chế độ nhập tay
          <>
            <div className="mb-6">
              <label className="block text-sm text-white/60 mb-2 text-center">
                Nhập giá trị ({min} - {max} {donVi})
              </label>
              <div className="flex items-center justify-center gap-3">
                <input
                  type="number"
                  value={giaTriNhap}
                  onChange={(e) => xuLyNhap(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loiNhap) {
                      xacNhanNhapTay()
                    }
                  }}
                  className={`w-40 px-4 py-3 text-center text-2xl font-bold rounded-lg bg-[#162840] border ${
                    loiNhap ? 'border-red-500/50' : 'border-white/10'
                  } text-white focus:outline-none focus:border-[#4dd9f0]`}
                  autoFocus
                />
                <span className="text-lg text-white/60">{donVi}</span>
              </div>
              {loiNhap && (
                <p className="text-red-400 text-sm text-center mt-2">{loiNhap}</p>
              )}
              <p className="text-xs text-white/40 text-center mt-2">
                Nhấn Enter để xác nhận
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={xacNhanNhapTay}
                disabled={!!loiNhap || !giaTriNhap}
                className="flex-1 btn-primary py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Áp dụng
              </button>
              <button onClick={huyNhapTay} className="flex-1 btn-secondary py-2">
                Quay lại
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL CHỌN ỐNG TIÊM
// ═══════════════════════════════════════════════════════════════════════════

function ModalChonOng({
  onXacNhan,
  onHuy,
  openProtocolSelect
}: {
  onXacNhan: (idx: number) => void
  onHuy: () => void
  openProtocolSelect: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="modal-content w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-white mb-6 text-center">
          Chọn loại ống tiêm
        </h3>
        <div className="space-y-3 mb-6">
          {[
            { idx: 0, ten: 'Vinahankook 10CC' },
            { idx: 1, ten: 'Vinahankook 20CC' },
          ].map((ong) => (
            <button
              key={ong.idx}
              onClick={() => {
                onXacNhan(ong.idx)
                openProtocolSelect()
              }}
              className="w-full px-4 py-3 rounded-lg border border-white/20 text-white hover:bg-white/10 transition"
            >
              {ong.ten}
            </button>
          ))}
        </div>
        <button onClick={onHuy} className="w-full btn-secondary py-2">
          Hủy
        </button>
      </div>
    </div>
  )
}
