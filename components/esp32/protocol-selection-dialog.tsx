'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ChevronRight, X, CheckCircle2, Settings } from 'lucide-react'
import { PROTOCOLS, type ProtocolId } from '@/lib/pump-types'
import { SyringeType } from '@/lib/pump-types'

interface ProtocolSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedSyringe: SyringeType
  onSelectProtocol: (
    protocolId: ProtocolId | null,
    syringeType: SyringeType,
    speed: number,
    volume: number
  ) => void
}

export function ProtocolSelectionDialog({
  isOpen,
  onClose,
  selectedSyringe,
  onSelectProtocol
}: ProtocolSelectionDialogProps) {
  const [selectedProtocolId, setSelectedProtocolId] = useState<ProtocolId | null>(null)

  if (!isOpen) return null

  // Filter protocols by syringe compatibility
  const compatibleProtocols = PROTOCOLS.filter(
    p => p.syringeIndex === (selectedSyringe === '10CC' ? 0 : 1)
  )

  const groupedProtocols = [
    { category: 'Người lớn cấp cứu', protocols: compatibleProtocols.filter(p => p.id.startsWith('ADULT_ACUTE')) },
    { category: 'ICU người lớn thở máy', protocols: compatibleProtocols.filter(p => p.id.startsWith('ICU_VENT')) },
    { category: 'ICU sốc người lớn', protocols: compatibleProtocols.filter(p => p.id.startsWith('ICU_SHOCK')) },
    { category: 'Nhi khoa/Kháng sinh', protocols: compatibleProtocols.filter(p => p.id.startsWith('PEDIATRIC')) },
    { category: 'Sơ sinh/NICU', protocols: compatibleProtocols.filter(p => p.id === 'NEONATAL_NICU') },
    { category: 'Sau mổ/PCA', protocols: compatibleProtocols.filter(p => p.id === 'POST_OP_PCA') },
  ].filter(g => g.protocols.length > 0)

  const handleSelect = (protocolId: ProtocolId, protocol: any) => {
    setSelectedProtocolId(protocolId)
    onSelectProtocol(protocolId, selectedSyringe, protocol.defaultRate, protocol.defaultVTBI)
    onClose()
  }

  const handleManual = () => {
    setSelectedProtocolId(null)
    onSelectProtocol(null, selectedSyringe, 0, 0) // Manual mode
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="medical-card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold">3</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">CHỌN ĐỐI TƯỢNG</h2>
              <p className="text-sm text-muted-foreground">
                {selectedSyringe} - {compatibleProtocols.length} đối tượng có sẵn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Protocol List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {groupedProtocols.map((group) => (
            <div key={group.category} className="space-y-2">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                {group.category}
              </div>
              {group.protocols.map((protocol) => (
                <motion.button
                  key={protocol.id}
                  onClick={() => handleSelect(protocol.id as ProtocolId, protocol)}
                  className="w-full p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all"
                  whileHover={{ scale: 1.01, x: 4 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{protocol.shortName}</span>
                        {protocol.fixedRate && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-600 text-xs">
                            <Lock className="h-3 w-3" />
                            FIXED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Tốc độ: {protocol.defaultRate} mL/h</span>
                        <span>Phạm vi: {protocol.minRate}-{protocol.maxRate} mL/h</span>
                        <span>VTBI: {protocol.defaultVTBI} ml</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ⏱ {protocol.description}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </motion.button>
              ))}
            </div>
          ))}

          {/* Manual Mode */}
          <motion.button
            onClick={handleManual}
            className="w-full p-4 rounded-lg bg-secondary/20 hover:bg-secondary/30 border border-border transition-all"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Settings className="h-5 w-5 text-muted-foreground" />
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
      </motion.div>
    </div>
  )
}
