'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ShieldPlus, ArrowRight, GraduationCap } from 'lucide-react'

interface IntroScreenProps {
  onEnter: () => void
}

// Hiệu ứng fade-up so le
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
})

export function IntroScreen({ onEnter }: IntroScreenProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.main
      className="intro-screen fixed inset-0 z-[100] overflow-y-auto"
      style={{
        background:
          'radial-gradient(900px 520px at 50% 18%, rgba(77,217,240,0.12), transparent 60%), linear-gradient(180deg, #1a2a4a 0%, #0d1b35 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Lưới grid nền nhẹ */}
      <div className="intro-bg-grid" aria-hidden />

      {/* justify-evenly: các khối tự giãn đều lấp đầy chiều cao màn hình → thoáng nhất mà vừa khung */}
      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-evenly px-5 py-5 text-center">
        {/* ===== LOGO TRƯỜNG ===== */}
        <motion.div {...fadeUp(0.05)} className="relative shrink-0">
          <span
            className="absolute inset-0 rounded-full blur-md"
            style={{ background: 'radial-gradient(circle, rgba(77,217,240,0.25), transparent 70%)' }}
            aria-hidden
          />
          <img
            src="/ute-logo.png"
            alt="Logo Trường Đại học Công nghệ Kỹ thuật TP.HCM"
            className="relative h-14 w-14 rounded-full object-cover"
            style={{
              border: '1.5px solid rgba(77,217,240,0.5)',
              boxShadow: '0 0 18px rgba(77,217,240,0.3), 0 4px 14px rgba(0,0,0,0.35)',
            }}
          />
        </motion.div>

        {/* ===== TÊN TRƯỜNG + KHOA + NGÀNH (gộp nhóm) ===== */}
        <motion.div {...fadeUp(0.12)} className="flex shrink-0 flex-col items-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-white/70 leading-tight">
            Trường ĐH Công nghệ Kỹ thuật TP.HCM · Khoa Điện — Điện tử
          </p>
          <p
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em]"
            style={{ color: '#4dd9f0', background: 'rgba(77,217,240,0.1)', border: '1px solid rgba(77,217,240,0.3)' }}
          >
            <GraduationCap className="h-3 w-3" strokeWidth={2.2} />
            Ngành Kỹ thuật Y sinh
          </p>
        </motion.div>

        {/* ===== ĐỀ TÀI ===== */}
        <motion.h1
          {...fadeUp(0.2)}
          className="intro-title max-w-lg shrink-0"
          style={{ fontSize: 'clamp(0.8rem, 2.3vw, 1.02rem)', lineHeight: 1.3, fontWeight: 800 }}
        >
          THIẾT KẾ VÀ THI CÔNG MÁY BƠM TIÊM ĐIỆN CÓ TÍCH HỢP GIÁM SÁT, ĐIỀU KHIỂN TRÊN NỀN TẢNG FIREBASE
        </motion.h1>

        {/* ===== FOCAL: ẢNH MÁY BƠM (nổi) ===== */}
        <motion.div
          className="relative flex shrink-0 items-center justify-center"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="intro-product-ring" aria-hidden />
          {!reduceMotion && (
            <motion.span
              className="intro-product-glow"
              animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.06, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
          )}
          {reduceMotion && <span className="intro-product-glow" aria-hidden />}

          <motion.div
            className="relative"
            animate={reduceMotion ? {} : { y: [0, -4, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img
              src="/pump-device.png"
              alt="Máy bơm tiêm điện"
              className="intro-product-img"
              draggable={false}
              style={{ filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.55))' }}
            />
            <span
              className="absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: '#0d1b35', border: '1px solid rgba(0,204,102,0.55)', boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }}
            >
              <ShieldPlus className="h-3.5 w-3.5" style={{ color: '#00cc66' }} strokeWidth={2.2} />
            </span>
          </motion.div>
        </motion.div>

        {/* ===== BẢNG THÔNG TIN GVHD / SVTH ===== */}
        <motion.div {...fadeUp(0.42)} className="w-full max-w-sm shrink-0">
          <div className="intro-info-table">
            {[
              { label: 'GVHD', value: 'ThS. Võ Đức Dũng' },
              { label: 'SVTH 1', value: 'Nguyễn Thị Hồng Duyên' },
              { label: 'MSSV1', value: '22129008' },
              { label: 'SVTH 2', value: 'Nguyễn Minh Phong' },
              { label: 'MSSV2', value: '22120931' },
            ].map((r) => (
              <div className="intro-info-row" key={r.label}>
                <span className="intro-info-label">
                  {r.label}
                  {r.note && <em> {r.note}</em>}
                </span>
                <span className="intro-info-colon">:</span>
                <span className="intro-info-value">{r.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ===== CTA ===== */}
        <motion.button
          type="button"
          onClick={onEnter}
          className="intro-cta btn-primary shrink-0 inline-flex items-center gap-2 px-7 py-2.5 text-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <span>VÀO ỨNG DỤNG</span>
          <ArrowRight className="h-4 w-4" strokeWidth={2.3} />
        </motion.button>

        <motion.p
          className="intro-footer shrink-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          ESP32 · Firebase · Next.js — Thiết bị y tế điều khiển từ xa
        </motion.p>
      </div>
    </motion.main>
  )
}

export default IntroScreen
