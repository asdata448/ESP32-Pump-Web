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
} from 'lucide-react'
import { useESP32 } from '@/hooks/use-esp32-complete'
import { TrangThaiESP32, MucNhatKy } from '@/lib/esp32-types'
import { useFirebaseHistory } from '@/hooks/use-firebase-history'
import { FirebaseHistoryPanel } from '@/components/firebase/firebase-history-panel'

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT - Toàn bộ logic trong 1 file
// ═══════════════════════════════════════════════════════════════════════════

export default function App() {
  const esp32 = useESP32()
  const {
    cauHinhKetNoi,
    trangThaiESP32,
    nhatKySuKien,
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
    cheDoDemo,
  } = esp32

  // ===== STATE UI =====
  const [diaChi, setDiaChi] = useState('192.168.4.1')
  const [loi, setLoi] = useState<string | null>(null)
  const [hienThiModalTocDo, setHienThiModalTocDo] = useState(false)
  const [hienThiModalTheTich, setHienThiModalTheTich] = useState(false)
  const [hienThiModalOng, setHienThiModalOng] = useState(false)
  const [hienThiXacNhanDung, setHienThiXacNhanDung] = useState(false)
  const [thoiGianHienTai, setThoiGianHienTai] = useState('--:--')
  const [cheDoKetNoi, setCheDoKetNoi] = useState(false)

  // ===== FIREBASE STATE =====
  const [hienThiLichSuFirebase, setHienThiLichSuFirebase] = useState(false)
  const [firebaseEnabled, setFirebaseEnabled] = useState(true)
  const [deviceId, setDeviceId] = useState<string>('')

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
                Đảm bảo điện thoại đã kết nối WiFi ESP32-PUMP
              </p>
            </div>

            {/* HƯỚNG DẪN */}
            <details open className="mb-6">
              <summary className="cursor-pointer text-white font-semibold mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                Hướng dẫn kết nối
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

            {/* HIỂN THỊ LỖI */}
            {loi && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-sm text-red-300">{loi}</span>
              </div>
            )}

            {/* NÚT KẾT NỐI */}
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
                'KẾT NỐI'
              )}
            </button>

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
          <div className="px-6 py-3 border-b border-white/10">
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
                // Cho phép lưu khi có dữ liệu pump (đã set volume và không trong state khởi động)
                canSaveRecord={!!trangThaiESP32 && trangThaiESP32.volume_ml > 0 && trangThaiESP32.state !== 'BOOT' && trangThaiESP32.state !== 'SYRINGE'}
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
        />
      )}

      {/* XÁC NHẬN DỪNG */}
      {hienThiXacNhanDung && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="modal-content w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Dừng bơm và về trang chủ?
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  dungBom()
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
    </div>
  )
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
}: {
  onXacNhan: (idx: number) => void
  onHuy: () => void
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
              onClick={() => onXacNhan(ong.idx)}
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
