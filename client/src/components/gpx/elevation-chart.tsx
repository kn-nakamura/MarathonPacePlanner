import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { ElevationPoint } from '@/utils/gpx-utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ElevationChartProps {
  points: ElevationPoint[];
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length && label) {
    return (
      <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded shadow-sm text-xs">
        <p className="font-semibold">{`距離: ${parseFloat(String(label)).toFixed(2)} km`}</p>
        <p>{`標高: ${payload[0].value} m`}</p>
        <p>{`累積上昇: ${payload[0].payload.cumElevGain.toFixed(0)} m`}</p>
        <p>{`累積下降: ${payload[0].payload.cumElevLoss.toFixed(0)} m`}</p>
      </div>
    );
  }
  
  return null;
};

export function ElevationChart({ points, height = 300 }: ElevationChartProps) {
  const isMobile = useIsMobile();
  
  // ポイントの量を減らして描画を最適化（モバイルデバイスではさらに減らす）
  const dataResolution = isMobile ? 0.05 : 0.02; // km単位、モバイルは粗く
  const filteredPoints = filterPointsByDistance(points, dataResolution);
  
  if (points.length === 0) {
    return (
      <div 
        className="flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        style={{ height }}
      >
        <p className="text-gray-500 dark:text-gray-400">GPXファイルをアップロードすると、標高グラフが表示されます</p>
      </div>
    );
  }
  
  // Y軸の範囲を計算
  const allElevations = points.map(p => p.elevation);
  const minElev = Math.floor(Math.min(...allElevations));
  const maxElev = Math.ceil(Math.max(...allElevations));
  const padding = (maxElev - minElev) * 0.1; // 10%のパディング
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-display font-semibold mb-2">標高プロファイル</h3>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={filteredPoints}
            margin={{
              top: 10,
              right: 30,
              left: 10,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="distance" 
              label={{ 
                value: 'km',
                position: 'insideBottomRight',
                offset: -5
              }}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis 
              domain={[minElev - padding, maxElev + padding]}
              label={{ 
                value: '標高 (m)', 
                angle: -90, 
                position: 'insideLeft',
                style: { 
                  textAnchor: 'middle',
                  fontSize: isMobile ? 10 : 12 
                }
              }}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="elevation" 
              stroke="#3B82F6" 
              fill="#93C5FD" 
              fillOpacity={0.8}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ポイント数を減らして描画パフォーマンスを向上させる
function filterPointsByDistance(points: ElevationPoint[], resolution: number): ElevationPoint[] {
  if (points.length === 0) return [];
  
  const filtered: ElevationPoint[] = [points[0]]; // 最初のポイントは常に含める
  let lastAddedDistance = points[0].distance;
  
  for (let i = 1; i < points.length; i++) {
    const currentDistance = points[i].distance;
    
    // 十分な距離が経過したか、最後のポイントの場合
    if (currentDistance - lastAddedDistance >= resolution || i === points.length - 1) {
      filtered.push(points[i]);
      lastAddedDistance = currentDistance;
    }
  }
  
  return filtered;
}