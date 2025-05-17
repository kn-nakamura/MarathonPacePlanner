// @ts-ignore
const GpxParser = require('gpxparser');

export interface ElevationPoint {
  distance: number;  // km
  elevation: number; // m
  lat: number;
  lon: number;
  cumElevGain: number; // 累積上昇距離
  cumElevLoss: number; // 累積下降距離
}

export interface ElevationSegment {
  startDistance: number;
  endDistance: number;
  elevGain: number;
  elevLoss: number;
  avgGradient: number; // 平均勾配 (%)
  isUphill: boolean;   // 上り坂かどうか
}

export interface GPXData {
  points: ElevationPoint[];
  segments: ElevationSegment[];
  totalDistance: number;
  totalElevGain: number;
  totalElevLoss: number;
  maxElevation: number;
  minElevation: number;
}

// GPXファイルを解析して標高データを抽出する
export const parseGPXFile = (gpxContent: string): GPXData => {
  const gpx = new GpxParser();
  gpx.parse(gpxContent);
  
  const track = gpx.tracks[0];
  if (!track || !track.points || track.points.length === 0) {
    throw new Error('GPXファイルにトラックデータがありません');
  }
  
  const points: ElevationPoint[] = [];
  let totalDistance = 0;
  let lastPoint = null;
  let cumElevGain = 0;
  let cumElevLoss = 0;
  let prevElevation = track.points[0].ele || 0;
  let maxElevation = prevElevation;
  let minElevation = prevElevation;
  
  // 各地点のデータを処理
  for (const point of track.points) {
    const elevation = point.ele || 0;
    
    // 最初のポイント以外で標高差を計算
    if (lastPoint) {
      const elevDiff = elevation - prevElevation;
      if (elevDiff > 0) {
        cumElevGain += elevDiff;
      } else if (elevDiff < 0) {
        cumElevLoss += Math.abs(elevDiff);
      }
      
      // 距離を計算（haversine formula）
      const lat1 = lastPoint.lat;
      const lon1 = lastPoint.lon;
      const lat2 = point.lat;
      const lon2 = point.lon;
      
      const R = 6371; // 地球の半径 (km)
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; // km単位の距離
      
      totalDistance += distance;
    }
    
    // 最大・最小標高を更新
    maxElevation = Math.max(maxElevation, elevation);
    minElevation = Math.min(minElevation, elevation);
    
    points.push({
      distance: totalDistance,
      elevation,
      lat: point.lat,
      lon: point.lon,
      cumElevGain,
      cumElevLoss
    });
    
    lastPoint = point;
    prevElevation = elevation;
  }
  
  // セグメントごとの上昇/下降距離を計算
  const segments: ElevationSegment[] = calculateSegments(points);
  
  return {
    points,
    segments,
    totalDistance,
    totalElevGain: cumElevGain,
    totalElevLoss: cumElevLoss,
    maxElevation,
    minElevation
  };
};

// レースの距離に基づいてGPXデータのポイントを正規化する（例：42.195kmに合わせる）
export const normalizeGPXToRaceDistance = (
  gpxData: GPXData, 
  targetDistance: number // kmで指定
): GPXData => {
  const originalDistance = gpxData.totalDistance;
  const ratio = targetDistance / originalDistance;
  
  // ポイントの距離を調整
  const normalizedPoints = gpxData.points.map(point => ({
    ...point,
    distance: point.distance * ratio
  }));
  
  // セグメントの距離を調整
  const normalizedSegments = calculateSegments(normalizedPoints);
  
  return {
    points: normalizedPoints,
    segments: normalizedSegments,
    totalDistance: targetDistance,
    totalElevGain: gpxData.totalElevGain,
    totalElevLoss: gpxData.totalElevLoss,
    maxElevation: gpxData.maxElevation,
    minElevation: gpxData.minElevation
  };
};

