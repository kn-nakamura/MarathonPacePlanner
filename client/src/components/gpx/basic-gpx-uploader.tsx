import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Info } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { Segment } from '@/models/pace';
import { useIsMobile } from '@/hooks/use-mobile';
import { paceToSeconds, secondsToPace } from '@/utils/pace-utils';

interface GPXUploaderProps {
  segments: Segment[];
  onUpdateSegments: (segments: Segment[]) => void;
}

interface ElevationPoint {
  distance: number;
  elevation: number;
}

export function BasicGpxUploader({ segments, onUpdateSegments }: GPXUploaderProps) {
  const [elevationData, setElevationData] = useState<ElevationPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [totalElevGain, setTotalElevGain] = useState(0);
  const [totalElevLoss, setTotalElevLoss] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // GPXファイルをアップロードして解析する
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setError('アップロードできるのはGPXファイルのみです');
      setFileName(null);
      return;
    }

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        parseGPX(content);
      } catch (err) {
        console.error('GPX解析エラー:', err);
        setError('GPXファイルの解析に失敗しました');
      }
    };
    reader.onerror = () => {
      setError('ファイルの読み込み中にエラーが発生しました');
    };
    reader.readAsText(file);
  };

  // GPXファイルを解析する
  const parseGPX = (gpxContent: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(gpxContent, "text/xml");
      
      // トラックポイントを取得
      const trackPoints = Array.from(xmlDoc.getElementsByTagName('trkpt'));
      
      if (trackPoints.length === 0) {
        setError('GPXファイルにトラックポイントが見つかりませんでした');
        return;
      }
      
      const points: ElevationPoint[] = [];
      let totalDistance = 0;
      let lastLat: number | null = null;
      let lastLon: number | null = null;
      let lastElevation: number | null = null;
      let elevGain = 0;
      let elevLoss = 0;
      
      // 各トラックポイントを処理
      trackPoints.forEach((point, index) => {
        const lat = parseFloat(point.getAttribute('lat') || '0');
        const lon = parseFloat(point.getAttribute('lon') || '0');
        
        // 標高を取得
        const eleElement = point.getElementsByTagName('ele')[0];
        const elevation = eleElement ? parseFloat(eleElement.textContent || '0') : 0;
        
        // 最初のポイント以外は距離と標高差を計算
        if (index > 0 && lastLat !== null && lastLon !== null && lastElevation !== null) {
          // 簡易的な距離計算（ヒュベニの公式）
          const R = 6371; // 地球の半径 (km)
          const dLat = (lat - lastLat) * (Math.PI / 180);
          const dLon = (lon - lastLon) * (Math.PI / 180);
          const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lastLat * (Math.PI / 180)) * Math.cos(lat * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const segmentDistance = R * c; // km単位
          
          totalDistance += segmentDistance;
          
          // 標高差を計算
          const elevDiff = elevation - lastElevation;
          if (elevDiff > 0) {
            elevGain += elevDiff;
          } else {
            elevLoss += Math.abs(elevDiff);
          }
        }
        
        // データポイントを追加（間引いて処理を軽くする）
        if (index === 0 || index === trackPoints.length - 1 || index % Math.max(1, Math.floor(trackPoints.length / 300)) === 0) {
          points.push({
            distance: parseFloat(totalDistance.toFixed(2)),
            elevation: Math.round(elevation)
          });
        }
        
        lastLat = lat;
        lastLon = lon;
        lastElevation = elevation;
      });
      
      setElevationData(points);
      setTotalElevGain(Math.round(elevGain));
      setTotalElevLoss(Math.round(elevLoss));
      
    } catch (err) {
      console.error('GPX解析エラー:', err);
      setError('GPXファイルの解析中にエラーが発生しました');
    }
  };

  // 標高データに基づいてペースを調整する
  const applyElevationToPacePlan = () => {
    if (elevationData.length === 0 || segments.length === 0) return;
    
    // セグメントごとに標高変化を計算
    const updatedSegments = segments.map((segment, index) => {
      // セグメント名から距離の範囲を抽出 (例: "0-5km" → [0, 5])
      const distanceMatch = segment.name.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
      if (!distanceMatch) return segment;
      
      const startDistance = parseFloat(distanceMatch[1]);
      const endDistance = parseFloat(distanceMatch[2]);
      
      // このセグメントの範囲内の標高データを見つける
      const segmentElevData = elevationData.filter(
        point => point.distance >= startDistance && point.distance <= endDistance
      );
      
      if (segmentElevData.length < 2) return segment;
      
      // セグメント内の上り下りを計算
      let segmentElevGain = 0;
      let segmentElevLoss = 0;
      
      for (let i = 1; i < segmentElevData.length; i++) {
        const elevDiff = segmentElevData[i].elevation - segmentElevData[i-1].elevation;
        if (elevDiff > 0) {
          segmentElevGain += elevDiff;
        } else {
          segmentElevLoss += Math.abs(elevDiff);
        }
      }
      
      // セグメントの距離
      const segmentDistance = endDistance - startDistance;
      
      // 平均勾配を計算
      const startElev = segmentElevData[0].elevation;
      const endElev = segmentElevData[segmentElevData.length-1].elevation;
      const netElevChange = endElev - startElev;
      const avgGradient = (netElevChange / (segmentDistance * 1000)) * 100; // %で表示
      
      // 勾配と上昇量に基づいてペース調整値（秒単位）を計算
      let paceAdjustment = 0;
      
      // 上りの場合は遅く、下りの場合は速く
      if (avgGradient > 4 || (avgGradient > 2 && segmentElevGain > 100)) {
        paceAdjustment = 30; // +30秒/km
      } else if (avgGradient > 2 || (avgGradient > 1 && segmentElevGain > 80)) {
        paceAdjustment = 20; // +20秒/km
      } else if (avgGradient > 0.5 || (avgGradient > 0 && segmentElevGain > 50)) {
        paceAdjustment = 10; // +10秒/km
      } else if (avgGradient < -4 || (avgGradient < -2 && segmentElevLoss > 100)) {
        paceAdjustment = -15; // -15秒/km
      } else if (avgGradient < -2) {
        paceAdjustment = -8; // -8秒/km
      }
      
      // 現在のペースを調整
      const currentPaceSeconds = paceToSeconds(segment.customPace);
      const adjustedPaceSeconds = Math.max(0, currentPaceSeconds + paceAdjustment);
      const adjustedPace = secondsToPace(adjustedPaceSeconds);
      
      // セグメント時間も更新
      const segmentTimeMinutes = adjustedPaceSeconds / 60 * segmentDistance;
      const minutes = Math.floor(segmentTimeMinutes);
      const seconds = Math.round((segmentTimeMinutes - minutes) * 60);
      const segmentTime = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
      
      return {
        ...segment,
        customPace: adjustedPace,
        segmentTime
      };
    });
    
    onUpdateSegments(updatedSegments);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // グラフのY軸の範囲を計算
  const yAxisDomain = React.useMemo(() => {
    if (elevationData.length === 0) return [0, 100];
    const elevations = elevationData.map(d => d.elevation);
    const minElev = Math.floor(Math.min(...elevations));
    const maxElev = Math.ceil(Math.max(...elevations));
    const padding = Math.max(10, Math.round((maxElev - minElev) * 0.1)); // 最低10m、または10%のパディング
    return [Math.max(0, minElev - padding), maxElev + padding];
  }, [elevationData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <Button 
            onClick={handleButtonClick} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <Upload size={16} />
            <span>GPXファイルをアップロード</span>
          </Button>
          
          {fileName && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {fileName}
            </span>
          )}
          
          <input
            type="file"
            accept=".gpx"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      
      {elevationData.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">総上昇量</div>
                  <div className="text-2xl font-bold">{totalElevGain}m</div>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">総下降量</div>
                  <div className="text-2xl font-bold">{totalElevLoss}m</div>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">標高差</div>
                  <div className="text-2xl font-bold">{totalElevGain - totalElevLoss}m</div>
                </div>
                <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={elevationData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 10,
                  bottom: 10,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="distance" 
                  label={{ 
                    value: 'km',
                    position: 'insideBottomRight',
                    offset: -5
                  }}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                />
                <YAxis 
                  domain={yAxisDomain}
                  label={{ 
                    value: '標高 (m)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { 
                      textAnchor: 'middle',
                      fontSize: isMobile ? 10 : 12 
                    }
                  }}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value} m`, '標高']}
                  labelFormatter={(label) => `距離: ${label} km`}
                />
                <Area 
                  type="monotone" 
                  dataKey="elevation" 
                  stroke="#3B82F6" 
                  fill="#93C5FD" 
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Info size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                標高データに基づいて、上り坂では遅く、下り坂では速いペースに自動調整できます。
              </div>
            </div>
            <Button onClick={applyElevationToPacePlan}>
              ペースに適用
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            GPXファイルをアップロードすると、標高プロファイルと自動ペース調整機能が表示されます
          </p>
        </div>
      )}
    </div>
  );
}