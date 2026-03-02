import { useState } from 'react'
import { motion } from 'framer-motion'
import BeaconMap from './components/BeaconMap'
import EarthStage from './components/EarthStage'
import type { EvacuationRequest } from './types'

const INITIAL_FORM: EvacuationRequest = {
  source_lat: 18.5204,
  source_lon: 73.8567,
  dest_lat: 18.597,
  dest_lon: 73.78,
  hazard_lat: 18.53,
  hazard_lon: 73.87,
  time_step: 1,
}

function App() {
  const [form, setForm] = useState<EvacuationRequest>(INITIAL_FORM)

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white font-mono">
      {/* Rotating Earth background on landing */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40 md:opacity-60">
        <EarthStage />
      </div>

      {/* Map layer */}
      <div className="absolute inset-0">
        <BeaconMap
          onEngage={() => {}}
          form={form}
          onFormChange={setForm}
        />
      </div>

      {/* Title – centered and always visible */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
        className="pointer-events-none absolute inset-x-0 top-8 flex flex-col items-center text-center"
      >
        <div className="text-2xl md:text-3xl font-semibold tracking-[0.08em] text-neutral-50">
          BEACON AI
        </div>
        <div className="mt-2 text-xs md:text-sm tracking-[0.14em] text-neutral-300">
          Evacuation Intelligence Console
        </div>
      </motion.div>
    </div>
  )
}

export default App

