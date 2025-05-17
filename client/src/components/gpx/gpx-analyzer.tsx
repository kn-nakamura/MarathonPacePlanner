import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GPXUploader } from './gpx-uploader';
import { ElevationMap } from './elevation-map';
import { ElevationChart } from './elevation-chart';
import { ElevationSegmentTable } from './elevation-segment-table';
import { parseGPXFile, normalizeGPXToRaceDistance, alignGPXToRaceSegments, GPXData } from '@/utils/gpx-utils';
import { Segment, RACE_DISTANCES, RaceDistance } from '@/models/pace';
import { useToast } from '@/hooks/use-toast';
import { adjustPaceBySeconds, paceToSeconds, secondsToPace } from '@/utils/pace-utils';

interface GPXAnalyzerProps {
  segments: Segment[];
  raceDistance: RaceDistance;
  ultraDistance?: number;
  onUpdateSegments: (updatedSegments: Segment[]) => void;
}

export function GPXAnalyzer({
  segments,
  raceDistance,
  ultraDistance,
  onUpdateSegments
}: GPXAnalyzerProps) {
  const [gpxData, setGpxData] = useState<GPXData | null>(null);
  const [normalizedGpxData, setNormalizedGpxData] = useState<GPXData | null>(null);
  const { toast } = useToast();
  
  // GPXファイルがアップロードされたときの処理
  const handleGpxFileUploaded = (gpxContent: string) => {
    try {
      // GPXファイルを解析
      const parsedData = parseGPXFile(gpxContent);
      setGpxData(parsedData);
      
      // レース距離に合わせてGPXデータを正規化
      const targetDistance = raceDistance === 'Ultra' && ultraDistance
        ? ultraDistance
        : RACE_DISTANCES[raceDistance];
      
      const normalized = normalizeGPXToRaceDistance(parsedData, targetDistance);
      setNormalizedGpxData(normalized);
      
      toast({
        title: "GPXファイルを読み込みました",
        description: `総距離: ${parsedData.totalDistance.toFixed(2)}km / 上昇: ${parsedData.totalElevGain.toFixed(0)}m / 下降: ${parsedData.totalElevLoss.toFixed(0)}m`,
      });
    } catch (error) {
      console.error("GPXファイルの解析に失敗しました:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "GPXファイルの解析に失敗しました。正しいフォーマットか確認してください。",
      });
    }
  };
  
  // 標高データに基づいてペースプランを自動調整
  const handleApplyElevationBasedPaces = () => {
    if (!normalizedGpxData) return;
    
    // セグメントと標高データを照合
    const raceSegments = segments.map((segment) => {
      // セグメント名から距離範囲を抽出 (例: "0-5km" から [0, 5])
      const nameParts = segment.name.replace('km', '').split('-');
      if (nameParts.length !== 2) return segment;
      
      const startDist = parseFloat(nameParts[0]);
      const endDist = parseFloat(nameParts[1]);
      
      // 標高データからこのセグメントに該当する部分を抽出
      const segmentPoints = normalizedGpxData.points.filter(
        (p) => p.distance >= startDist && p.distance <= endDist
      );
      
      if (segmentPoints.length < 2) return segment;
      
      // セグメント内の上昇・下降を計算
      let elevGain = 0;
      let elevLoss = 0;
      
      for (let i = 1; i < segmentPoints.length; i++) {
        const elevDiff = segmentPoints[i].elevation - segmentPoints[i-1].elevation;
        if (elevDiff > 0) {
          elevGain += elevDiff;
        } else {
          elevLoss += Math.abs(elevDiff);
        }
      }
      
      // 平均勾配を計算
      const startElev = segmentPoints[0].elevation;
      const endElev = segmentPoints[segmentPoints.length - 1].elevation;
      const elevDiff = endElev - startElev;
      const segmentDistanceM = (endDist - startDist) * 1000; // mに変換
      const avgGradient = segmentDistanceM > 0 ? (elevDiff / segmentDistanceM) * 100 : 0;
      
      // ペース調整量を計算（秒単位）
      const paceAdjustment = calculatePaceAdjustmentInSeconds(avgGradient, elevGain);
      
      // 現在のペースを調整
      const currentPaceInSeconds = paceToSeconds(segment.customPace);
      const adjustedPaceInSeconds = currentPaceInSeconds + paceAdjustment;
      const adjustedPace = secondsToPace(adjustedPaceInSeconds);
      
      // 調整されたペースでセグメントを更新
      return {
        ...segment,
        customPace: adjustedPace
      };
    });
    
    // 更新されたセグメントをコールバックで返す
    onUpdateSegments(raceSegments);
    
    toast({
      title: "ペースプランを更新しました",
      description: "標高データに基づいてセグメントごとのペースを調整しました。",
    });
  };
  
  // 標高データがある場合に表示するコンテンツ
  const renderElevationContent = () => {
    if (!gpxData || !normalizedGpxData) return null;
    
    // レースセグメントの形式に変換
    const raceSegmentsFormatted = segments.map((segment) => {
      const nameParts = segment.name.replace('km', '').split('-');
      if (nameParts.length !== 2) return null;
      
      return {
        startDistance: parseFloat(nameParts[0]),
        endDistance: parseFloat(nameParts[1])
      };
    }).filter(Boolean) as { startDistance: number; endDistance: number; }[];
    
    // 標高セグメントをレースセグメントに合わせる
    const alignedElevSegments = alignGPXToRaceSegments(normalizedGpxData, raceSegmentsFormatted);
    
    return (
      <>
        <Tabs defaultValue="map" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map">コースマップ</TabsTrigger>
            <TabsTrigger value="elevation">標高グラフ</TabsTrigger>
          </TabsList>
          <TabsContent value="map" className="mt-4">
            <ElevationMap points={gpxData.points} height={350} />
          </TabsContent>
          <TabsContent value="elevation" className="mt-4">
            <ElevationChart points={normalizedGpxData.points} height={350} />
          </TabsContent>
        </Tabs>
        
        <ElevationSegmentTable
          elevationSegments={alignedElevSegments}
          paceSegments={segments}
        />
        
        <div className="mt-4 flex justify-end">
          <Button 
            onClick={handleApplyElevationBasedPaces}
            className="flex items-center gap-2"
          >
            標高データに基づくペース調整を適用
          </Button>
        </div>
      </>
    );
  };
  
  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <h3 className="text-lg font-display font-semibold mb-4">地形データ解析</h3>
        
        <GPXUploader onGpxFileUploaded={handleGpxFileUploaded} />
        
        {renderElevationContent()}
      </CardContent>
    </Card>
  );
}

// 勾配と上昇高度に基づいてペース調整量を秒単位で計算
function calculatePaceAdjustmentInSeconds(gradient: number, elevGain: number): number {
  if (gradient > 4 || (gradient > 2 && elevGain > 100)) {
    return 35; // +35秒/km
  } else if (gradient > 2 || (gradient > 1 && elevGain > 80)) {
    return 20; // +20秒/km
  } else if (gradient > 0.5 || (gradient > 0 && elevGain > 50)) {
    return 10; // +10秒/km
  } else if (gradient < -4 || (gradient < -2 && elevGain > 100)) {
    return -15; // -15秒/km
  } else if (gradient < -2) {
    return -8; // -8秒/km
  } else {
    return 0; // 変更なし
  }
}