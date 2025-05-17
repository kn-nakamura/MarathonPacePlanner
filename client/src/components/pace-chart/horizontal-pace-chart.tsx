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
  ReferenceLine,
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
  targetPace: number;
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
    const targetPaceValues = segments.map(segment => paceToSeconds(segment.targetPace));
    
    // 基本となるペース範囲を計算
    let calculatedMinPace = Math.min(...paceValues);
    let calculatedMaxPace = Math.max(...paceValues);
    
    // すべてのペースが同じ場合でも表示するための調整
    const paceRange = calculatedMaxPace - calculatedMinPace;
    
    if (paceRange < 20) {
      // すべてのペースがほぼ同じ場合、平均値を中心に範囲を設定
      const avgPace = (calculatedMinPace + calculatedMaxPace) / 2;
      calculatedMinPace = avgPace - 60; // 平均から-60秒
      calculatedMaxPace = avgPace + 60; // 平均から+60秒
    } else {
      // 一番遅いペースも一番速いペースも少しオフセットするため、
      // 範囲の両端に余白を追加（30%ずつ）
      const adjustedRange = paceRange * 0.3;
      calculatedMinPace = calculatedMinPace - adjustedRange;
      calculatedMaxPace = calculatedMaxPace + adjustedRange;
    }
    
    setMinPace(calculatedMinPace);
    setMaxPace(calculatedMaxPace);
    
    // 平均ターゲットペースを計算
    const avgTargetPace = targetPaceValues.reduce((acc, curr) => acc + curr, 0) / targetPaceValues.length;
    
    // Build chart data
    const data = segments.map((segment) => {
      const paceInSeconds = paceToSeconds(segment.customPace);
      const targetPaceInSeconds = paceToSeconds(segment.targetPace);
      
      return {
        name: segment.name,
        kmPoint: segment.distance,
        pace: paceInSeconds,
        paceText: segment.customPace.replace('/km', ''),
        targetPace: targetPaceInSeconds,
        // 速いペースほど濃い色に
        fill: getColorForPace(paceInSeconds, calculatedMinPace, calculatedMaxPace),
      };
    });
    
    setChartData(data);
  }, [segments]);

  // ペースに応じたグラデーションカラーを生成
  const getColorForPace = (pace: number, minPace: number, maxPace: number): string => {
    // 逆にして、遅いペース（大きい値）ほど濃い色にする
    const range = maxPace - minPace;
    if (range === 0) return '#ff8833'; // デフォルト
    
    // グラデーションを逆転（遅いペースほど濃い色に）
    const normalizedValue = (pace - minPace) / range;
    
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

  // ペース情報用のトップラベル
  const renderPaceScale = () => {
    if (chartData.length === 0) return null;
    
    return (
      <div className="flex px-4 mb-1 text-gray-700 dark:text-gray-300">
        <div className="flex items-center">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span className="ml-1 text-sm font-medium">min/km</span>
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
              right: 55, // ラベルのスペース確保
              left: 5,
              bottom: 5,
            }}
            barSize={isMobile ? 25 : 35} // 縮小デバイスでは棒を細く
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis 
              type="number"
              domain={[minPace, maxPace]} // 速いペース＝小さい値が左側
              hide={true} // X軸は非表示（上部のカスタムラベルで代用）
              reversed={true} // X軸を反転させて、速いペース（低い値）を右側に表示
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
            {/* ターゲットペースを点線で表示 */}
            {chartData.map((entry, index) => (
              <ReferenceLine 
                key={`ref-${index}`}
                y={entry.kmPoint}
                x={entry.targetPace}
                stroke="#3b82f6" 
                strokeDasharray="5 5"
                strokeWidth={2}
                segment={[
                  { x: entry.targetPace, y: entry.kmPoint }, 
                  { x: maxPace, y: entry.kmPoint }
                ]}
                ifOverflow="visible"
              />
            ))}
            <Bar 
              dataKey="pace" 
              name="Pace"
              background={{ fill: '#eee' }}
              label={(props) => {
                const { x, y, width, height, value, index } = props;
                const paceText = chartData[index].paceText;
                return (
                  <text 
                    x={x + width + 3} 
                    y={y + height/2} 
                    fill="#d32f2f"
                    textAnchor="start" 
                    dominantBaseline="middle"
                    fontSize={isMobile ? 12 : 14}
                    fontWeight="600"
                  >
                    {paceText}
                  </text>
                );
              }}
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