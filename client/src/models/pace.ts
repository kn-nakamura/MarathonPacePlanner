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

// Default segments for a marathon (42.2km)
export const DEFAULT_SEGMENTS: Segment[] = [
  { id: 1, name: 'Start', distance: '0-5km', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 2, name: 'Segment 2', distance: '5-10km', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 3, name: 'Segment 3', distance: '10-15km', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 4, name: 'Segment 4', distance: '15-20km', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 5, name: 'Segment 5', distance: '20-25km', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 6, name: 'Segment 6', distance: '25-30km', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 7, name: 'Segment 7', distance: '30-35km', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 8, name: 'Segment 8', distance: '35-40km', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 9, name: 'Final', distance: '40-42.2km', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '11:00' }
];
