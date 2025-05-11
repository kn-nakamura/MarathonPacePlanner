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
import { Plus, Minus, Sliders } from "lucide-react";
import { PaceWheel } from "@/components/pace-selector/pace-wheel";
import { Segment } from "@/models/pace";
import { adjustPaceBySeconds, formatPace, calculateCumulativeTimes } from "@/utils/pace-utils";

interface SegmentTableProps {
  segments: Segment[];
  onUpdateSegment: (index: number, segment: Segment) => void;
  onUpdateRemainingSegments: (startIndex: number, pace: string) => void;
}

export function SegmentTable({ segments, onUpdateSegment, onUpdateRemainingSegments }: SegmentTableProps) {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [cumulativeTimes, setCumulativeTimes] = useState<string[]>([]);
  
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
      <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-display font-semibold">Segment Editor</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Tap on each pace to adjust values
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Distance</TableHead>
              <TableHead>Pace</TableHead>
              <TableHead>Segment Time</TableHead>
              <TableHead>Cumulative Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((segment, index) => (
              <TableRow key={segment.id}>
                <TableCell className="text-muted-foreground">{segment.distance}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div 
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-center font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                      onClick={() => handleOpenPaceWheel(index)}
                      title="Click to adjust pace"
                    >
                      {segment.customPace}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{segment.segmentTime}</TableCell>
                <TableCell className="font-semibold text-primary-600 dark:text-primary-400">
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
