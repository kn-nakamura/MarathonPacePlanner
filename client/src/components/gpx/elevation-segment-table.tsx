import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { ElevationSegment } from '@/utils/gpx-utils';
import { Segment } from '@/models/pace';

interface ElevationSegmentTableProps {
  elevationSegments: ElevationSegment[];
  paceSegments: Segment[];
}

export function ElevationSegmentTable({ elevationSegments, paceSegments }: ElevationSegmentTableProps) {
  // ペースセグメントとElevationSegmentを統合する
  const mergedSegments = useMemo(() => {
    return paceSegments.map((paceSegment, index) => {
      const elevSegment = elevationSegments.find(
        (es) => {
          // セグメント名から距離範囲を抽出 (例: "0-5km" から [0, 5])
          const nameParts = paceSegment.name.replace('km', '').split('-');
          if (nameParts.length !== 2) return false;
          
          const startDist = parseFloat(nameParts[0]);
          const endDist = parseFloat(nameParts[1]);
          
          // 距離範囲が一致するかチェック
          return (
            Math.abs(es.startDistance - startDist) < 0.1 && 
            Math.abs(es.endDistance - endDist) < 0.1
          );
        }
      );
      
      return {
        ...paceSegment,
        elevGain: elevSegment?.elevGain || 0,
        elevLoss: elevSegment?.elevLoss || 0,
        avgGradient: elevSegment?.avgGradient || 0,
        isUphill: elevSegment?.isUphill || false
      };
    });
  }, [elevationSegments, paceSegments]);
  
  if (mergedSegments.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-center text-gray-500 dark:text-gray-400">
          GPXファイルをアップロードすると、標高データが表示されます
        </p>
      </div>
    );
  }
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-display font-semibold mb-2">標高データ</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">セグメント</TableHead>
              <TableHead className="text-center">上り/下り</TableHead>
              <TableHead className="text-right">上昇 (m)</TableHead>
              <TableHead className="text-right">下降 (m)</TableHead>
              <TableHead className="text-right">勾配 (%)</TableHead>
              <TableHead className="text-right">推奨ペース調整</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mergedSegments.map((segment, i) => (
              <TableRow key={segment.id}>
                <TableCell className="font-medium">{segment.name}</TableCell>
                <TableCell className="text-center">
                  {segment.isUphill ? (
                    <ArrowUp className="inline-block text-red-500" size={18} />
                  ) : segment.avgGradient < -0.5 ? (
                    <ArrowDown className="inline-block text-green-500" size={18} />
                  ) : (
                    <Minus className="inline-block text-gray-400" size={18} />
                  )}
                </TableCell>
                <TableCell className="text-right">{segment.elevGain.toFixed(0)}</TableCell>
                <TableCell className="text-right">{segment.elevLoss.toFixed(0)}</TableCell>
                <TableCell className="text-right">
                  {segment.avgGradient.toFixed(1)}
                </TableCell>
                <TableCell className="text-right">
                  {calculatePaceAdjustment(segment.avgGradient, segment.elevGain)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// 勾配と上昇高度に基づいて推奨ペース調整を計算
function calculatePaceAdjustment(gradient: number, elevGain: number): string {
  if (gradient > 4 || (gradient > 2 && elevGain > 100)) {
    return "+30〜40秒/km";
  } else if (gradient > 2 || (gradient > 1 && elevGain > 80)) {
    return "+15〜25秒/km";
  } else if (gradient > 0.5 || (gradient > 0 && elevGain > 50)) {
    return "+5〜15秒/km";
  } else if (gradient < -4 || (gradient < -2 && elevGain > 100)) {
    return "-10〜20秒/km";
  } else if (gradient < -2) {
    return "-5〜10秒/km";
  } else {
    return "±0秒/km";
  }
}