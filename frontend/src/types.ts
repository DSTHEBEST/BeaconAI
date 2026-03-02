export interface EvacuationRequest {
  source_lat: number
  source_lon: number
  dest_lat: number
  dest_lon: number
  hazard_lat: number
  hazard_lon: number
  time_step?: number
  city?: string
}

export interface EvacuationResponse {
  risk_aware_route: [number, number][]
  shortest_route: [number, number][]
  risk_aware_route_geojson: GeoJSON.Feature<GeoJSON.LineString>
  shortest_route_geojson: GeoJSON.Feature<GeoJSON.LineString>
  hazard_zone_geojson: GeoJSON.Feature<GeoJSON.Polygon>
  hazard_intensity: number[]
  risk_aware_metrics: { distance_m: number; risk_score: number }
  shortest_route_metrics: { distance_m: number; risk_score: number }
  exposure_reduction_percent: number
}
