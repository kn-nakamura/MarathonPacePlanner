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
  
  // Item height for wheel selector
  const itemHeight = isMobile ? 36 : 44;
  
  // Reset to initial pace when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaceSeconds(initialPaceSeconds);
      setCurrentOffset(0);
      
      // Center the wheel on the initial pace
      setTimeout(() => {
        if (wheelRef.current) {
          const centerIndex = paceOptions.indexOf(initialPaceSeconds);
          if (centerIndex !== -1) {
            const targetScroll = centerIndex * itemHeight;
            wheelRef.current.scrollTop = targetScroll;
          }
        }
      }, 100);
    }
  }, [isOpen, initialPaceSeconds, paceOptions, itemHeight]);

  // Handle mouse/touch wheel interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartY(e.clientY);
    if (wheelRef.current) {
      setCurrentOffset(wheelRef.current.scrollTop);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    if (wheelRef.current) {
      setCurrentOffset(wheelRef.current.scrollTop);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const deltaY = startY - e.clientY;
    updateScroll(deltaY);
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const deltaY = startY - e.touches[0].clientY;
    updateScroll(deltaY);
    e.preventDefault();
  };

  const updateScroll = (deltaY: number) => {
    if (wheelRef.current) {
      wheelRef.current.scrollTop = currentOffset + deltaY;
      updateSelectedPace();
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    snapToOption();
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    snapToOption();
  };

  const updateSelectedPace = () => {
    if (!wheelRef.current) return;
    
    const scrollPosition = wheelRef.current.scrollTop;
    const index = Math.round(scrollPosition / itemHeight);
    
    if (index >= 0 && index < paceOptions.length) {
      setPaceSeconds(paceOptions[index]);
    }
  };

  const snapToOption = () => {
    if (!wheelRef.current) return;
    
    const scrollPosition = wheelRef.current.scrollTop;
    const index = Math.round(scrollPosition / itemHeight);
    
    if (index >= 0 && index < paceOptions.length) {
      // Smooth scroll to exact position
      wheelRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      });
      
      // Update the selected pace
      setPaceSeconds(paceOptions[index]);
    }
  };

  // Handle direct option click
  const handleOptionClick = (seconds: number) => {
    setPaceSeconds(seconds);
    if (wheelRef.current) {
      const index = paceOptions.indexOf(seconds);
      if (index !== -1) {
        wheelRef.current.scrollTo({
          top: index * itemHeight,
          behavior: 'smooth'
        });
      }
    }
  };
  
  // Handle increment/decrement buttons
  const incrementPace = () => {
    const currentIndex = paceOptions.indexOf(paceSeconds);
    if (currentIndex > 0) {
      // Move to previous option (faster pace)
      handleOptionClick(paceOptions[currentIndex - 1]);
    }
  };
  
  const decrementPace = () => {
    const currentIndex = paceOptions.indexOf(paceSeconds);
    if (currentIndex < paceOptions.length - 1) {
      // Move to next option (slower pace)
      handleOptionClick(paceOptions[currentIndex + 1]);
    }
  };

  // Format the current pace
  const currentPace = secondsToPace(paceSeconds);
  
  // Calculate equivalent mile pace
  const kmToMileRatio = 0.621371;
  const mileSeconds = paceSeconds / kmToMileRatio;
  const milePace = secondsToPace(mileSeconds).replace('/km', '/mile');

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
          <DialogTitle>調整ペース</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            上下にスワイプして1秒単位でペースを調整
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mx-auto max-w-[200px] my-4">
          {/* Up button */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={incrementPace} 
            className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10 rounded-full"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          
          {/* Pace Wheel */}
          <div className="relative h-40 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
            <div 
              ref={wheelRef}
              className={cn(
                "wheel-selector scroll-smooth", 
                "h-full overflow-y-auto scrollbar-none snap-y snap-mandatory",
                isDragging ? "cursor-grabbing" : "cursor-grab"
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ overscrollBehavior: 'contain' }}
            >
              {/* Top spacer */}
              <div style={{ height: itemHeight * 2 }} />
              
              {/* Pace options */}
              {paceOptions.map((seconds, index) => (
                <div 
                  key={index}
                  style={{ height: itemHeight }}
                  className={cn(
                    "snap-center flex items-center justify-center font-medium",
                    isMobile ? "text-sm" : "text-base",
                    seconds === paceSeconds
                      ? "text-primary-600 dark:text-primary-400" 
                      : "text-gray-500 dark:text-gray-400"
                  )}
                  onClick={() => handleOptionClick(seconds)}
                >
                  {secondsToPace(seconds)}
                </div>
              ))}
              
              {/* Bottom spacer */}
              <div style={{ height: itemHeight * 2 }} />
            </div>
            
            {/* Selection indicator */}
            <div 
              className="absolute left-0 right-0 top-1/2 pointer-events-none border-t border-b border-primary-200 dark:border-primary-700"
              style={{ 
                marginTop: -(itemHeight/2), 
                height: itemHeight 
              }}
            />
          </div>
          
          {/* Down button */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={decrementPace} 
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10 rounded-full"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
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