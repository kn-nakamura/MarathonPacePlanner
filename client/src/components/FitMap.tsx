// client/src/components/FitMap.tsx

import React from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/** FIT レコードの位置情報型 */
interface FitRecord {
  position?: { latitude: number; longitude: number }
}

/** プロップス型 */
interface FitMapProps {
  records: FitRecord[]
}

export default function FitMap({ records }: FitMapProps) {
  // 有効な位置情報のみ抽出
  const latlngs = records
    .map(r => r.position && [r.position.latitude, r.position.longitude] as [number, number])
    .filter((pt): pt is [number, number] => !!pt)

  if (latlngs.length === 0) {
    return <p className="text-center text-gray-500">No GPS track available.</p>
  }

  const start = latlngs[0]
  const end = latlngs[latlngs.length - 1]

  return (
    <div className="h-96 w-full mb-8 rounded-md overflow-hidden">
      <MapContainer
        center={start}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 軌跡をポリラインで */}
        <Polyline positions={latlngs} color="#10b981" weight={4} opacity={0.7} />

        {/* スタート／ゴールマーカー */}
        <Marker position={start} icon={L.icon({ iconUrl: '/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] })}>
          <Popup>Start</Popup>
        </Marker>
        <Marker position={end} icon={L.icon({ iconUrl: '/marker-icon-red.png', iconSize: [25, 41], iconAnchor: [12, 41] })}>
          <Popup>Finish</Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}