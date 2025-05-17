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

export interface SegmentAnalysis {
  segmentName: string;
  startDist: number;
  endDist: number;
  elevGain: number;
  elevLoss: number;
  gradient: number;
  isUphill: boolean;
}

// Race distance types
export type RaceDistance = '5K' | '10K' | 'Half' | 'Full' | 'Ultra';

// Race distances in kilometers (正確な値)
export const RACE_DISTANCES = {
  '5K': 5,
  '10K': 10,
  'Half': 21.0975, // 正確なハーフマラソン距離
  'Full': 42.195,  // 正確なフルマラソン距離
  'Ultra': 100     // Default for ultra
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
  
  // Create full segments with precise distances
  let currentDistance = segmentSize;
  
  // 各レース距離でセグメントを作成
  if (distance === '5K') {
    // 5Kは1kmごとに区分
    segments.push({ id: id++, name: '0-1km', distance: '1', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '1-2km', distance: '2', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '2-3km', distance: '3', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '3-4km', distance: '4', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '4-5km', distance: '5', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
  }
  else if (distance === '10K') {
    // 10Kは1kmごとに区分
    segments.push({ id: id++, name: '0-1km', distance: '1', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '1-2km', distance: '2', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '2-3km', distance: '3', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '3-4km', distance: '4', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '4-5km', distance: '5', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '5-6km', distance: '6', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '6-7km', distance: '7', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '7-8km', distance: '8', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '8-9km', distance: '9', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
    segments.push({ id: id++, name: '9-10km', distance: '10', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:00' });
  }
  // For half marathon use 5km segments and add a final precise segment
  else if (distance === 'Half') {
    segments.push({ id: id++, name: '0-5km', distance: '5', targetPace: defaultPace, customPace: defaultPace, segmentTime: '25:00' });
    segments.push({ id: id++, name: '5-10km', distance: '10', targetPace: defaultPace, customPace: defaultPace, segmentTime: '25:00' });
    segments.push({ id: id++, name: '10-15km', distance: '15', targetPace: defaultPace, customPace: defaultPace, segmentTime: '25:00' });
    segments.push({ id: id++, name: '15-20km', distance: '20', targetPace: defaultPace, customPace: defaultPace, segmentTime: '25:00' });
    segments.push({ id: id++, name: '20-21.0975km', distance: '21.0975', targetPace: defaultPace, customPace: defaultPace, segmentTime: '5:29' });
  }
  // For full marathon use 5km segments with all standard segments included
  else if (distance === 'Full') {
    segments.push({ id: id++, name: '0-5km', distance: '5', targetPace: defaultPace, customPace: defaultPace, segmentTime: '25:00' });
    segments.push({ id: id++, name: '5-10km', distance: '10', targetPace: defaultPace, customPace: defaultPace, segmentTime: '25:00' });
    segments.push({ id: id++, name: '10-15km', distance: '15', targetPace: defaultPace, customPace: defaultPace, segmentTime: '25:00' });
    segments.push({ id: id++, name: '15-20km', distance: '20', targetPace: defaultPace, customPace: defaultPace, segmentTime: '25:00' });
    segments.push({ id: id++, name: '20-25km', distance: '25', targetPace: defaultPace, customPace: defaultPace, segmentTime: '25:00' });
    segments.push({ id: id++, name: '25-30km', distance: '30', targetPace: defaultPace, customPace: defaultPace, segmentTime: '25:00' });
    segments.push({ id: id++, name: '30-35km', distance: '35', targetPace: defaultPace, customPace: defaultPace, segmentTime: '25:00' });
    segments.push({ id: id++, name: '35-40km', distance: '40', targetPace: defaultPace, customPace: defaultPace, segmentTime: '25:00' });
    segments.push({ id: id++, name: '40-42.195km', distance: '42.195', targetPace: defaultPace, customPace: defaultPace, segmentTime: '10:59' });
  }
  // For ultra, create 10km segments and add the remainder
  else {
    let currentDist = 0;
    
    // Create 10km segments up to 10km less than the total
    while (currentDist + 10 < totalDistance) {
      const nextDist = currentDist + 10;
      segments.push({ 
        id: id++, 
        name: `${currentDist}-${nextDist}km`, 
        distance: nextDist.toString(), 
        targetPace: defaultPace, 
        customPace: defaultPace, 
        segmentTime: '50:00' // 10km at 5:00/km
      });
      currentDist = nextDist;
    }
    
    // Add the final segment with the remaining distance
    if (currentDist < totalDistance) {
      const remaining = totalDistance - currentDist;
      segments.push({
        id: id++,
        name: `${currentDist}-${totalDistance}km`,
        distance: totalDistance.toString(),
        targetPace: defaultPace,
        customPace: defaultPace,
        segmentTime: `${Math.round(remaining * 5)}:00`
      });
    }
  }
  
  return segments;
};

// Default segments for a marathon (42.2km)
export const DEFAULT_SEGMENTS: Segment[] = generateSegments('Full');