// GPXデータからレースセグメントごとの上昇・下降距離を計算
export const calculateSegments = (
  points: ElevationPoint[]
): ElevationSegment[] => {
  if (points.length === 0) return [];
  
  const segments: ElevationSegment[] = [];
  
  // 総距離と距離の区切り（セグメント）を決定
  const totalDistance = points[points.length - 1].distance;
  
  // 距離によって適切なセグメントサイズを決定
  let segmentSize = 5; // デフォルトは5km
  
  if (totalDistance <= 5) {
    segmentSize = 1; // 5km以下なら1kmごと
  } else if (totalDistance > 50) {
    segmentSize = 10; // 50km以上なら10kmごと
  }
  
  // セグメントごとに計算
  let segmentStart = 0;
  while (segmentStart < totalDistance) {
    const segmentEnd = Math.min(segmentStart + segmentSize, totalDistance);
    
    // このセグメント内のポイントを探す
    const segmentPoints = points.filter(
      p => p.distance >= segmentStart && p.distance <= segmentEnd
    );
    
    if (segmentPoints.length > 0) {
      // セグメント内の上昇・下降を計算
      let elevGain = 0;
      let elevLoss = 0;
      
      for (let i = 1; i < segmentPoints.length; i++) {
        const elevDiff = segmentPoints[i].elevation - segmentPoints[i-1].elevation;
        if (elevDiff > 0) {
          elevGain += elevDiff;
        } else {
          elevLoss += Math.abs(elevDiff);
        }
      }
      
      // セグメントの平均勾配を計算
      const startElev = segmentPoints[0].elevation;
      const endElev = segmentPoints[segmentPoints.length - 1].elevation;
      const elevDiff = endElev - startElev;
      const segmentDistanceM = (segmentEnd - segmentStart) * 1000; // mに変換
      const avgGradient = segmentDistanceM > 0 ? (elevDiff / segmentDistanceM) * 100 : 0;
      
      segments.push({
        startDistance: segmentStart,
        endDistance: segmentEnd,
        elevGain,
        elevLoss,
        avgGradient,
        isUphill: avgGradient > 0
      });
    }
    
    segmentStart = segmentEnd;
  }
  
  return segments;
};

// GPXデータを指定されたレースのセグメントに合わせて再計算する
export const alignGPXToRaceSegments = (
  gpxData: GPXData,
  raceSegments: { startDistance: number; endDistance: number; }[]
): ElevationSegment[] => {
  const alignedSegments: ElevationSegment[] = [];
  
  for (const segment of raceSegments) {
    const startDist = segment.startDistance;
    const endDist = segment.endDistance;
    
    // このセグメント範囲内のポイントを抽出
    const segmentPoints = gpxData.points.filter(
      p => p.distance >= startDist && p.distance <= endDist
    );
    
    if (segmentPoints.length > 0) {
      // セグメント内の上昇・下降を計算
      let elevGain = 0;
      let elevLoss = 0;
      
      for (let i = 1; i < segmentPoints.length; i++) {
        const elevDiff = segmentPoints[i].elevation - segmentPoints[i-1].elevation;
        if (elevDiff > 0) {
          elevGain += elevDiff;
        } else {
          elevLoss += Math.abs(elevDiff);
        }
      }
      
      // セグメントの平均勾配を計算
      const startElev = segmentPoints[0].elevation;
      const endElev = segmentPoints[segmentPoints.length - 1].elevation;
      const elevDiff = endElev - startElev;
      const segmentDistanceM = (endDist - startDist) * 1000; // mに変換
      const avgGradient = segmentDistanceM > 0 ? (elevDiff / segmentDistanceM) * 100 : 0;
      
      alignedSegments.push({
        startDistance: startDist,
        endDistance: endDist,
        elevGain,
        elevLoss,
        avgGradient,
        isUphill: avgGradient > 0
      });
    } else {
      // セグメント内にポイントがない場合は0で埋める
      alignedSegments.push({
        startDistance: startDist,
        endDistance: endDist,
        elevGain: 0,
        elevLoss: 0,
        avgGradient: 0,
        isUphill: false
      });
    }
  }
  
  return alignedSegments;
};