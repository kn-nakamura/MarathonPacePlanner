import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Segment } from '@/models/pace';
import { formatTime, findFastestAndSlowestSegments } from '@/utils/pace-utils';
import { Save, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SummaryCardProps {
  segments: Segment[];
  targetTime: string;
  totalTime: string;
  averagePace: string;
  onSavePlan: () => void;
}

export function SummaryCard({ segments, targetTime, totalTime, averagePace, onSavePlan }: SummaryCardProps) {
  const { toast } = useToast();
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
      <CardHeader>
        <CardTitle>Plan Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Target time:</span>
          <span className="font-semibold">{targetTime}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Current time:</span>
          <span className={`font-semibold ${getTimeColor()}`}>{totalTime}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Average pace:</span>
          <span className="font-semibold">{averagePace}</span>
        </div>
        
        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
        
        {fastest && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Fastest segment:</span>
            <span className="font-semibold text-primary-500">{fastest.customPace} ({fastest.distance})</span>
          </div>
        )}
        
        {slowest && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Slowest segment:</span>
            <span className="font-semibold">{slowest.customPace} ({slowest.distance})</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex space-x-3">
        <Button 
          onClick={onSavePlan} 
          className="flex-1"
          variant="default"
        >
          <Save className="w-4 h-4 mr-2" /> Save Plan
        </Button>
        
        <Button 
          onClick={handleShare} 
          className="flex-1"
          variant="outline"
        >
          <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
      </CardFooter>
    </Card>
  );
}
