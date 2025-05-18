// client/src/components/FitCharts.tsx

import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

/** 同期用 ID（必ず全チャートで同じものを使う） */
const SYNC_ID = 'fitChartSync'

interface FitRecord {
  timestamp: string
  distance?: number     // kilometers already
  heart_rate?: number
  altitude?: number     // meters
  speed?: number        // km/h
  cadence?: number      // spm
  power?: number        // watts
  temperature?: number  // °C
  [key: string]: any
}

interface FitChartsProps {
  fitData: { records: FitRecord[] }
}

const MAX_POINTS = 200

export default function FitCharts({ fitData }: FitChartsProps) {
  const [xAxisKey, setXAxisKey] = useState<'time'|'elapsedTime'|'distance'>('elapsedTime')

  // 1) 前処理＆間引き
  const processed = useMemo(() => {
    const recs = fitData.records
    if (!recs.length) return []

    const startMs = new Date(recs[0].timestamp).getTime()
    const mapped = recs.map(r => {
      const ts = new Date(r.timestamp)
      const timeMs = ts.getTime()
      const elapsed = (timeMs - startMs) / 1000
      return {
        timeMs,
        time: ts.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false }),
        elapsedTime: elapsed,
        distance: r.distance ?? null,
        heartRate: r.heart_rate ?? null,
        altitude:  r.altitude   ?? null,
        speed:     r.speed      ?? null,
        pace:      r.speed && r.speed > 0 ? 3600 / r.speed : null,
        cadence:   r.cadence    ?? null,
        power:     r.power      ?? null,
        temperature: r.temperature ?? null,
      }
    })

    const interval = Math.ceil(mapped.length / MAX_POINTS)
    return mapped.filter((_, i) => i % interval === 0)
  }, [fitData.records])

  // 2) X軸に必要なポイントのみ抽出
  const displayData = useMemo(() => {
    return processed.filter(pt =>
      xAxisKey === 'time'
        ? pt.timeMs != null
        : pt[xAxisKey] != null && !isNaN(pt[xAxisKey])
    )
  }, [processed, xAxisKey])

  // 3) 距離軸のキリのいい目盛りを計算
  const distanceTicks = useMemo<number[] | undefined>(() => {
    if (xAxisKey !== 'distance' || displayData.length === 0) return undefined
    const maxDist = Math.max(...displayData.map(p => p.distance ?? 0))
    const step = maxDist > 50 ? 10 : maxDist > 10 ? 5 : 1
    const last = Math.ceil(maxDist / step) * step
    const ticks: number[] = []
    for (let v = 0; v <= last; v += step) ticks.push(v)
    return ticks
  }, [displayData, xAxisKey])

  // 4) 描画するメトリック設定
  const metrics = [
    { key: 'heartRate',   name: 'Heart Rate',   stroke: '#ef4444', unit: 'bpm',   domain: ['dataMin - 5','dataMax + 5'] },
    { key: 'altitude',    name: 'Elevation',    stroke: '#3b82f6', unit: 'm',     domain: ['dataMin - 10','dataMax + 10'] },
    { key: 'speed',       name: 'Speed',        stroke: '#10b981', unit: 'km/h', domain: ['dataMin - 1','dataMax + 1'], yAxisId: 'speed' },
    { key: 'pace',        name: 'Pace',         stroke: '#f97316', unit: '/km',  domain: [720,240],                    yAxisId: 'pace' },
    { key: 'cadence',     name: 'Cadence',      stroke: '#a855f7', unit: 'spm',   domain: ['dataMin - 5','dataMax + 5'] },
    { key: 'power',       name: 'Power',        stroke: '#6b7280', unit: 'W',     domain: ['dataMin - 10','dataMax + 10'] },
    { key: 'temperature', name: 'Temperature',  stroke: '#0ea5e9', unit: '°C',    domain: ['dataMin - 2','dataMax + 2'] },
  ] as const

  const hasData = (key: string) =>
    displayData.some(pt => pt[key as keyof typeof pt] != null)

  return (
    <div className="space-y-8">
      {/* X軸切替 */}
      <div className="flex items-center gap-2 mb-4">
        <label className="font-medium">X-Axis:</label>
        <select
          value={xAxisKey}
          onChange={e => setXAxisKey(e.target.value as any)}
          className="border px-2 py-1 rounded"
        >
          <option value="time">Clock Time</option>
          <option value="elapsedTime">Elapsed Time</option>
          <option value="distance">Distance</option>
        </select>
      </div>

      {/* 各チャート */}
      {metrics.map(m =>
        hasData(m.key) ? (
          <div key={m.key}>
            <h3 className="text-base font-medium mb-2">
              {m.name} ({m.unit})
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={displayData}
                syncId={SYNC_ID}  // ← ここで同期IDを指定
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />

                <XAxis
                  dataKey={xAxisKey === 'time' ? 'timeMs' : xAxisKey}
                  type="number"
                  scale={xAxisKey === 'time' ? 'time' : 'linear'}
                  domain={['auto','auto']}
                  ticks={xAxisKey === 'distance' ? distanceTicks : undefined}
                  tickFormatter={
                    xAxisKey === 'time'
                      ? (v) => new Date(v as number)
                          .toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false })
                      : xAxisKey === 'elapsedTime'
                      ? (v) => formatElapsedHM(v as number)
                      : undefined
                  }
                />

                {!m.yAxisId ? (
                  <YAxis domain={m.domain} tickFormatter={(v) => `${v}`} />
                ) : (
                  <YAxis
                    yAxisId={m.yAxisId}
                    domain={m.domain}
                    tickFormatter={m.key === 'pace' ? formatPace : (v) => `${v}`}
                    orientation={m.yAxisId === 'pace' ? 'right' : 'left'}
                  />
                )}

                <Tooltip
                  formatter={(value) =>
                    m.key === 'pace' ? formatPace(value as number) : `${value}`
                  }
                  labelFormatter={(label) =>
                    xAxisKey === 'time'
                      ? new Date(label as number)
                          .toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false })
                      : xAxisKey === 'elapsedTime'
                      ? formatElapsedHM(label as number)
                      : `${(label as number).toFixed(2)}`
                  }
                />

                <Legend />

                <Line
                  type="monotone"
                  dataKey={m.key}
                  name={m.name}
                  stroke={m.stroke}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                  yAxisId={m.yAxisId}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null
      )}
    </div>
  )
}

/** 経過時間 (秒) → "H:MM" */
function formatElapsedHM(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

/** ペース (秒/km) → "M:SS/km" */
function formatPace(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}/km`
}