import { Segment } from '@/models/pace';
import { findFastestAndSlowestSegments } from '@/utils/pace-utils';

interface PlanSummaryCardProps {
  segments: Segment[];
  targetTime: string;
  totalTime: string;
  averagePace: string;
}

export function PlanSummaryCard({ segments, targetTime, totalTime, averagePace }: PlanSummaryCardProps) {
  // Find fastest and slowest segments
  const { fastest, slowest } = findFastestAndSlowestSegments(segments);
  
  // Check if we have enough data to display
  const showStats = segments.some(s => s.customPace !== '');
  
  // Format the totalTime to highlight if it's over/under target
  const isOverTarget = totalTime > targetTime;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-2xl font-bold mb-4">Plan Summary</h2>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span className="text-muted-foreground">Target:</span>
          <span className="ml-auto font-semibold text-lg">{targetTime}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span className="text-muted-foreground">Current:</span>
          <span className={`ml-auto font-semibold text-lg ${isOverTarget ? 'text-red-500' : 'text-green-500'}`}>
            {totalTime}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span className="text-muted-foreground">Avg pace:</span>
          <span className="ml-auto font-semibold text-lg">{averagePace}</span>
        </div>
        
        {showStats && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700 my-3 pt-3"></div>
            
            <div className="flex items-center space-x-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M3 7h4"></path>
                <path d="M7 17h4"></path>
                <path d="M17 7h4"></path>
                <path d="M17 17h4"></path>
                <path d="M10 10l-3-3"></path>
                <path d="M7 7v6"></path>
                <path d="M14 14l3 3"></path>
                <path d="M17 17v-6"></path>
              </svg>
              <span className="text-green-500">Fastest:</span>
              <span className="ml-auto font-semibold text-green-500">
                {fastest?.customPace} <span className="text-xs text-muted-foreground">({fastest?.distance})</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 16v-4.5a25 25 0 0 1 13-2.5"></path>
                <path d="M6 9.5V4"></path>
                <path d="M20 16.5V10"></path>
              </svg>
              <span className="text-amber-500">Slowest:</span>
              <span className="ml-auto font-semibold text-amber-500">
                {slowest?.customPace} <span className="text-xs text-muted-foreground">({slowest?.distance})</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}