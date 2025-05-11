import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Sliders, Clock } from "lucide-react";
import { PaceWheel } from "@/components/pace-selector/pace-wheel";
import { Segment } from "@/models/pace";
import { adjustPaceBySeconds, formatPace, calculateCumulativeTimes } from "@/utils/pace-utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface SegmentTableProps {
  segments: Segment[];
  onUpdateSegment: (index: number, segment: Segment) => void;
  onUpdateRemainingSegments: (startIndex: number, pace: string) => void;
}

export function SegmentTable({ segments, onUpdateSegment, onUpdateRemainingSegments }: SegmentTableProps) {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [cumulativeTimes, setCumulativeTimes] = useState<string[]>([]);
  const isMobile = useIsMobile();
  
  // Calculate cumulative times whenever segments change
  useEffect(() => {
    setCumulativeTimes(calculateCumulativeTimes(segments));
  }, [segments]);
  
  // Handle opening the pace wheel for a segment
  const handleOpenPaceWheel = (index: number) => {
    setActiveSegmentIndex(index);
  };

  // Adjust pace up or down by 5 seconds
  const handleAdjustPace = (index: number, seconds: number) => {
    const segment = segments[index];
    const adjustedPace = adjustPaceBySeconds(segment.customPace, seconds);
    
    onUpdateSegment(index, {
      ...segment,
      customPace: adjustedPace
    });
  };

  // Save the new pace from the wheel
  const handleSavePace = (pace: string) => {
    if (activeSegmentIndex === null) return;
    
    const segment = segments[activeSegmentIndex];
    onUpdateSegment(activeSegmentIndex, {
      ...segment,
      customPace: pace
    });
  };

  // Apply the pace to all remaining segments
  const handleSaveAllRemaining = (pace: string) => {
    if (activeSegmentIndex === null) return;
    onUpdateRemainingSegments(activeSegmentIndex, pace);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className={`${isMobile ? 'p-3' : 'p-4 sm:p-5'} border-b border-gray-200 dark:border-gray-700`}>
        <h3 className="text-lg font-display font-semibold">Segment Editor</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Tap on each pace to adjust values
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <Table className={isMobile ? "text-sm" : ""}>
          <TableHeader>
            <TableRow>
              <TableHead className={isMobile ? "py-2 px-2" : ""}>Distance</TableHead>
              <TableHead className={isMobile ? "py-2 px-2" : ""}>Pace</TableHead>
              <TableHead className={isMobile ? "py-2 px-2" : ""}>Time</TableHead>
              <TableHead className={isMobile ? "py-2 px-2" : ""}>
                <div className="flex items-center" title="Cumulative Time">
                  <Clock className="w-4 h-4" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((segment, index) => (
              <TableRow key={segment.id}>
                <TableCell className={`text-muted-foreground ${isMobile ? "py-1.5 px-2" : ""}`}>
                  {segment.distance}
                </TableCell>
                <TableCell className={isMobile ? "py-1.5 px-2" : ""}>
                  <div className="flex items-center">
                    <div 
                      className={`${isMobile ? 'px-1.5 py-0.5 text-sm' : 'px-2 py-1'} bg-gray-100 dark:bg-gray-700 rounded text-center font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600`}
                      onClick={() => handleOpenPaceWheel(index)}
                      title="Click to adjust pace"
                    >
                      {segment.customPace}
                    </div>
                  </div>
                </TableCell>
                <TableCell className={isMobile ? "py-1.5 px-2" : ""}>
                  {segment.segmentTime}
                </TableCell>
                <TableCell className={`font-semibold text-primary-600 dark:text-primary-400 ${isMobile ? "py-1.5 px-2" : ""}`}>
                  {cumulativeTimes[index] || ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pace Wheel Modal */}
      {activeSegmentIndex !== null && (
        <PaceWheel
          isOpen={activeSegmentIndex !== null}
          onClose={() => setActiveSegmentIndex(null)}
          initialPace={segments[activeSegmentIndex]?.customPace || "5:00/km"}
          onSavePace={handleSavePace}
          onSaveAllRemaining={handleSaveAllRemaining}
          segmentDistance={
            activeSegmentIndex === segments.length - 1 
              ? 2.2 // Final segment is 2.2km (40-42.2km)
              : 5 // All other segments are 5km
          }
        />
      )}
    </div>
  );
}
