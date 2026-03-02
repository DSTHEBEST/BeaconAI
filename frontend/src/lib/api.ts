import type { EvacuationRequest, EvacuationResponse } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || ''

export async function computeEvacuation(
  payload: EvacuationRequest
): Promise<EvacuationResponse> {
  const res = await fetch(`${API_BASE}/evacuate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      time_step: payload.time_step ?? 1,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}
