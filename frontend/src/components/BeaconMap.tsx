import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, {
  Map as MapLibreMap,
  StyleSpecification,
} from 'maplibre-gl'
import { motion, AnimatePresence } from 'framer-motion'
import type { EvacuationRequest, EvacuationResponse } from '../types'
import { computeEvacuation } from '../lib/api'

import 'maplibre-gl/dist/maplibre-gl.css'

type Props = {
  onEngage: () => void
  form: EvacuationRequest
  onFormChange: (next: EvacuationRequest) => void
}

const INITIAL_CAMERA = {
  center: [73.8567, 18.5204] as [number, number],
  zoom: 11,
  pitch: 45,
  bearing: 0,
}

const style: StyleSpecification = {
  version: 8,
  name: 'Beacon Void',
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    openfreemap: {
      type: 'vector',
      tiles: [
        'https://tiles.openfreemap.org/planet/20260218_001001_pt/{z}/{x}/{y}.pbf',
      ],
      minzoom: 0,
      maxzoom: 14,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#000000',
      },
    },
    {
      id: 'landcover',
      type: 'fill',
      source: 'openfreemap',
      'source-layer': 'landcover',
      paint: {
        'fill-color': '#000000',
      },
    },
    {
      id: 'landuse',
      type: 'fill',
      source: 'openfreemap',
      'source-layer': 'landuse',
      paint: {
        'fill-color': '#000000',
      },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'openfreemap',
      'source-layer': 'water',
      paint: {
        'fill-color': '#000000',
      },
    },
    {
      id: 'roads',
      type: 'line',
      source: 'openfreemap',
      'source-layer': 'transportation',
      paint: {
        'line-color': '#444444',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5,
          0.15,
          12,
          1.6,
          16,
          2.6,
        ],
        'line-opacity': 0.7,
      },
    },
  ],
}

