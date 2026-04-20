'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wifi, 
  Syringe, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Home,
  Settings,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplets,
  Gauge,
  Maximize,
  Minimize,
  History,
  Loader2,
  X,
  Volume2,
  VolumeX
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePumpSimulation } from '@/hooks/use-pump-simulation'
import { StateBadge } from '@/components/demo/state-badge'
import { SyringeVisual } from '@/components/demo/syringe-visual'
import { FSRGauge } from '@/components/demo/fsr-gauge'
import { DemoControlPanel } from '@/components/demo/demo-control-panel'
import { DemoHistoryPanel } from '@/components/demo/demo-history-panel'
import { TechnicalSpecs } from '@/components/demo/technical-specs'
import { formatTime, SYRINGE_SPECS } from '@/lib/pump-types'
import { SYRINGE_CALIBRATION, FSR_THRESHOLDS } from '@/lib/demo-types'
import Link from 'next/link'

export default function DemoPage() {
  const [currentTime, setCurrentTime] = useState('--:--:--')
  const [showHistory, setShowHistory] = useState(false)
  
  const sim = usePumpSimulation()
  const { state, controlFlags, history, presentationMode, remainingTimeSec } = sim

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('vi-VN', { hour12: false }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Start boot on mount - intentionally only run once
  useEffect(() => {
    sim.boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Render screen based on state
  const renderScreen = () => {
    switch (state.state) {
      case 'BOOT':
        return <BootScreen />
      case 'SYRINGE':
        return <SyringeSelectScreen onSelect={sim.selectSyringe} />
      case 'MAIN':
        return (
          <MainMenuScreen 
            onSetup={sim.gotoSetup}
            onHistory={() => setShowHistory(true)}
            onReset={sim.resetDemo}
          />
        )
      case 'SETUP':
        return (
          <SetupScreen
            syringeType={state.syringeType}
            speed={state.speedMlh}
            volume={state.volumeMl}
            estimatedTime={state.estimatedTimeSec}
            stepsPerMl={state.stepsPerMl}
            totalSteps={state.totalSteps}
            onUpdateConfig={sim.updateConfig}
            onPrepare={sim.prepare}
            onBack={sim.goBack}
          />
        )
      case 'PREPARE':
        return <PrepareScreen stage={state.prepareStage} homed={state.homed} contactFound={state.contactFound} />
      case 'READY':
        return (
          <ReadyScreen
            state={state}
            onStart={sim.start}
            onRehome={sim.rehome}
            onEdit={sim.gotoSetup}
          />
        )
      case 'RESULT':
        return (
          <RunningScreen
            state={state}
            remainingTime={remainingTimeSec}
            onPause={sim.pause}
            onResume={sim.resume}
            onStop={sim.stop}
          />
        )
      case 'ERROR':
        return (
          <ErrorScreen
            errorType={state.errorType}
            onReset={sim.resetAlarm}
            onBack={sim.goBack}
          />
        )
      case 'DONE':
        return (
          <DoneScreen
            state={state}
            onBack={sim.goBack}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className={`min-h-screen ${presentationMode ? 'p-0' : ''}`}>
      {/* Header */}
      <header className="header-gradient sticky top-0 z-50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Left - Logo & Title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-wide">MAY BOM TIEM DIEN</h1>
              <p className="text-xs text-muted-foreground">Mo phong phan mem</p>
            </div>
          </div>

          {/* Center - State Badge */}
          <StateBadge state={state.state} paused={state.paused} size="md" />

          {/* Right - Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 wifi-icon" />
              <div className="flex items-center gap-1.5">
                <div className="status-dot status-dot-online" />
                <span className="text-xs text-success">Demo</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-mono" suppressHydrationWarning>
              {currentTime}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => sim.setPresentationMode(!presentationMode)}
            >
              {presentationMode ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Simulation Badge */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-primary">
            Mo phong doc lap, khong can phan cung
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className={`px-4 py-6 ${presentationMode ? 'pb-0' : ''}`}>
        <div className="max-w-6xl mx-auto grid gap-4 lg:grid-cols-[1fr,320px]">
          {/* Main Screen Area */}
          <div className="space-y-4">
            {/* Main Panel */}
            <div className={`medical-panel p-6 ${presentationMode ? 'min-h-[70vh]' : 'min-h-[400px]'}`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={state.state}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  {renderScreen()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* FSR Gauge - Show during running states */}
            {(state.state === 'RESULT' || state.state === 'READY' || state.state === 'ERROR') && (
              <div className="medical-panel p-4">
                <FSRGauge
                  value={state.fsrRaw}
                  presenceThreshold={FSR_THRESHOLDS.presenceThreshold}
                  occlusionThreshold={FSR_THRESHOLDS.occlusionThreshold}
                  isAlert={state.errorType === 'OCCLUSION'}
                />
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Demo Control Panel */}
            <DemoControlPanel
              controlFlags={controlFlags}
              onUpdateFlags={sim.updateControlFlags}
              onTriggerOcclusion={sim.triggerOcclusion}
              onRunAutoDemo={sim.runAutoDemo}
              isAutoDemo={state.isAutoDemo}
              disabled={state.state === 'BOOT'}
            />

            {/* History Panel */}
            <DemoHistoryPanel
              history={history}
              onClear={sim.clearHistory}
            />

            {/* Technical Specs */}
            <TechnicalSpecs />
          </div>
        </div>
      </main>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="medical-panel p-6 max-w-md w-full max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Lich su bom</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DemoHistoryPanel history={history} onClear={sim.clearHistory} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== SCREEN COMPONENTS =====

function BootScreen() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="h-16 w-16 text-primary" />
      </motion.div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">DANG KHOI DONG...</h2>
        <p className="text-sm text-muted-foreground">Khoi tao he thong may bom tiem</p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  )
}

function SyringeSelectScreen({ onSelect }: { onSelect: (type: '10CC' | '20CC') => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <Syringe className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">CHON LOAI ONG TIEM</h2>
        <p className="text-sm text-muted-foreground">Chon loai ong tiem phu hop</p>
      </div>
      
      <div className="flex gap-4">
        {SYRINGE_SPECS.map((spec) => (
          <motion.button
            key={spec.name}
            onClick={() => onSelect(spec.name)}
            className="medical-panel-inner p-6 rounded-xl hover:border-primary/50 transition-colors cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{spec.name}</div>
              <div className="text-xs text-muted-foreground">{spec.mmPerMl} mm/ml</div>
              <div className="text-xs text-muted-foreground mt-1">
                {SYRINGE_CALIBRATION[spec.name].stepsPerMl} steps/ml
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function MainMenuScreen({ 
  onSetup, 
  onHistory, 
  onReset 
}: { 
  onSetup: () => void
  onHistory: () => void
  onReset: () => void
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <Home className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">MAN HINH CHINH</h2>
        <p className="text-sm text-muted-foreground">Chon thao tac can thuc hien</p>
      </div>
      
      <div className="grid grid-cols-1 gap-3 w-full max-w-xs">
        <Button onClick={onSetup} className="btn-primary h-14 text-base gap-2">
          <Settings className="h-5 w-5" />
          Bat dau cai dat
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Button>
        
        <Button onClick={onHistory} variant="outline" className="h-12 gap-2">
          <History className="h-4 w-4" />
          Xem lich su
        </Button>
        
        <Button onClick={onReset} variant="ghost" className="h-10 gap-2 text-muted-foreground">
          <RotateCcw className="h-4 w-4" />
          Reset demo
        </Button>
      </div>
    </div>
  )
}

function SetupScreen({
  syringeType,
  speed,
  volume,
  estimatedTime,
  stepsPerMl,
  totalSteps,
  onUpdateConfig,
  onPrepare,
  onBack,
}: {
  syringeType: string
  speed: number
  volume: number
  estimatedTime: number
  stepsPerMl: number
  totalSteps: number
  onUpdateConfig: (speed: number, volume: number) => void
  onPrepare: () => void
  onBack: () => void
}) {
  const [localSpeed, setLocalSpeed] = useState('')
  const [localVolume, setLocalVolume] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const cal = SYRINGE_CALIBRATION[syringeType as '10CC' | '20CC']

  // Initialize local state from props after mount to avoid hydration mismatch
  useEffect(() => {
    if (!isInitialized) {
      setLocalSpeed(speed.toString())
      setLocalVolume(volume.toString())
      setIsInitialized(true)
    }
  }, [speed, volume, isInitialized])

  const handleSpeedChange = (value: string) => {
    setLocalSpeed(value)
    const num = parseFloat(value)
    if (!isNaN(num) && num >= cal.minSpeedMlh && num <= cal.maxSpeedMlh) {
      onUpdateConfig(num, parseFloat(localVolume) || volume)
    }
  }

  const handleVolumeChange = (value: string) => {
    setLocalVolume(value)
    const num = parseFloat(value)
    if (!isNaN(num) && num > 0 && num <= cal.maxVolume) {
      onUpdateConfig(parseFloat(localSpeed) || speed, num)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-bold">CAI DAT THONG SO</h2>
        </div>
        <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          {syringeType}
        </div>
      </div>

      {/* Config Fields */}
      <div className="space-y-4 flex-1">
        <div className="medical-panel-inner p-4 rounded-lg">
          <label className="text-sm text-muted-foreground mb-2 block">
            Toc do (ml/h) - Min: {cal.minSpeedMlh}, Max: {cal.maxSpeedMlh}
          </label>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <Input
              type="number"
              value={localSpeed}
              onChange={(e) => handleSpeedChange(e.target.value)}
              className="text-2xl font-mono h-12"
              step="0.1"
              min={cal.minSpeedMlh}
              max={cal.maxSpeedMlh}
            />
            <span className="text-muted-foreground">ml/h</span>
          </div>
        </div>

        <div className="medical-panel-inner p-4 rounded-lg">
          <label className="text-sm text-muted-foreground mb-2 block">
            The tich (ml) - Max: {cal.maxVolume}
          </label>
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            <Input
              type="number"
              value={localVolume}
              onChange={(e) => handleVolumeChange(e.target.value)}
              className="text-2xl font-mono h-12"
              step="0.5"
              min="0.1"
              max={cal.maxVolume}
            />
            <span className="text-muted-foreground">ml</span>
          </div>
        </div>

        {/* Calculated Info */}
        <div className="grid grid-cols-3 gap-3">
          <div className="medical-panel-inner p-3 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Thoi gian</div>
            <div className="text-lg font-mono text-primary">{formatTime(estimatedTime)}</div>
          </div>
          <div className="medical-panel-inner p-3 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Steps/ml</div>
            <div className="text-lg font-mono text-primary">{stepsPerMl}</div>
          </div>
          <div className="medical-panel-inner p-3 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Tong steps</div>
            <div className="text-lg font-mono text-primary">{totalSteps}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <Button onClick={onBack} variant="outline" className="flex-1 h-12">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Quay lai
        </Button>
        <Button onClick={onPrepare} className="btn-primary flex-1 h-12">
          Chuan bi
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

function PrepareScreen({ 
  stage, 
  homed, 
  contactFound 
}: { 
  stage: string
  homed: boolean
  contactFound: boolean
}) {
  const steps = [
    { id: 'HOMING', label: 'Dang ve vi tri home...', done: homed },
    { id: 'FINDING_CONTACT', label: 'Dang tim tiep xuc piston...', done: contactFound },
    { id: 'RECOGNIZED', label: 'Da nhan dien ong tiem', done: stage === 'RECOGNIZED' || stage === 'COMPLETE' },
    { id: 'COMPLETE', label: 'San sang truyen', done: stage === 'COMPLETE' },
  ]

  const currentIndex = steps.findIndex(s => s.id === stage)

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="inline-block mb-4"
        >
          <Loader2 className="h-12 w-12 text-primary" />
        </motion.div>
        <h2 className="text-xl font-bold mb-2">DANG CHUAN BI...</h2>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ 
              opacity: index <= currentIndex ? 1 : 0.3,
              x: 0 
            }}
            transition={{ delay: index * 0.3 }}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              step.done ? 'bg-success/10' : index === currentIndex ? 'bg-primary/10' : 'bg-muted/30'
            }`}
          >
            {step.done ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : index === currentIndex ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-5 w-5 text-primary" />
              </motion.div>
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
            )}
            <span className={step.done ? 'text-success' : index === currentIndex ? 'text-primary' : 'text-muted-foreground'}>
              {step.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function ReadyScreen({
  state,
  onStart,
  onRehome,
  onEdit,
}: {
  state: any
  onStart: () => void
  onRehome: () => void
  onEdit: () => void
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle2 className="h-6 w-6 text-success" />
        <h2 className="text-lg font-bold text-success">SAN SANG TRUYEN</h2>
      </div>

      {/* Summary */}
      <div className="flex-1 grid grid-cols-2 gap-4">
        <div className="medical-panel-inner p-4 rounded-lg">
          <div className="text-xs text-muted-foreground mb-2">Ong tiem</div>
          <div className="text-2xl font-bold text-primary">{state.syringeType}</div>
        </div>
        
        <div className="medical-panel-inner p-4 rounded-lg">
          <div className="text-xs text-muted-foreground mb-2">Toc do</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary">{state.speedMlh}</span>
            <span className="text-sm text-muted-foreground">ml/h</span>
          </div>
        </div>
        
        <div className="medical-panel-inner p-4 rounded-lg">
          <div className="text-xs text-muted-foreground mb-2">The tich</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary">{state.volumeMl}</span>
            <span className="text-sm text-muted-foreground">ml</span>
          </div>
        </div>
        
        <div className="medical-panel-inner p-4 rounded-lg">
          <div className="text-xs text-muted-foreground mb-2">Thoi gian</div>
          <div className="text-2xl font-bold text-primary">{formatTime(state.estimatedTimeSec)}</div>
        </div>

        {/* Status Indicators */}
        <div className="col-span-2 flex gap-3">
          <div className={`flex-1 p-3 rounded-lg flex items-center gap-2 ${state.homed ? 'bg-success/10' : 'bg-muted/30'}`}>
            <div className={`w-3 h-3 rounded-full ${state.homed ? 'bg-success' : 'bg-muted-foreground'}`} />
            <span className="text-sm">Da ve home</span>
          </div>
          <div className={`flex-1 p-3 rounded-lg flex items-center gap-2 ${state.contactFound ? 'bg-success/10' : 'bg-muted/30'}`}>
            <div className={`w-3 h-3 rounded-full ${state.contactFound ? 'bg-success' : 'bg-muted-foreground'}`} />
            <span className="text-sm">Tiep xuc piston</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <Button onClick={onEdit} variant="outline" className="h-12">
          <Settings className="h-4 w-4 mr-2" />
          Sua
        </Button>
        <Button onClick={onRehome} variant="outline" className="h-12">
          <RotateCcw className="h-4 w-4 mr-2" />
          Ve home
        </Button>
        <Button onClick={onStart} className="btn-primary flex-1 h-14 text-lg">
          <Play className="h-5 w-5 mr-2" />
          BAT DAU
        </Button>
      </div>
    </div>
  )
}

function RunningScreen({
  state,
  remainingTime,
  onPause,
  onResume,
  onStop,
}: {
  state: any
  remainingTime: number
  onPause: () => void
  onResume: () => void
  onStop: () => void
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Status Bar */}
      <div className={`status-bar mb-6 ${state.paused ? 'status-bar-paused' : 'status-bar-running'}`}>
        {state.paused ? 'TAM DUNG' : 'DANG TRUYEN'}
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-[1fr,auto] gap-6">
        {/* Left - Parameters */}
        <div className="space-y-1">
          <div className="param-row">
            <span className="param-label">Ong tiem</span>
            <span className="text-lg font-medium">{state.syringeType}</span>
          </div>
          <div className="param-row">
            <span className="param-label">Toc do</span>
            <div className="flex items-baseline gap-1">
              <span className="value-large">{state.speedMlh.toFixed(1)}</span>
              <span className="value-unit">ml/h</span>
            </div>
          </div>
          <div className="param-row">
            <span className="param-label">The tich</span>
            <div className="flex items-baseline gap-1">
              <span className="value-large">{state.volumeMl}</span>
              <span className="value-unit">ml</span>
            </div>
          </div>
          <div className="param-row">
            <span className="param-label">Da truyen</span>
            <div className="flex items-baseline gap-1">
              <span className="value-large">{state.infusedVolumeMl.toFixed(2)}</span>
              <span className="value-unit">ml</span>
            </div>
          </div>
          <div className="param-row">
            <span className="param-label">Thoi gian con lai</span>
            <span className="value-medium">{formatTime(remainingTime)}</span>
          </div>
        </div>

        {/* Right - Syringe Visual */}
        <div className="flex flex-col items-center">
          <SyringeVisual
            syringeType={state.syringeType}
            progressPercent={state.progressPercent}
            isRunning={state.pumping}
            isPaused={state.paused}
            contactFound={state.contactFound}
          />
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Tien trinh</span>
          <span>{state.progressPercent.toFixed(1)}%</span>
        </div>
        <div className="progress-track h-3">
          <motion.div
            className="progress-fill"
            style={{ width: `${state.progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{Math.floor(state.stepsCompleted)} / {state.totalSteps} steps</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        {state.paused ? (
          <Button onClick={onResume} className="btn-primary flex-1 h-14">
            <Play className="h-5 w-5 mr-2" />
            TIEP TUC
          </Button>
        ) : (
          <Button onClick={onPause} className="flex-1 h-14 btn-secondary">
            <Pause className="h-5 w-5 mr-2" />
            TAM DUNG
          </Button>
        )}
        <Button onClick={onStop} variant="destructive" className="h-14 px-8">
          <Square className="h-5 w-5 mr-2" />
          DUNG
        </Button>
      </div>
    </div>
  )
}

function ErrorScreen({
  errorType,
  onReset,
  onBack,
}: {
  errorType: string | null
  onReset: () => void
  onBack: () => void
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        <AlertTriangle className="h-20 w-20 text-destructive" />
      </motion.div>
      
      <div className="text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">
          {errorType === 'OCCLUSION' ? 'NGHEN ONG!' : 'LOI HE THONG!'}
        </h2>
        <p className="text-muted-foreground">
          {errorType === 'OCCLUSION' 
            ? 'Phat hien nghen trong qua trinh bom. Vui long kiem tra ong tiem.'
            : 'Da xay ra loi. Vui long thu lai.'}
        </p>
      </div>

      <div className="status-bar status-bar-error w-full max-w-xs">
        LOI - {errorType}
      </div>

      <div className="flex gap-3">
        <Button onClick={onReset} className="btn-primary h-12">
          <RotateCcw className="h-4 w-4 mr-2" />
          Xoa canh bao
        </Button>
        <Button onClick={onBack} variant="outline" className="h-12">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Quay lai
        </Button>
      </div>
    </div>
  )
}

function DoneScreen({
  state,
  onBack,
}: {
  state: any
  onBack: () => void
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
      >
        <CheckCircle2 className="h-20 w-20 text-success" />
      </motion.div>
      
      <div className="text-center">
        <h2 className="text-2xl font-bold text-success mb-2">HOAN THANH!</h2>
        <p className="text-muted-foreground">
          Da truyen thanh cong {state.infusedVolumeMl.toFixed(2)} ml
        </p>
      </div>

      {/* Buzzer indicator */}
      <motion.div
        animate={{ opacity: state.buzzerOn ? [1, 0.5, 1] : 1 }}
        transition={{ duration: 0.3, repeat: state.buzzerOn ? Infinity : 0 }}
        className="flex items-center gap-2"
      >
        {state.buzzerOn ? (
          <Volume2 className="h-5 w-5 text-warning-foreground" />
        ) : (
          <VolumeX className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">
          {state.buzzerOn ? 'Buzzer dang keu' : 'Buzzer tat'}
        </span>
      </motion.div>

      <div className="status-bar status-bar-ready w-full max-w-xs">
        HOAN THANH
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <div className="medical-panel-inner p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground mb-1">Da truyen</div>
          <div className="text-xl font-mono text-primary">{state.infusedVolumeMl.toFixed(2)} ml</div>
        </div>
        <div className="medical-panel-inner p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground mb-1">Thoi gian</div>
          <div className="text-xl font-mono text-primary">{formatTime(state.elapsedTimeSec)}</div>
        </div>
      </div>

      <Button onClick={onBack} className="btn-primary h-12 px-8">
        <ChevronLeft className="h-4 w-4 mr-2" />
        Quay lai man hinh chinh
      </Button>
    </div>
  )
}
