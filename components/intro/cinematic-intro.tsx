'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CinematicIntroProps {
  onComplete: () => void
}

const SCENES = [
  { id: 'school', duration: 3000 },
  { id: 'faculty', duration: 2500 },
  { id: 'major', duration: 2500 },
  { id: 'title', duration: 4800 },
  { id: 'team', duration: 3000 },
] as const

export function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const [scene, setScene] = useState(0)

  useEffect(() => {
    if (scene >= SCENES.length) {
      const t = setTimeout(onComplete, 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setScene((s) => s + 1), SCENES[scene].duration)
    return () => clearTimeout(t)
  }, [scene, onComplete])

  const skip = useCallback(() => setScene(SCENES.length), [])

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden cursor-pointer select-none"
      style={{ background: '#000510' }}
      onClick={skip}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* ===== Hiệu ứng nền ===== */}
      {/* Glow pulse cyan */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, rgba(77,217,240,0.06), transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Đường quét dọc (scanning) */}
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(77,217,240,0.25), transparent)' }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
      />
      {/* Lưới mờ */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(77,217,240,1) 1px, transparent 1px), linear-gradient(90deg, rgba(77,217,240,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ===== Nội dung scenes ===== */}
      <div className="relative z-10 flex w-full max-w-2xl items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait">
          {/* Scene 1: Tên trường */}
          {scene === 0 && (
            <motion.div key="school" className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.7 }}>
              <motion.p className="text-[0.7rem] sm:text-xs font-medium uppercase tracking-[0.3em] text-[#4dd9f0]/50"
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}>
                Giới thiệu
              </motion.p>
              <motion.p className="text-sm sm:text-lg font-medium text-white/80 leading-relaxed"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 1 }}>
                Trường Đại học Công nghệ<br />Kỹ thuật TP.HCM
              </motion.p>
            </motion.div>
          )}

          {/* Scene 2: Khoa — chạy từ trái */}
          {scene === 1 && (
            <motion.div key="faculty" initial={{ opacity: 0, x: -300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <motion.p className="text-[0.7rem] uppercase tracking-[0.2em] text-white/30 mb-2"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                Đơn vị
              </motion.p>
              <motion.h2 className="text-xl sm:text-3xl font-bold text-[#4dd9f0]"
                style={{ textShadow: '0 0 30px rgba(77,217,240,0.3)' }}>
                Khoa Điện — Điện tử
              </motion.h2>
            </motion.div>
          )}

          {/* Scene 3: Ngành — chạy từ phải */}
          {scene === 2 && (
            <motion.div key="major" initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -300 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <motion.p className="text-[0.7rem] uppercase tracking-[0.2em] text-white/30 mb-2"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                Chuyên ngành
              </motion.p>
              <motion.h2 className="text-xl sm:text-3xl font-bold text-[#4dd9f0]"
                style={{ textShadow: '0 0 30px rgba(77,217,240,0.3)' }}>
                Kỹ thuật Y sinh
              </motion.h2>
            </motion.div>
          )}

          {/* Scene 4: Title reveal — cảnh chính */}
          {scene === 3 && (
            <motion.div key="title" className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.6 }}>
              <motion.p className="text-[0.7rem] sm:text-xs uppercase tracking-[0.4em] text-[#4dd9f0]/60"
                initial={{ opacity: 0, letterSpacing: '0.1em' }}
                animate={{ opacity: 1, letterSpacing: '0.4em' }}
                transition={{ delay: 0.2, duration: 0.8 }}>
                Đồ án tốt nghiệp
              </motion.p>
              <motion.h1
                className="intro-title text-2xl sm:text-4xl leading-tight"
                style={{ filter: 'drop-shadow(0 0 40px rgba(77,217,240,0.5))' }}
                initial={{ opacity: 0, scale: 0.7, filter: 'blur(12px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ delay: 0.5, duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
              >
                THIẾT KẾ VÀ THI CÔNG<br />MÁY BƠM TIÊM ĐIỆN
              </motion.h1>
              <motion.p className="text-xs sm:text-sm text-white/40 max-w-md mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 0.6 }}>
                Tích hợp giám sát, điều khiển<br />trên nền tảng Firebase
              </motion.p>
            </motion.div>
          )}

          {/* Scene 5: Đội ngũ thực hiện */}
          {scene === 4 && (
            <motion.div key="team" className="space-y-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.7 }}>
              <motion.p className="text-[0.7rem] uppercase tracking-[0.2em] text-white/30 mb-3"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                Thực hiện bởi
              </motion.p>
              <motion.div className="space-y-2 text-white/70 text-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }}>
                <p className="text-[#4dd9f0]/80 text-xs">GVHD: ThS. Võ Đức Dũng</p>
                <p>SVTH: Nguyễn Thị Hồng Duyên</p>
                <p>SVTH: Nguyễn Minh Phong</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Nút bỏ qua ===== */}
      <div className="absolute bottom-6 right-8 z-20" onClick={(e) => { e.stopPropagation(); skip(); }}>
        <span className="text-white/25 hover:text-white/50 text-xs tracking-wide transition cursor-pointer">
          Bỏ qua →
        </span>
      </div>

      {/* ===== Chấm tiến trình ===== */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {SCENES.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === scene ? 'w-6 bg-[#4dd9f0]' : i < scene ? 'w-1.5 bg-[#4dd9f0]/40' : 'w-1.5 bg-white/15'
            }`}
          />
        ))}
      </div>
    </motion.div>
  )
}

export default CinematicIntro
