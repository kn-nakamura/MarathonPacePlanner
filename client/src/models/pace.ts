export interface Segment {
  id: number;
  name: string;
  distance: string;
  targetPace: string;
  customPace: string;
  segmentTime: string;
}

export interface PacePlan {
  id?: number;
  name: string;
  targetTime: string;
  segments: Segment[];
  totalTime: string;
  createdAt?: Date;
}

// Race distance types
export type RaceDistance = '5K' | '10K' | 'Half' | 'Full' | 'Ultra';

// Race distances in kilometers
export const RACE_DISTANCES = {
  '5K': 5,
  '10K': 10,
  'Half': 21.1,
  'Full': 42.195,
  'Ultra': 100 // Default for ultra
};

// Default segments for different race distances
export const generateSegments = (distance: RaceDistance, customUltraDistance?: number): Segment[] => {
  const segments: Segment[] = [];
  const defaultPace = '5:00/km';
  let totalDistance = RACE_DISTANCES[distance];
  
  // For ultra marathon with custom distance
  if (distance === 'Ultra' && customUltraDistance && customUltraDistance > 0) {
    totalDistance = customUltraDistance;
  }
  
  // Different segment sizes based on race type
  let segmentSize = 5; // Default for marathon and half
  let id = 1;
  
  if (distance === '5K' || distance === '10K') {
    segmentSize = 1; // 1km segments for shorter races
  } else if (distance === 'Ultra') {
    segmentSize = 10; // 10km segments for ultra
  }
  
  // Create full segments
  let currentDistance = segmentSize;
  while (currentDistance < totalDistance) {
    segments.push({ 
      id: id++, 
      name: `Segment ${id-1}`, 
      distance: currentDistance.toString(), 
      targetPace: defaultPace, 
      customPace: defaultPace, 
      segmentTime: `${segmentSize * 5}:00` // Default 5:00/km pace for the segment size
    });
    currentDistance += segmentSize;
  }
  
  // Add final segment if needed
  const remainingDistance = totalDistance - (currentDistance - segmentSize);
  if (remainingDistance > 0) {
    segments.push({
      id: id++,
      name: 'Final',
      distance: totalDistance.toString(),
      targetPace: defaultPace,
      customPace: defaultPace,
      segmentTime: `${Math.round(remainingDistance * 5)}:00`
    });
  }
  
  return segments;
};

// Default segments for a marathon (42.2km)
export const DEFAULT_SEGMENTS: Segment[] = generateSegments('Full');
