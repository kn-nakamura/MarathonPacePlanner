import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';

interface ElevationPoint {
  distance: number;
  elevation: number;
}

interface SimpleElevationViewProps {
  onUpdateSegments?: (adjustedSegments: any[]) => void;
}

export function SimpleElevationView({ onUpdateSegments }: SimpleElevationViewProps) {
  const [elevationData, setElevationData] = React.useState<ElevationPoint[]>([]);
  const [totalDistance, setTotalDistance] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // GPXファイルを解析
  const parseGPXFile = (content: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, "text/xml");
      
      // トラックポイントを収集
      const trackPoints = Array.from(xmlDoc.getElementsByTagName('trkpt'));
      
      if (trackPoints.length === 0) {
        setError('GPXファイルにトラックポイントが見つかりませんでした');
        return;
      }
      
      const points: ElevationPoint[] = [];
      let distance = 0;
      let prevLat: number | null = null;
      let prevLon: number | null = null;
      
      // 各トラックポイントを処理
      trackPoints.forEach((point, index) => {
        const lat = parseFloat(point.getAttribute('lat') || '0');
        const lon = parseFloat(point.getAttribute('lon') || '0');
        
        // 標高を取得
        const eleElement = point.getElementsByTagName('ele')[0];
        const elevation = eleElement ? parseFloat(eleElement.textContent || '0') : 0;
        
        // 最初のポイント以外は距離を計算
        if (index > 0 && prevLat !== null && prevLon !== null) {
          // 簡易的な距離計算（ヒュベニの公式）
          const R = 6371; // 地球の半径 (km)
          const dLat = (lat - prevLat) * (Math.PI / 180);
          const dLon = (lon - prevLon) * (Math.PI / 180);
          const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(prevLat * (Math.PI / 180)) * Math.cos(lat * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const segmentDistance = R * c; // km単位
          
          distance += segmentDistance;
        }
        
        // 間引いてデータ量を減らす（100mごとにポイントを記録）
        if (index === 0 || index === trackPoints.length - 1 || index % 10 === 0) {
          points.push({
            distance: parseFloat(distance.toFixed(2)),
            elevation: Math.round(elevation)
          });
        }
        
        prevLat = lat;
        prevLon = lon;
      });
      
      setElevationData(points);
      setTotalDistance(parseFloat(distance.toFixed(2)));
      setError(null);
      
    } catch (e) {
      console.error('GPX parsing error:', e);
      setError('GPXファイルの解析中にエラーが発生しました');
    }
  };
  
  // ファイルがアップロードされた時
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setError('アップロードできるのはGPXファイルのみです');
      setFileName(null);
      return;
    }
    
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        parseGPXFile(content);
      }
    };
    reader.onerror = () => {
      setError('ファイルの読み込み中にエラーが発生しました');
    };
    reader.readAsText(file);
  };
  
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  // Y軸の範囲を計算
  const yAxisDomain = React.useMemo(() => {
    if (elevationData.length === 0) return [0, 100];
    const elevations = elevationData.map(d => d.elevation);
    const minElev = Math.floor(Math.min(...elevations));
    const maxElev = Math.ceil(Math.max(...elevations));
    const padding = Math.max(10, Math.round((maxElev - minElev) * 0.1)); // 少なくとも10m、または10%のパディング
    return [Math.max(0, minElev - padding), maxElev + padding];
  }, [elevationData]);
  
  // ペースプランに標高データを適用する機能
  const handleApplyElevationData = () => {
    if (onUpdateSegments && elevationData.length > 0) {
      // ここで実際のペース調整ロジックを実装
      // このシンプル実装では「適用しました」というメッセージだけ表示
      alert('標高データを基にペースプランを調整しました（この実装ではダミーメッセージです）');
    }
  };
  
  return (
    <div className="space-y-4">
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
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {fileName} ({totalDistance}km)
          </div>
        )}
        
        <input
          type="file"
          accept=".gpx"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {elevationData.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-lg font-semibold mb-2">標高プロファイル</div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={elevationData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 10,
                  bottom: 5,
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
                  labelFormatter={(value) => `距離: ${value} km`}
                />
                <Area 
                  type="monotone" 
                  dataKey="elevation" 
                  stroke="#3B82F6" 
                  fill="#93C5FD" 
                />
              </AreaChart>
            </ResponsiveContainer>
            
            {onUpdateSegments && (
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleApplyElevationData}
                  disabled={elevationData.length === 0}
                >
                  標高データに基づくペース調整を適用
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            GPXファイルをアップロードすると、標高プロファイルが表示されます
          </p>
        </div>
      )}
    </div>
  );
}