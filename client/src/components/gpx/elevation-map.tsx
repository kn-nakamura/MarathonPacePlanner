import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import { LatLngTuple } from 'leaflet';
import { ElevationPoint } from '@/utils/gpx-utils';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue in webpack/vite
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ElevationMapProps {
  points: ElevationPoint[];
  height?: number;
}

// マップの位置を自動的に調整するコンポーネント
const MapUpdater = ({ points }: { points: ElevationPoint[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (points.length > 0) {
      const latLngs = points.map(p => [p.lat, p.lon] as LatLngTuple);
      map.fitBounds(latLngs);
    }
  }, [map, points]);
  
  return null;
};

export function ElevationMap({ points, height = 400 }: ElevationMapProps) {
  const [polyline, setPolyline] = useState<LatLngTuple[]>([]);
  
  useEffect(() => {
    if (points.length > 0) {
      const latLngs = points.map(p => [p.lat, p.lon] as LatLngTuple);
      setPolyline(latLngs);
    }
  }, [points]);
  
  if (points.length === 0) {
    return (
      <div 
        className="flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        style={{ height }}
      >
        <p className="text-gray-500 dark:text-gray-400">GPXファイルをアップロードすると、コースマップが表示されます</p>
      </div>
    );
  }
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden" style={{ height }}>
      <MapContainer 
        center={[points[0].lat, points[0].lon]} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline 
          positions={polyline}
          color="#3B82F6"
          weight={4}
        />
        <MapUpdater points={points} />
      </MapContainer>
    </div>
  );
}