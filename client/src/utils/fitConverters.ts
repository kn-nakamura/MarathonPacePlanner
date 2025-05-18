// client/src/utils/fitConverters.ts

/** 位置情報 */
export interface FitPosition {
  latitude: number
  longitude: number
}

/** FIT レコードの型 */
export interface FitRecord {
  timestamp: string | Date
  position?: FitPosition
  altitude?: number
  heart_rate?: number
  speed?: number
  distance?: number
}

/** 任意の文字列を XML エスケープ */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** timestamp を必ず ISO8601 に整形 */
function formatTimestamp(ts: string | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts)
  return d.toISOString()
}

/**
 * CSV 変換
 * ヘッダーに distance を追加し、
 * 各値は nullish チェックで 0 や空文字を適切に扱う
 */
export function convertToCsv(records: FitRecord[]): string {
  const header = 'time,latitude,longitude,altitude,heart_rate,speed,distance'
  const rows = records.map(r => {
    const time = formatTimestamp(r.timestamp)
    const lat  = r.position?.latitude  != null ? r.position.latitude  : ''
    const lon  = r.position?.longitude != null ? r.position.longitude : ''
    const alt  = r.altitude            != null ? r.altitude           : ''
    const hr   = r.heart_rate          != null ? r.heart_rate         : ''
    const sp   = r.speed               != null ? r.speed              : ''
    const dist = r.distance            != null ? r.distance           : ''
    return [time, lat, lon, alt, hr, sp, dist].join(',')
  })
  return [header, ...rows].join('\n')
}

/**
 * TCX ビルダー
 * - Lap に必須タグを追加
 * - start/end から TotalTimeSeconds, DistanceMeters を計算
 * - XML エスケープを実施
 */
export function buildTcx(records: FitRecord[]): string {
  if (records.length === 0) {
    throw new Error('No records to build TCX')
  }

  const startTimeIso = formatTimestamp(records[0].timestamp)
  const startMs = new Date(records[0].timestamp).getTime()
  const endMs   = new Date(records[records.length - 1].timestamp).getTime()
  const totalTimeSeconds = (endMs - startMs) / 1000

  const startDist = records[0].distance ?? 0
  const endDist   = records[records.length - 1].distance ?? 0
  const distanceMeters = endDist - startDist

  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">')
  lines.push('  <Activities>')
  lines.push('    <Activity Sport="Running">')
  lines.push(`      <Id>${escapeXml(startTimeIso)}</Id>`)
  lines.push(`      <Lap StartTime="${escapeXml(startTimeIso)}">`)
  lines.push(`        <TotalTimeSeconds>${totalTimeSeconds.toFixed(1)}</TotalTimeSeconds>`)
  lines.push(`        <DistanceMeters>${distanceMeters.toFixed(1)}</DistanceMeters>`)
  lines.push(`        <Calories>0</Calories>`)
  lines.push(`        <Intensity>Active</Intensity>`)
  lines.push('        <Track>')

  for (const r of records) {
    const timeIso = formatTimestamp(r.timestamp)
    lines.push('          <Trackpoint>')
    lines.push(`            <Time>${escapeXml(timeIso)}</Time>`)

    if (r.position?.latitude != null && r.position.longitude != null) {
      lines.push('            <Position>')
      lines.push(`              <LatitudeDegrees>${r.position.latitude}</LatitudeDegrees>`)
      lines.push(`              <LongitudeDegrees>${r.position.longitude}</LongitudeDegrees>`)
      lines.push('            </Position>')
    }

    if (r.altitude != null) {
      lines.push(`            <AltitudeMeters>${r.altitude}</AltitudeMeters>`)
    }

    if (r.heart_rate != null) {
      lines.push('            <HeartRateBpm>')
      lines.push(`              <Value>${r.heart_rate}</Value>`)
      lines.push('            </HeartRateBpm>')
    }

    if (r.distance != null) {
      lines.push(`            <DistanceMeters>${r.distance}</DistanceMeters>`)
    }

    lines.push('          </Trackpoint>')
  }

  lines.push('        </Track>')
  lines.push('      </Lap>')
  lines.push('    </Activity>')
  lines.push('  </Activities>')
  lines.push('</TrainingCenterDatabase>')

  return lines.join('\n')
}

/**
 * GPX ビルダー
 * - GPX1.1 準拠
 * - 各 TrackPoint に必ず <time> を ISO8601 で記述
 * - XML エスケープを実施
 */
export function buildGpx(records: FitRecord[]): string {
  if (records.length === 0) {
    throw new Error('No records to build GPX')
  }

  const nowIso = new Date().toISOString()
  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<gpx version="1.1" creator="Marathon Pace Planner" xmlns="http://www.topografix.com/GPX/1/1">')
  lines.push('  <metadata>')
  lines.push(`    <time>${escapeXml(nowIso)}</time>`)
  lines.push('  </metadata>')
  lines.push('  <trk>')
  lines.push('    <name>Activity</name>')
  lines.push('    <trkseg>')

  for (const r of records) {
    if (r.position?.latitude != null && r.position.longitude != null) {
      const lat = r.position.latitude
      const lon = r.position.longitude
      lines.push(`      <trkpt lat="${lat}" lon="${lon}">`)

      if (r.altitude != null) {
        lines.push(`        <ele>${r.altitude}</ele>`)
      }

      const timeIso = formatTimestamp(r.timestamp)
      lines.push(`        <time>${escapeXml(timeIso)}</time>`)
      lines.push('      </trkpt>')
    }
  }

  lines.push('    </trkseg>')
  lines.push('  </trk>')
  lines.push('</gpx>')

  return lines.join('\n')
}