'use client'

import { motion } from 'framer-motion'
import { ChevronRight, CheckCircle2, Lock } from 'lucide-react'
import { PROTOCOLS, type ProtocolId } from '@/lib/pump-types'
import type { SyringeType } from '@/lib/pump-types'

interface ProtocolSelectScreenProps {
  selectedSyringe: SyringeType
  onSelect: (protocolId: ProtocolId, syringeType: SyringeType, speed: number, volume: number) => void
  onManual: () => void
}

export function ProtocolSelectScreen({
  selectedSyringe,
  onSelect,
  onManual
}: ProtocolSelectScreenProps) {
  // Filter protocols by syringe compatibility
  const compatibleProtocols = PROTOCOLS.filter(
    p => p.syringeIndex === (selectedSyringe === '10CC' ? 0 : 1)
  )

  const groupedProtocols = [
    { category: 'Người lớn đau cấp', protocols: compatibleProtocols.filter(p => p.id.startsWith('ADULT_ACUTE')) },
    { category: 'ICU người lớn thở máy', protocols: compatibleProtocols.filter(p => p.id.startsWith('ICU_VENT')) },
    { category: 'ICU sốc người lớn', protocols: compatibleProtocols.filter(p => p.id.startsWith('ICU_SHOCK')) },
    { category: 'Nhi khoa/Kháng sinh', protocols: compatibleProtocols.filter(p => p.id.startsWith('PEDIATRIC')) },
    { category: 'Sơ sinh/NICU', protocols: compatibleProtocols.filter(p => p.id === 'NEONATAL_NICU') },
    { category: 'Sau mổ/PCA', protocols: compatibleProtocols.filter(p => p.id === 'POST_OP_PCA') },
  ].filter(g => g.protocols.length > 0)

  const handleSelect = (protocolId: ProtocolId, protocol: any) => {
    onSelect(protocolId, selectedSyringe, protocol.defaultRate, protocol.defaultVTBI)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">3</span>
          </div>
          <h2 className="text-lg font-bold">CHỌN PROTOCOL</h2>
        </div>
        <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          {selectedSyringe}
        </div>
      </div>

      {/* Info */}
      <div className="text-sm text-muted-foreground mb-4">
        Chọn protocol bệnh nhân ({compatibleProtocols.length} available for {selectedSyringe})
      </div>

      {/* Protocol List */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {groupedProtocols.map((group) => (
          <div key={group.category} className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {group.category}
            </div>
            {group.protocols.map((protocol) => (
              <motion.button
                key={protocol.id}
                onClick={() => handleSelect(protocol.id as ProtocolId, protocol)}
                className="w-full medical-panel-inner p-4 rounded-lg text-left hover:border-primary/50 transition-all"
                whileHover={{ scale: 1.01, x: 4 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{protocol.shortName}</span>
                      {protocol.fixedRate && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-600 text-xs">
                          <Lock className="h-3 w-3" />
                          FIXED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Tốc độ: {protocol.defaultRate} mL/h</span>
                      <span>Range: {protocol.minRate}-{protocol.maxRate} mL/h</span>
                      <span>VTBI: {protocol.defaultVTBI} ml</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ⏱ {protocol.description}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </motion.button>
            ))}
          </div>
        ))}
      </div>

      {/* Manual Mode Button */}
      <div className="mt-4 pt-4 border-t border-border">
        <motion.button
          onClick={onManual}
          className="w-full p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground font-bold">M</span>
              </div>
              <div className="text-left">
                <div className="font-medium">Chế độ thủ công</div>
                <div className="text-xs text-muted-foreground">
                  Tự chọn tốc độ và thể tích
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </motion.button>
      </div>
    </div>
  )
}
