import { useState, useEffect } from 'react';
import { WheelSelector } from '../ui/wheel-selector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatPace, calculateSegmentTime } from '@/utils/pace-utils';

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
  // Parse initial pace (e.g., "4:30/km") into minutes and seconds
  const [minutes, seconds] = initialPace.split('/')[0].split(':').map(Number);
  
  const [selectedMinutes, setSelectedMinutes] = useState<number>(minutes || 4);
  const [selectedSeconds, setSelectedSeconds] = useState<number>(seconds || 0);
  
  // Generate wheel options
  const minutesOptions = Array.from({ length: 10 }, (_, i) => i + 3); // 3 to 12 minutes
  const secondsOptions = Array.from({ length: 12 }, (_, i) => i * 5); // 0 to 55 seconds, steps of 5
  
  // Format seconds with leading zero
  const formattedSecondsOptions = secondsOptions.map(s => s.toString().padStart(2, '0'));
  
  useEffect(() => {
    if (isOpen) {
      // Reset to initial pace when modal opens
      setSelectedMinutes(minutes || 4);
      setSelectedSeconds(seconds || 0);
    }
  }, [isOpen, minutes, seconds]);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Pace</DialogTitle>
          <DialogDescription>
            Use the wheel selector to adjust your pace for this segment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex mb-6 space-x-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium mb-1">Minutes</label>
            <WheelSelector 
              options={minutesOptions}
              value={selectedMinutes}
              onChange={(value) => setSelectedMinutes(Number(value))}
            />
          </div>
          
          <div className="w-1/2">
            <label className="block text-sm font-medium mb-1">Seconds</label>
            <WheelSelector 
              options={formattedSecondsOptions}
              value={selectedSeconds.toString().padStart(2, '0')}
              onChange={(value) => setSelectedSeconds(Number(value))}
            />
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
        
        <DialogFooter className="flex space-x-2 sm:space-x-0">
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
