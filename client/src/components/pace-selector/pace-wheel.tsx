import { useState, useEffect, ChangeEvent } from 'react';
import { WheelSelector } from '../ui/wheel-selector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPace, calculateSegmentTime } from '@/utils/pace-utils';
import { useIsMobile } from '@/hooks/use-mobile';

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
  // Parse initial pace (e.g., "4:30/km") into minutes and seconds
  const [minutes, seconds] = initialPace.split('/')[0].split(':').map(Number);
  
  const [selectedMinutes, setSelectedMinutes] = useState<number>(minutes || 4);
  const [selectedSeconds, setSelectedSeconds] = useState<number>(seconds || 0);
  const [minutesInput, setMinutesInput] = useState<string>(String(minutes || 4));
  const [secondsInput, setSecondsInput] = useState<string>(String(seconds || 0).padStart(2, '0'));
  
  // Generate wheel options with 1-second increments
  const minutesOptions = Array.from({ length: 10 }, (_, i) => i + 3); // 3 to 12 minutes
  const secondsOptions = Array.from({ length: 60 }, (_, i) => i); // 0 to 59 seconds, 1-second steps
  
  // Format seconds with leading zero
  const formattedSecondsOptions = secondsOptions.map(s => s.toString().padStart(2, '0'));
  
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
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-muted-foreground">Current Pace:</span>
          <span className="text-xl font-semibold text-primary-600 dark:text-primary-400">{currentPace}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
          <span>{milePace}</span>
          <span>Segment time: {segmentTime}</span>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 space-x-0 sm:space-x-2">
          <Button
            type="button"
            onClick={handleApplyPace}
            className="flex-1"
          >
            Apply to Segment
          </Button>
          
          {onSaveAllRemaining && (
            <Button
              type="button"
              onClick={handleApplyToAll}
              variant="secondary"
              className="flex-1"
            >
              Apply to All Remaining
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
