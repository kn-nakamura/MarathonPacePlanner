import { useRef, useEffect, useState } from 'react';
import { Segment } from '@/models/pace';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { paceToSeconds, secondsToPace } from '@/utils/pace-utils';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HorizontalPaceChartProps {
  segments: Segment[];
  exportMode?: boolean;
  height?: number;
}

interface ChartData {
  name: string;
  kmPoint: string;
  pace: number;
  paceText: string;
  fill: string;
}

export function HorizontalPaceChart({ 
  segments, 
  exportMode = false, 
  height = 350 
}: HorizontalPaceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [maxPace, setMaxPace] = useState<number>(0);
  const [minPace, setMinPace] = useState<number>(0);

  // Update chart data when segments change
  useEffect(() => {
    if (segments.length === 0) return;
    
    // Calculate min/max pace for scaling
    const paceValues = segments.map(segment => paceToSeconds(segment.customPace));
    let calculatedMinPace = Math.min(...paceValues) - 10; // 少し余裕を持たせる
    let calculatedMaxPace = Math.max(...paceValues) + 10;
    
    // 表示レンジを拡張してグラフを中央に表示
    // 最小値と最大値の差を計算
    const paceRange = calculatedMaxPace - calculatedMinPace;
    
    // レンジを30%拡張して横棒がちょうど中央に来るように調整
    calculatedMinPace = calculatedMinPace - (paceRange * 0.15);
    calculatedMaxPace = calculatedMaxPace + (paceRange * 0.15);
    
    setMinPace(calculatedMinPace);
    setMaxPace(calculatedMaxPace);
    
    // Build chart data
    const data = segments.map((segment) => {
      const paceInSeconds = paceToSeconds(segment.customPace);
      return {
        name: segment.name,
        kmPoint: segment.distance,
        pace: paceInSeconds,
        paceText: segment.customPace,
        // 速いペースほど濃い色に
        fill: getColorForPace(paceInSeconds, calculatedMinPace, calculatedMaxPace),
      };
    });
    
    setChartData(data);
  }, [segments]);

  // ペースに応じたグラデーションカラーを生成
  const getColorForPace = (pace: number, minPace: number, maxPace: number): string => {
    // 速いペース（小さい値）ほど濃い色にする
    const range = maxPace - minPace;
    if (range === 0) return '#ff8833'; // デフォルト
    
    // 逆転させる（速いペースほど濃い色に）
    const normalizedValue = 1 - ((pace - minPace) / range);
    
    // オレンジ系のグラデーション（明るい→濃い）
    const r = Math.floor(255 * (0.8 + normalizedValue * 0.2)); // 255 -> 204
    const g = Math.floor(136 * (0.8 + normalizedValue * 0.2)); // 136 -> 109
    const b = Math.floor(51 * (1 + normalizedValue * 0.5));    // 51 -> 77
    
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  // 最速のペースを見つける
  const getFastestPaceIndex = (data: ChartData[]): number => {
    if (data.length === 0) return -1;
    
    let fastestIndex = 0;
    let fastestPace = data[0].pace;
    
    data.forEach((item, index) => {
      if (item.pace < fastestPace) {
        fastestPace = item.pace;
        fastestIndex = index;
      }
    });
    
    return fastestIndex;
  };

  // Function to download chart as PNG
  const handleDownloadImage = async () => {
    if (chartRef.current === null) {
      return;
    }

    try {
      const dataUrl = await toPng(chartRef.current, { 
        cacheBust: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'
      });
      
      const link = document.createElement('a');
      link.download = `marathon-pace-plan-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: 'Image Saved',
        description: 'Your pace chart has been downloaded as an image',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save chart as image',
        variant: 'destructive',
      });
      console.error('Error downloading image:', err);
    }
  };

  // Mobile detection state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ペース情報用のトップラベル - 5'54", 5'23" など
  const renderPaceScale = () => {
    if (chartData.length === 0) return null;
    
    // 表示するペースポイント（6つ程度）
    const paceRange = maxPace - minPace;
    const step = Math.ceil(paceRange / 5); // 5分割
    
    const pacePoints = [];
    // 速いペース（低い値）から遅いペース（高い値）の順に並べる
    for (let i = maxPace; i >= minPace; i -= step) {
      pacePoints.push(i);
    }
    
    return (
      <div className="flex justify-between px-4 mb-1 text-gray-700 dark:text-gray-300">
        <div className="flex items-center">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span className="ml-1 text-sm font-medium">min/km</span>
        </div>
        <div className="flex-1 flex justify-between ml-6">
          {pacePoints.map((seconds, i) => (
            <div key={i} className="text-base font-semibold">
              {secondsToPace(seconds)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Custom tooltip formatter
  const paceTooltipFormatter = (value: any, name: string, props: any) => {
    if (name === 'pace') {
      // 秒数からMM:SS形式ではなく、分単位で表示
      const minutes = (value / 60).toFixed(1);
      return `${minutes} 分`;
    }
    return value;
  };

  return (
    <div className={!exportMode ? "mt-4" : ""}>
      {!exportMode && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-display font-semibold">Pace Distribution</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadImage}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            <span>Save as Image</span>
          </Button>
        </div>
      )}
      
      <div 
        ref={chartRef} 
        className={!exportMode ? "bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700" : ""}
      >
        {renderPaceScale()}
        
        <ResponsiveContainer width="100%" height={exportMode ? 500 : height}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 5,
              right: 35, // ラベルのスペース確保
              left: 5,
              bottom: 5,
            }}
            barSize={isMobile ? 25 : 35} // 縮小デバイスでは棒を細く
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis 
              type="number"
              domain={[maxPace, minPace]} // 逆順（速いペース＝小さい値が右側に）
              hide={true} // X軸は非表示（上部のカスタムラベルで代用）
            />
            <YAxis 
              type="category"
              dataKey="kmPoint"
              tick={{ fontSize: isMobile ? 12 : 14 }}
              tickLine={false}
              axisLine={false}
              width={isMobile ? 40 : 60}
              style={{ fontWeight: 500 }}
            />
            <Tooltip 
              formatter={paceTooltipFormatter}
              labelFormatter={(label) => `Distance: ${label}km`}
              contentStyle={{ 
                backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#ffffff',
                border: '1px solid #ccc'
              }}
            />
            <Bar 
              dataKey="pace" 
              name="Pace"
              background={{ fill: '#eee' }}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
{/* 雷マークは削除 */}
      </div>
    </div>
  );
}