const BeaconMap = ({ engaged, onEngage, form, onFormChange }: Props) => {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<EvacuationResponse | null>(null)
  const [animationStart, setAnimationStart] = useState<number | null>(null)

  // Derived camera center based on form (midpoint source/destination)
  const cameraCenter = useMemo<[number, number]>(() => {
    const lon = (form.source_lon + form.dest_lon) / 2
    const lat = (form.source_lat + form.dest_lat) / 2
    return [lon, lat]
  }, [form])

  const attachSourcesAndLayers = useCallback(
    (map: MapLibreMap) => {
      if (!result) return

      const sources = map.getStyle().sources
      if (!sources['routes']) {
        map.addSource('routes', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        })
      }
      if (!sources['hazard']) {
        map.addSource('hazard', {
          type: 'geojson',
          data: result.hazard_zone_geojson,
        })
      } else {
        const hazardSource = map.getSource('hazard') as any
        hazardSource?.setData(result.hazard_zone_geojson)
      }

      ;(map.getSource('routes') as any).setData({
        type: 'FeatureCollection',
        features: [
          { ...result.risk_aware_route_geojson, properties: { kind: 'safe' } },
          {
            ...result.shortest_route_geojson,
            properties: { kind: 'shortest' },
          },
        ],
      })

      // Hazard zone – static noise shader-like fill via pattern
      if (!map.getLayer('hazard-fill')) {
        map.addLayer({
          id: 'hazard-fill',
          type: 'fill',
          source: 'hazard',
          paint: {
            'fill-color': '#ffffff',
            'fill-opacity': 0.12,
            'fill-pattern': 'hazard-static', // will be added via image
          },
        })
      }

      // Shortest route – dim grey line
      if (!map.getLayer('route-shortest')) {
        map.addLayer({
          id: 'route-shortest',
          type: 'line',
          source: 'routes',
          filter: ['==', ['get', 'kind'], 'shortest'],
          paint: {
            'line-color': '#444444',
            'line-width': 1.2,
            'line-opacity': 0.4,
          },
        })
      }

      // Safe route – white glowing filament with animated gradient
      if (!map.getLayer('route-safe')) {
        map.addLayer({
          id: 'route-safe',
          type: 'line',
          source: 'routes',
          filter: ['==', ['get', 'kind'], 'safe'],
          paint: {
            'line-color': '#ffffff',
            'line-width': 3.2,
            'line-blur': 1.4,
            'line-opacity': 0.95,
          },
        })
      }

      // Hazard corrupted halo using line layer
      if (!map.getLayer('route-safe-corruption')) {
        map.addLayer({
          id: 'route-safe-corruption',
          type: 'line',
          source: 'routes',
          filter: ['==', ['get', 'kind'], 'safe'],
          paint: {
            'line-color': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10,
              '#555555',
              14,
              '#ffffff',
            ],
            'line-width': 5,
            'line-opacity': 0.3,
            'line-dasharray': [0.5, 1.5],
          },
        })
      }
    },
    [result]
  )

  const setupOrbitCamera = useCallback((map: MapLibreMap) => {
    let start: number | null = null
    const orbitDuration = 60000 // 60 seconds

    const frame = (timestamp: number) => {
      if (!start) start = timestamp
      const elapsed = timestamp - start
      const t = (elapsed % orbitDuration) / orbitDuration
      const bearing = t * 360

      map.setBearing(bearing)
      map.setPitch(INITIAL_CAMERA.pitch)

      requestAnimationFrame(frame)
    }

    requestAnimationFrame(frame)
  }, [])

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style,
      center: cameraCenter,
      zoom: INITIAL_CAMERA.zoom,
      pitch: INITIAL_CAMERA.pitch,
      bearing: INITIAL_CAMERA.bearing,
      attributionControl: true,
    })

    mapRef.current = map

    map.on('load', () => {
      // Low-level static noise pattern for hazard
      const size = 64
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const imageData = ctx.createImageData(size, size)
        for (let i = 0; i < imageData.data.length; i += 4) {
          const v = Math.random() * 255
          imageData.data[i] = v
          imageData.data[i + 1] = v
          imageData.data[i + 2] = v
          imageData.data[i + 3] = 40 // alpha
        }
        ctx.putImageData(imageData, 0, 0)
        const data = ctx.getImageData(0, 0, size, size).data
        map.addImage(
          'hazard-static',
          {
            width: size,
            height: size,
            data,
          },
          { pixelRatio: 1 }
        )
      }

      setupOrbitCamera(map)

      if (result) {
        attachSourcesAndLayers(map)
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [attachSourcesAndLayers, cameraCenter, result, setupOrbitCamera])

  // Update camera center when form changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({
      center: cameraCenter,
      duration: 1200,
    })
  }, [cameraCenter])

  // Animate glowing line using line-gradient+progress-like illusion by stroking opacity
  useEffect(() => {
    if (!result || !mapRef.current) return
    const map = mapRef.current
    let frameId: number
    let start = animationStart ?? performance.now()

    const animate = () => {
      const elapsed = performance.now() - start
      const phase = (elapsed % 2000) / 2000 // 2s loop 0..1
      const base = 0.4 + 0.6 * Math.sin(phase * Math.PI * 2)

      map.setPaintProperty('route-safe', 'line-opacity', 0.6 + 0.3 * base)
      map.setPaintProperty(
        'route-safe-corruption',
        'line-opacity',
        0.15 + 0.15 * base
      )

      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [result, animationStart])

  const handleInput =
    (field: keyof EvacuationRequest) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value)
      onFormChange({
        ...form,
        [field]: isNaN(value) ? 0 : value,
      })
    }

  const handleCompute = async () => {
    try {
      setError(null)
      setLoading(true)
      onEngage()

      const res = await computeEvacuation(form)
      setResult(res)
      setAnimationStart(performance.now())

      const map = mapRef.current
      if (map) {
        attachSourcesAndLayers(map)

        // Fit to risk-aware route bounds
        const coords = res.risk_aware_route_geojson.geometry.coordinates
        const bounds = coords.reduce(
          (b, c) => b.extend(c as [number, number]),
          new maplibregl.LngLatBounds(
            coords[0] as [number, number],
            coords[0] as [number, number]
          )
        )
        map.fitBounds(bounds, { padding: 80, duration: 1800 })
      }
    } catch (err: any) {
      setError(err.message ?? 'Unable to compute evacuation route.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div ref={mapContainer} className="h-full w-full" />

      {/* Command Capsule */}
      <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="pointer-events-auto w-full max-w-3xl rounded-3xl border border-white/14 bg-black/80 px-7 py-5 shadow-[0_0_50px_rgba(255,255,255,0.12)] backdrop-blur-[22px]"
        >
          <div className="flex flex-col gap-4 text-[0.9rem] uppercase tracking-[0.12em] text-neutral-100 md:flex-row md:items-end md:justify-between">
            <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <div className="mb-1 text-sm text-neutral-300">
                  Source (Lat, Lon)
                </div>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.0001"
                    value={form.source_lat}
                    onChange={handleInput('source_lat')}
                    className="w-1/2 rounded border border-white/30 bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-white/70"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={form.source_lon}
                    onChange={handleInput('source_lon')}
                    className="w-1/2 rounded border border-white/30 bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-white/70"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 text-sm text-neutral-300">
                  Destination (Lat, Lon)
                </div>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.0001"
                    value={form.dest_lat}
                    onChange={handleInput('dest_lat')}
                    className="w-1/2 rounded border border-white/30 bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-white/70"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={form.dest_lon}
                    onChange={handleInput('dest_lon')}
                    className="w-1/2 rounded border border-white/30 bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-white/70"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 text-sm text-neutral-300">
                  Hazard (Lat, Lon)
                </div>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.0001"
                    value={form.hazard_lat}
                    onChange={handleInput('hazard_lat')}
                    className="w-1/2 rounded border border-white/30 bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-white/70"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={form.hazard_lon}
                    onChange={handleInput('hazard_lon')}
                    className="w-1/2 rounded border border-white/30 bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-white/70"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 text-sm text-neutral-300">
                  Time Step
                </div>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.time_step ?? 1}
                  onChange={handleInput('time_step')}
                  className="w-full rounded border border-white/30 bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-white/70"
                />
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between gap-4 md:mt-0 md:flex-col md:items-end">
              <div className="text-[0.8rem] text-neutral-300">
                <AnimatePresence mode="wait">
                  {result && !error && (
                    <motion.div
                      key="metrics"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-0.5 text-right"
                    >
                      <div>
                        RISK SCORE:{' '}
                        <span className="text-neutral-200">
                          {result.risk_aware_metrics.risk_score.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        EXPOSURE Δ:{' '}
                        <span className="text-emerald-300">
                          -{result.exposure_reduction_percent.toFixed(1)}%
                        </span>
                      </div>
                    </motion.div>
                  )}
                  {error && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="max-w-xs text-right text-[0.8rem] text-red-400"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleCompute}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/15 px-7 py-3 text-sm md:text-base tracking-[0.2em] text-white transition hover:bg-white/25 hover:shadow-[0_0_36px_rgba(255,255,255,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? 'COMPUTING…' : 'COMPUTE'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

export default BeaconMap

