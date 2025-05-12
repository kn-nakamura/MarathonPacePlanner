import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatPace, calculateSegmentTime, paceToSeconds, secondsToPace } from '@/utils/pace-utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface PaceWheelProps {
  isOpen: boolean;
  onClose: () => void;
  initialPace: string;
  onSavePace: (pace: string) => void;
  onSaveAllRemaining?: (pace: string) => void;
  segmentDistance: number;
}

export function PaceWheel({ 
  isOpen, 
  onClose, 
  initialPace,
  onSavePace,
  onSaveAllRemaining,
  segmentDistance = 5
}: PaceWheelProps) {
  const isMobile = useIsMobile();
  const wheelRef = useRef<HTMLDivElement>(null);
  
  // Parse initial pace
  const parsedPace = initialPace.replace('/km', '');
  const [minutes, seconds] = parsedPace.split(':').map(Number);
  
  // State for current pace
  const [currentMinutes, setCurrentMinutes] = useState(minutes);
  const [currentSeconds, setCurrentSeconds] = useState(seconds);
  
  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      const parsedPace = initialPace.replace('/km', '');
      const [minutes, seconds] = parsedPace.split(':').map(Number);
      setCurrentMinutes(minutes);
      setCurrentSeconds(seconds);
    }
  }, [isOpen, initialPace]);
  
  // Handle minute changes
  const incrementMinute = () => {
    setCurrentMinutes(prev => Math.min(9, prev + 1));
  };
  
  const decrementMinute = () => {
    setCurrentMinutes(prev => Math.max(3, prev - 1));
  };
  
  // Handle second changes
  const incrementSecond = () => {
    if (currentSeconds === 59) {
      setCurrentSeconds(0);
      incrementMinute();
    } else {
      setCurrentSeconds(prev => prev + 1);
    }
  };
  
  const decrementSecond = () => {
    if (currentSeconds === 0) {
      setCurrentSeconds(59);
      decrementMinute();
    } else {
      setCurrentSeconds(prev => prev - 1);
    }
  };
  
  // Format the current pace
  const currentPace = `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')}/km`;
  
  // Calculate equivalent mile pace
  const totalSeconds = currentMinutes * 60 + currentSeconds;
  const kmToMileRatio = 0.621371;
  const mileSeconds = totalSeconds / kmToMileRatio;
  const mileMinutes = Math.floor(mileSeconds / 60);
  const mileRemainder = Math.round(mileSeconds % 60);
  const milePace = `${mileMinutes}:${mileRemainder.toString().padStart(2, '0')}/mile`;
  
  // Calculate segment time
  const segmentTime = calculateSegmentTime(currentPace, segmentDistance);
  
  // Handle apply buttons
  function handleApplyPace() {
    onSavePace(currentPace);
    onClose();
  }
  
  function handleApplyToAll() {
    if (onSaveAllRemaining) {
      onSaveAllRemaining(currentPace);
    }
    onClose();
  }

  // Create wheel options
  const generateOptions = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };
  
  const minuteOptions = generateOptions(3, 9); // 3-9分
  const secondOptions = generateOptions(0, 59); // 0-59秒
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={isMobile ? "max-w-[95%] p-4" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>調整ペース</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            ペースを調整して区間タイムを計算
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 my-6">
          {/* Minutes Wheel */}
          <div className="space-y-2">
            <div className="text-center text-sm font-medium text-muted-foreground">分</div>
            <div className="relative mx-auto w-24">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={decrementMinute} 
                className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10 rounded-full"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center justify-center h-12 border border-gray-300 dark:border-gray-600 rounded-md">
                <span className="text-2xl font-bold">{currentMinutes}</span>
              </div>
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={incrementMinute} 
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10 rounded-full"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Seconds Wheel */}
          <div className="space-y-2">
            <div className="text-center text-sm font-medium text-muted-foreground">秒</div>
            <div className="relative mx-auto w-24">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={decrementSecond} 
                className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10 rounded-full"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center justify-center h-12 border border-gray-300 dark:border-gray-600 rounded-md">
                <span className="text-2xl font-bold">{currentSeconds.toString().padStart(2, '0')}</span>
              </div>
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={incrementSecond} 
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10 rounded-full"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 rounded-md mb-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">現在のペース:</p>
              <p className="text-lg sm:text-xl font-semibold text-primary-600 dark:text-primary-400">{currentPace}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{milePace}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">区間タイム:</p>
              <p className="text-lg sm:text-xl font-semibold">{segmentTime}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">For {segmentDistance}km</p>
            </div>
          </div>
        </div>
        
        <DialogFooter className={`${isMobile ? 'flex-col space-y-2' : 'sm:flex-row sm:space-y-0 sm:space-x-2'}`}>
          <Button
            type="button"
            onClick={handleApplyPace}
            className={isMobile ? "w-full" : "flex-1"}
            size={isMobile ? "sm" : "default"}
          >
            このセグメントに適用
          </Button>
          
          {onSaveAllRemaining && (
            <Button
              type="button"
              onClick={handleApplyToAll}
              variant="secondary"
              className={isMobile ? "w-full" : "flex-1"}
              size={isMobile ? "sm" : "default"}
            >
              残り全てに適用
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}