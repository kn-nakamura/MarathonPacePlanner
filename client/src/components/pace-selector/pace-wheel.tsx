import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatPace, calculateSegmentTime, paceToSeconds, secondsToPace } from '@/utils/pace-utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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
  
  // Convert pace to seconds (for easier manipulation)
  const initialPaceSeconds = paceToSeconds(initialPace);
  
  // State to track the current pace in seconds
  const [paceSeconds, setPaceSeconds] = useState<number>(initialPaceSeconds);
  
  // State for handling wheel interactions
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  
  // Generate pace options (+/- 2 minutes from initial pace)
  const minPaceSeconds = Math.max(180, initialPaceSeconds - 120); // No less than 3:00/km
  const maxPaceSeconds = initialPaceSeconds + 120; // 2 minutes slower
  
  // Generate an array of pace options in seconds
  const paceOptions = Array.from(
    { length: maxPaceSeconds - minPaceSeconds + 1 }, 
    (_, i) => minPaceSeconds + i
  );
  
  useEffect(() => {
    if (isOpen) {
      // Reset to initial pace when modal opens
      setSelectedMinutes(minutes || 4);
      setSelectedSeconds(seconds || 0);
      setMinutesInput(String(minutes || 4));
      setSecondsInput(String(seconds || 0).padStart(2, '0'));
    }
  }, [isOpen, minutes, seconds]);

  // Handle manual input for minutes
  const handleMinutesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow numeric input
    if (!/^\d*$/.test(value)) return;
    
    setMinutesInput(value);
    
    // Update the selected minutes if valid
    if (value && Number(value) >= 0) {
      setSelectedMinutes(Number(value));
    }
  };
  
  // Handle manual input for seconds
  const handleSecondsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow numeric input
    if (!/^\d*$/.test(value)) return;
    
    setSecondsInput(value);
    
    // Update the selected seconds if valid (0-59)
    if (value && Number(value) >= 0 && Number(value) <= 59) {
      setSelectedSeconds(Number(value));
    }
  };

  // Sync the wheel selector with the input field
  const handleWheelMinutesChange = (value: string | number) => {
    const numValue = Number(value);
    setSelectedMinutes(numValue);
    setMinutesInput(String(numValue));
  };
  
  const handleWheelSecondsChange = (value: string | number) => {
    const numValue = Number(value);
    setSelectedSeconds(numValue);
    setSecondsInput(String(numValue).padStart(2, '0'));
  };

  // Calculate pace in format MM:SS/km
  const currentPace = `${selectedMinutes}:${selectedSeconds.toString().padStart(2, '0')}/km`;
  
  // Calculate equivalent mile pace
  const kmToMileRatio = 0.621371;
  const totalSeconds = (selectedMinutes * 60 + selectedSeconds) / kmToMileRatio;
  const milePaceMinutes = Math.floor(totalSeconds / 60);
  const milePaceSeconds = Math.floor(totalSeconds % 60);
  const milePace = `${milePaceMinutes}:${milePaceSeconds.toString().padStart(2, '0')}/mile`;

  // Calculate the segment time based on the pace
  const segmentTime = calculateSegmentTime(currentPace, segmentDistance);
  
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={isMobile ? "max-w-[95%] p-4" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>Adjust Pace</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Fine-tune your pace with 1-second precision.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex mb-4 sm:mb-6 space-x-2 sm:space-x-4">
          <div className="w-1/2">
            <label className="block text-xs sm:text-sm font-medium mb-1">Minutes</label>
            <div className="space-y-2">
              <WheelSelector 
                options={minutesOptions}
                value={selectedMinutes}
                onChange={handleWheelMinutesChange}
                itemHeight={isMobile ? 28 : 36}
                height={isMobile ? 140 : 180}
              />
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={minutesInput}
                onChange={handleMinutesChange}
                className="text-center h-8 sm:h-10 text-sm sm:text-base"
                placeholder="Min"
                aria-label="Minutes"
              />
            </div>
          </div>
          
          <div className="w-1/2">
            <label className="block text-xs sm:text-sm font-medium mb-1">Seconds</label>
            <div className="space-y-2">
              <WheelSelector 
                options={formattedSecondsOptions}
                value={selectedSeconds.toString().padStart(2, '0')}
                onChange={handleWheelSecondsChange}
                itemHeight={isMobile ? 28 : 36}
                height={isMobile ? 140 : 180}
              />
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={secondsInput}
                onChange={handleSecondsChange}
                className="text-center h-8 sm:h-10 text-sm sm:text-base"
                placeholder="Sec"
                aria-label="Seconds"
                maxLength={2}
              />
            </div>
          </div>
        </div>
        
        <div className="p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 rounded-md mb-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Current Pace:</p>
              <p className="text-lg sm:text-xl font-semibold text-primary-600 dark:text-primary-400">{currentPace}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{milePace}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Segment Time:</p>
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
            Apply to Segment
          </Button>
          
          {onSaveAllRemaining && (
            <Button
              type="button"
              onClick={handleApplyToAll}
              variant="secondary"
              className={isMobile ? "w-full" : "flex-1"}
              size={isMobile ? "sm" : "default"}
            >
              Apply to All Remaining
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
