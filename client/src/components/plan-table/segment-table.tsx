import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock } from "lucide-react";
import { Segment } from "@/models/pace";
import { calculateCumulativeTimes, calculateSegmentTime } from "@/utils/pace-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { PaceDropdown } from "@/components/ui/select-dropdown";
import { Slider } from "@/components/ui/slider";

interface SegmentTableProps {
  segments: Segment[];
  onUpdateSegment: (index: number, segment: Segment) => void;
  onUpdateRemainingSegments: (startIndex: number, pace: string) => void;
  splitStrategy?: {
    value: number;
    onChange: (value: number) => void;
  };
}

export function SegmentTable({ segments, onUpdateSegment, onUpdateRemainingSegments, splitStrategy }: SegmentTableProps) {
  const [cumulativeTimes, setCumulativeTimes] = useState<string[]>([]);
  const isMobile = useIsMobile();
  
  // Calculate cumulative times whenever segments change
  useEffect(() => {
    setCumulativeTimes(calculateCumulativeTimes(segments));
  }, [segments]);
  
  // Handle pace change for a segment
  const handlePaceChange = (index: number, newPace: string) => {
    const segment = segments[index];
    onUpdateSegment(index, {
      ...segment,
      customPace: newPace
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className={`${isMobile ? 'p-2 sm:p-3' : 'p-4'} border-b border-gray-200 dark:border-gray-700`}>
        <h3 className="text-lg font-display font-semibold">Segment Editor</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Adjust each segment's pace using the dropdown selectors
        </p>
        
        {splitStrategy && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Pacing Strategy</span>
              <span className="text-sm text-gray-500">
                {splitStrategy.value < 0 
                  ? `Negative Split (${Math.abs(splitStrategy.value)}%)` 
                  : splitStrategy.value > 0 
                    ? `Positive Split (${splitStrategy.value}%)` 
                    : 'Even Pace'}
              </span>
            </div>
            <Slider 
              min={-50} 
              max={50} 
              step={5}
              value={[splitStrategy.value]} 
              onValueChange={(vals) => splitStrategy.onChange(vals[0])}
              className="w-full"
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>Faster Finish</span>
              <span>Even</span>
              <span>Faster Start</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <Table className={isMobile ? "text-xs sm:text-sm" : ""}>
          <TableHeader>
            <TableRow>
              <TableHead className={isMobile ? "py-1 px-1 sm:py-2 sm:px-2" : ""}>Distance</TableHead>
              <TableHead className={isMobile ? "py-1 px-1 sm:py-2 sm:px-2" : ""}>Pace</TableHead>
              <TableHead className={isMobile ? "py-1 px-1 sm:py-2 sm:px-2" : ""}>Time</TableHead>
              <TableHead className={isMobile ? "py-1 px-1 sm:py-2 sm:px-2" : ""}>
                <div className="flex items-center" title="Cumulative Time">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((segment, index) => (
              <TableRow key={segment.id}>
                <TableCell className={`text-muted-foreground ${isMobile ? "py-1 px-1 sm:py-1.5 sm:px-2" : ""}`}>
                  {segment.distance}
                </TableCell>
                <TableCell className={isMobile ? "py-1 px-1 sm:py-1.5 sm:px-2" : ""}>
                  <PaceDropdown 
                    pace={segment.customPace} 
                    onPaceChange={(newPace) => handlePaceChange(index, newPace)} 
                  />
                </TableCell>
                <TableCell className={isMobile ? "py-1 px-1 sm:py-1.5 sm:px-2" : ""}>
                  {/* 区間タイム - segmentTimeをそのまま表示 */}
                  {segment.segmentTime}
                </TableCell>
                <TableCell className={`font-semibold text-primary-600 dark:text-primary-400 ${isMobile ? "py-1 px-1 sm:py-1.5 sm:px-2" : ""}`}>
                  {cumulativeTimes[index] || ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}