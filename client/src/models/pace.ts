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
  { id: 1, name: 'Start', distance: '5', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 2, name: 'Segment 2', distance: '10', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 3, name: 'Segment 3', distance: '15', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 4, name: 'Segment 4', distance: '20', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 5, name: 'Segment 5', distance: '25', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 6, name: 'Segment 6', distance: '30', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 7, name: 'Segment 7', distance: '35', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 8, name: 'Segment 8', distance: '40', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '25:00' },
  { id: 9, name: 'Final', distance: '42.2', targetPace: '5:00/km', customPace: '5:00/km', segmentTime: '11:00' }
];
