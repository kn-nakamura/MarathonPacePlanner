import { useState, useCallback } from 'react';

export interface PaceConverterHook {
  // Convert pace from MM:SS/km format to seconds
  paceToSeconds: (pace: string) => number;
  // Convert seconds to MM:SS/km format
  secondsToPace: (seconds: number) => string;
  // Calculate pace from a time and distance
  calculatePace: (time: string, distanceKm: number) => string;
  // Calculate time from a pace and distance
  calculateTime: (pace: string, distanceKm: number) => string;
  // Convert between km and mile paces
  kmPaceToMilePace: (kmPace: string) => string;
  milePaceToKmPace: (milePace: string) => string;
}

export function usePaceConverter(): PaceConverterHook {
  // Convert pace string (MM:SS/km) to seconds
  const paceToSeconds = useCallback((pace: string): number => {
    const [timeStr] = pace.split('/');
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  }, []);

  // Convert seconds to pace string (MM:SS/km)
  const secondsToPace = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}/km`;
  }, []);

  // Calculate pace from time and distance
  const calculatePace = useCallback((time: string, distanceKm: number): string => {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const paceSeconds = totalSeconds / distanceKm;
    return secondsToPace(paceSeconds);
  }, [secondsToPace]);

  // Calculate time from pace and distance
  const calculateTime = useCallback((pace: string, distanceKm: number): string => {
    const paceSeconds = paceToSeconds(pace);
    const totalSeconds = paceSeconds * distanceKm;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [paceToSeconds]);

  // Convert km pace to mile pace
  const kmPaceToMilePace = useCallback((kmPace: string): string => {
    const kmToMileRatio = 0.621371;
    const paceSeconds = paceToSeconds(kmPace);
    const milePaceSeconds = paceSeconds / kmToMileRatio;
    
    const minutes = Math.floor(milePaceSeconds / 60);
    const seconds = Math.round(milePaceSeconds % 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}/mile`;
  }, [paceToSeconds]);

  // Convert mile pace to km pace
  const milePaceToKmPace = useCallback((milePace: string): string => {
    const mileToKmRatio = 1.60934;
    const [timeStr] = milePace.split('/');
    const [minutes, seconds] = timeStr.split(':').map(Number);
    const paceSeconds = (minutes * 60 + seconds) * mileToKmRatio;
    
    return secondsToPace(paceSeconds);
  }, [secondsToPace]);

  return {
    paceToSeconds,
    secondsToPace,
    calculatePace,
    calculateTime,
    kmPaceToMilePace,
    milePaceToKmPace
  };
}
