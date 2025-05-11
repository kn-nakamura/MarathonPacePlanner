import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Segment } from '@/models/pace';
import { formatTime, findFastestAndSlowestSegments, calculateCumulativeTimes } from '@/utils/pace-utils';
import { Save, Share2, Clock, Award, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface SummaryCardProps {
  segments: Segment[];
  targetTime: string;
  totalTime: string;
  averagePace: string;
  onSavePlan: () => void;
}

export function SummaryCard({ segments, targetTime, totalTime, averagePace, onSavePlan }: SummaryCardProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { fastest, slowest } = findFastestAndSlowestSegments(segments);
  
  // Determines text color for time difference
  const getTimeColor = () => {
    if (totalTime === targetTime) return "";
    
    // Parse times to seconds to compare
    const [targetHours, targetMinutes, targetSeconds] = targetTime.split(':').map(Number);
    const [totalHours, totalMinutes, totalSeconds] = totalTime.split(':').map(Number);
    
    const targetTotalSeconds = targetHours * 3600 + targetMinutes * 60 + targetSeconds;
    const actualTotalSeconds = totalHours * 3600 + totalMinutes * 60 + totalSeconds;
    
    return actualTotalSeconds < targetTotalSeconds 
      ? "text-green-500" 
      : "text-red-500";
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Marathon Pace Plan',
        text: `Check out my marathon pace plan with a target time of ${targetTime} and an average pace of ${averagePace}.`
      }).catch(error => {
        console.log('Error sharing:', error);
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      toast({
        title: "Share Feature Unavailable",
        description: "Your browser doesn't support the share functionality.",
      });
    }
  };

  return (
    <Card>
      <CardHeader className={isMobile ? "pb-3" : "pb-6"}>
        <CardTitle>Plan Summary</CardTitle>
      </CardHeader>
      <CardContent className={`space-y-3 ${isMobile ? "pb-4" : "pb-6"}`}>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Target:</span>
          </div>
          <div className="font-semibold text-right">{targetTime}</div>
          
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Current:</span>
          </div>
          <div className={`font-semibold text-right ${getTimeColor()}`}>
            {totalTime}
          </div>
          
          <div className="flex items-center space-x-2">
            <ArrowDown className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Avg pace:</span>
          </div>
          <div className="font-semibold text-right">{averagePace}</div>
        </div>
        
        <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
        
        <div className="grid grid-cols-2 gap-2">
          {fastest && (
            <>
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Fastest:</span>
              </div>
              <div className="font-semibold text-right text-green-500">
                {fastest.customPace} <span className="text-xs opacity-75">({fastest.distance})</span>
              </div>
            </>
          )}
          
          {slowest && (
            <>
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Slowest:</span>
              </div>
              <div className="font-semibold text-right text-amber-500">
                {slowest.customPace} <span className="text-xs opacity-75">({slowest.distance})</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex space-x-2 pt-0">
        <Button 
          onClick={onSavePlan} 
          className="flex-1"
          variant="default"
          size={isMobile ? "sm" : "default"}
        >
          <Save className="w-4 h-4 mr-1" /> Save Plan
        </Button>
        
        <Button 
          onClick={handleShare} 
          className="flex-1"
          variant="outline"
          size={isMobile ? "sm" : "default"}
        >
          <Share2 className="w-4 h-4 mr-1" /> Share
        </Button>
      </CardFooter>
    </Card>
  );
}
