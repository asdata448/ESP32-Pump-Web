'use client'

import type { CSSProperties } from 'react'

interface SyringePumpIconProps {
  className?: string
  style?: CSSProperties
}

/**
 * Minh hoạ MÁY BƠM TIÊM ĐIỆN (kiểu Terumo) — dạng ngang:
 * thân máy nằm ngang có màn hình + cụm nút, kẹp ống tiêm xanh lá,
 * ống tiêm nằm ngang bên phải, pittong đẩy, kim + giọt thuốc.
 */
export function SyringePumpIcon({ className, style }: SyringePumpIconProps) {
  const c = '#4dd9f0' // cyan (viền / màn hình / thuốc)
  const g = '#00cc66' // xanh lá (kẹp, pittong, nút chạy) — nhấn của máy thật
  const r = '#ff5a5a' // đỏ (nút dừng)
  const ink = '#162840'

  return (
    <svg
      viewBox="0 0 168 96"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sp-fluid2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4dd9f0" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#4dd9f0" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* ===== Chân máy ===== */}
      <rect x="30" y="78" width="11" height="6" rx="2.5" fill="rgba(77,217,240,0.18)" />
      <rect x="74" y="78" width="11" height="6" rx="2.5" fill="rgba(77,217,240,0.18)" />

      {/* ===== Thân máy (nằm ngang) ===== */}
      <rect x="12" y="32" width="96" height="46" rx="9" fill={ink} fillOpacity="0.92" stroke={c} strokeWidth="2.6" />
      {/* viền nhấn xanh lá phía trên */}
      <rect x="18" y="35.5" width="84" height="5" rx="2.5" fill="rgba(0,204,102,0.28)" />

      {/* ===== Màn hình ===== */}
      <rect x="19" y="45" width="29" height="19" rx="2.5" fill="rgba(77,217,240,0.16)" stroke={c} strokeWidth="1.6" />
      <text x="33.5" y="57.5" fontFamily="monospace" fontSize="8.5" fontWeight="700" fill={c} textAnchor="middle">30.0</text>
      <text x="33.5" y="62.5" fontFamily="sans-serif" fontSize="3.8" fill={c} fillOpacity="0.75" textAnchor="middle">mL/h</text>

      {/* ===== Cụm nút ===== */}
      <circle cx="56" cy="49" r="3.2" fill="rgba(0,204,102,0.3)" stroke={g} strokeWidth="1.6" />
      <circle cx="56" cy="61" r="3.2" fill="rgba(255,90,90,0.25)" stroke={r} strokeWidth="1.6" />
      <circle cx="65" cy="49" r="2.8" fill="rgba(255,255,255,0.08)" stroke={c} strokeWidth="1.3" />
      <circle cx="65" cy="61" r="2.8" fill="rgba(255,255,255,0.08)" stroke={c} strokeWidth="1.3" />

      {/* ===== Pittong đẩy (xanh lá) ===== */}
      <rect x="74" y="43" width="8" height="20" rx="2.5" fill="rgba(0,204,102,0.22)" stroke={g} strokeWidth="1.9" />
      <line x1="82" y1="53" x2="86" y2="53" stroke={g} strokeWidth="1.6" />

      {/* ===== Khe giữ ống tiêm ===== */}
      <rect x="84" y="46" width="16" height="14" rx="2" fill="rgba(13,27,53,0.9)" stroke={c} strokeWidth="1.3" />

      {/* ===== Kẹp ống tiêm (U xanh lá) ===== */}
      <path
        d="M98 44 L102 44 M98 62 L102 62 M102 44 L102 62"
        stroke={g}
        strokeWidth="1.9"
        fill="none"
        strokeLinecap="round"
      />

      {/* ===== Ống tiêm (nằm ngang, thò ra bên phải) ===== */}
      {/* piston (đầu bị pittong đẩy) */}
      <rect x="92" y="48" width="3.5" height="10" rx="1" fill={c} fillOpacity="0.55" />
      {/* thân ống */}
      <rect x="93" y="48" width="50" height="12" rx="2.5" fill="rgba(22,40,64,0.55)" stroke={c} strokeWidth="2.4" />
      {/* thuốc */}
      <rect x="100" y="50.5" width="37" height="7" rx="1.5" fill="url(#sp-fluid2)" />
      {/* vạch chia */}
      <g stroke={c} strokeWidth="1" strokeOpacity="0.7" strokeLinecap="round">
        <line x1="108" y1="47.5" x2="108" y2="50" />
        <line x1="116" y1="47.5" x2="116" y2="50" />
        <line x1="124" y1="47.5" x2="124" y2="50" />
        <line x1="132" y1="47.5" x2="132" y2="50" />
      </g>
      {/* cán nắm */}
      <rect x="141" y="44" width="3.5" height="20" rx="1.4" fill="none" stroke={c} strokeWidth="2" />
      {/* lõi kim */}
      <rect x="144.5" y="52" width="4" height="4" rx="1" fill={c} fillOpacity="0.7" />
      {/* kim */}
      <line x1="148.5" y1="54" x2="160" y2="54" stroke={c} strokeWidth="2.1" strokeLinecap="round" />
      {/* giọt thuốc */}
      <path d="M161 56.5 c-1.7 1.5 -1.7 3.2 0 4.8 c1.7 -1.6 1.7 -3.3 0 -4.8 z" fill={c} />
    </svg>
  )
}

export default SyringePumpIcon
