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
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

/**
 * Calculates the segment time based on pace and distance
 */
export function calculateSegmentTime(pace: string, distanceKm: number): string {
  const paceSeconds = paceToSeconds(pace);
  const totalSeconds = paceSeconds * distanceKm;
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculates the total time for a marathon based on segment paces
 */
export function calculateTotalTime(segments: Segment[]): string {
  let totalSeconds = 0;
  
  segments.forEach(segment => {
    // Get the time parts (MM:SS) from the segment time
    const [minutes, seconds] = segment.segmentTime.split(':').map(Number);
    totalSeconds += minutes * 60 + seconds;
  });
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);
  
  return formatTime(hours, minutes, seconds);
}

/**
 * Calculates the average pace based on total time and distance
 */
export function calculateAveragePace(totalTime: string, distanceKm: number): string {
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
