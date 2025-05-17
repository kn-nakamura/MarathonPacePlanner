import { Segment } from "@/models/pace";

/**
 * Converts a pace string (MM:SS/km) to seconds
 */
export function paceToSeconds(pace: string): number {
  const [timeStr] = pace.split('/');
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return minutes * 60 + seconds;
}

/**
 * Converts seconds to pace string (MM:SS/km)
 */
export function secondsToPace(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}/km`;
}

/**
 * Adjusts a pace by a specified number of seconds
 */
export function adjustPaceBySeconds(pace: string, secondsAdjustment: number): string {
  const paceInSeconds = paceToSeconds(pace);
  const newPaceInSeconds = Math.max(paceInSeconds + secondsAdjustment, 1);
  return secondsToPace(newPaceInSeconds);
}

/**
 * Formats a time string as HH:MM:SS
 */
export function formatTime(hours: number, minutes: number, seconds: number): string {
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formats a pace as MM:SS/km
 */
export function formatPace(minutes: number, seconds: number): string {
  // Format properly when seconds >= 60
  if (seconds >= 60) {
    const additionalMinutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes + additionalMinutes}:${remainingSeconds.toString().padStart(2, '0')}/km`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

/**
 * Calculates the segment time based on pace and distance
 * MM:SS or HH:MM:SS形式で区間時間を返す
 */
export function calculateSegmentTime(pace: string, distanceKm: number): string {
  // ペースを秒数に変換
  const paceSeconds = paceToSeconds(pace);
  // 距離をかけて総秒数を計算
  const totalSeconds = paceSeconds * distanceKm;
  
  // 時間、分、秒に変換
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);
  
  // 時間がある場合はHH:MM:SS形式、ない場合はMM:SS形式
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculates the total time for a marathon based on segment paces
 * 各セグメント間の区間時間を正確に計算して合計する
 */
export function calculateTotalTime(segments: Segment[]): string {
  let totalSeconds = 0;
  
  segments.forEach((segment, index) => {
    // セグメント間の距離を計算
    let segmentDistance = 0;
    const currentKm = parseFloat(segment.distance.split(' ')[0]);
    
    if (index === 0) {
      // 最初のセグメントは距離そのもの
      segmentDistance = currentKm;
    } else {
      // 2つ目以降は前のセグメントとの差分
      const prevKm = parseFloat(segments[index-1].distance.split(' ')[0]);
      segmentDistance = currentKm - prevKm;
    }
    
    // ペースを秒に変換
    const paceStr = segment.customPace.replace('/km', '');
    const [min, sec] = paceStr.split(':').map(Number);
    const paceSeconds = (min * 60) + sec;
    
    // 区間時間を計算して累積に加算
    totalSeconds += paceSeconds * segmentDistance;
  });
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);
  
  return formatTime(hours, minutes, seconds);
}

/**
 * Calculates the cumulative time at each segment
 * Returns an array of cumulative times in HH:MM:SS format
 */
export function calculateCumulativeTimes(segments: Segment[]): string[] {
  let cumulativeSeconds = 0;
  const cumulativeTimes: string[] = [];
  
  segments.forEach((segment, index) => {
    // セグメント間の距離を計算
    let segmentDistance = 0;
    const currentKm = parseFloat(segment.distance.split(' ')[0]);
    
    if (index === 0) {
      // 最初のセグメントは距離そのもの
      segmentDistance = currentKm;
    } else {
      // 2つ目以降は前のセグメントとの差分
      const prevKm = parseFloat(segments[index-1].distance.split(' ')[0]);
      segmentDistance = currentKm - prevKm;
    }
    
    // ペースを秒に変換
    const paceStr = segment.customPace.replace('/km', '');
    const [paceMin, paceSec] = paceStr.split(':').map(Number);
    const paceInSeconds = (paceMin * 60) + paceSec;
    
    // 区間時間を計算して累積に加算
    const segmentSeconds = paceInSeconds * segmentDistance;
    cumulativeSeconds += segmentSeconds;
    
    // フォーマットして結果に追加
    const hours = Math.floor(cumulativeSeconds / 3600);
    const mins = Math.floor((cumulativeSeconds % 3600) / 60);
    const secs = Math.round(cumulativeSeconds % 60);
    
    cumulativeTimes.push(formatTime(hours, mins, secs));
  });
  
  return cumulativeTimes;
}

/**
 * Calculates the average pace based on total time and distance
 * Uses the exact marathon distance of 42.195 km if no distance is specified
 */
export function calculateAveragePace(totalTime: string, distanceKm: number = 42.195): string {
  const [hours, minutes, seconds] = totalTime.split(':').map(Number);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const paceSeconds = totalSeconds / distanceKm;
  
  const paceMinutes = Math.floor(paceSeconds / 60);
  const paceRemainingSeconds = Math.round(paceSeconds % 60);
  
  return formatPace(paceMinutes, paceRemainingSeconds);
}

/**
 * Finds the fastest and slowest segments in a plan
 */
export function findFastestAndSlowestSegments(segments: Segment[]): { 
  fastest: Segment | null, 
  slowest: Segment | null 
} {
  if (!segments.length) {
    return { fastest: null, slowest: null };
  }
  
  let fastest = segments[0];
  let slowest = segments[0];
  
  segments.forEach(segment => {
    const currentPaceSeconds = paceToSeconds(segment.customPace);
    const fastestPaceSeconds = paceToSeconds(fastest.customPace);
    const slowestPaceSeconds = paceToSeconds(slowest.customPace);
    
    if (currentPaceSeconds < fastestPaceSeconds) {
      fastest = segment;
    }
    
    if (currentPaceSeconds > slowestPaceSeconds) {
      slowest = segment;
    }
  });
  
  return { fastest, slowest };
}
