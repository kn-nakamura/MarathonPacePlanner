import { useRef, useEffect, useState } from 'react';
import { Segment } from '@/models/pace';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Label,
  Text
} from 'recharts';
import { paceToSeconds, secondsToPace, calculateCumulativeTimes } from '@/utils/pace-utils';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaceChartProps {
  segments: Segment[];
  targetTime: string;
  exportMode?: boolean;
  height?: number;
}

interface ChartData {
  name: string;
  distance: string;
  pace: number;
  targetPace: number;
  cumulativeTime?: string;
}

export function PaceChart({ segments, targetTime, exportMode = false, height = 350 }: PaceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Update chart data when segments change
  useEffect(() => {
    // Get cumulative times
    const cumulativeTimes = calculateCumulativeTimes(segments);
    
    // Build chart data with cumulative times
    // distanceを数値としてXポイントにするため、単位を除去して整数化
    const data = segments.map((segment, index) => ({
      name: segment.name,
      distance: segment.distance, // already in "5", "10" format
      pace: paceToSeconds(segment.customPace),
      targetPace: paceToSeconds(segment.targetPace),
      cumulativeTime: cumulativeTimes[index]
    }));
    
    setChartData(data);
  }, [segments]);

  // Calculate average target pace
  const avgTargetPace = chartData.length > 0 
    ? chartData.reduce((sum, segment) => sum + segment.targetPace, 0) / chartData.length
    : 0;

  // Custom tooltip formatter
  const paceTooltipFormatter = (value: number, name: string) => {
    if (name === 'pace') {
      return secondsToPace(value);
    } else if (name === 'targetPace') {
      return secondsToPace(value) + ' (target)'; 
    }
    return value;
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
  
  // Y軸の最小・最大値を計算（広い範囲をカバーするよう調整）
  const allPaceValues = chartData.flatMap(d => [d.pace, d.targetPace]);
  // デフォルト値を設定（データがない場合や異常値の場合のフォールバック）
  const minValue = allPaceValues.length > 0 ? Math.min(...allPaceValues) : 240; // 4:00/km
  const maxValue = allPaceValues.length > 0 ? Math.max(...allPaceValues) : 360; // 6:00/km
  
  // 目標タイムが2時間の場合でも対応できるよう範囲を広げる
  const minPaceValue = Math.max(0, Math.min(minValue, 180) - 30); // 2:30/km (3:00/km以上の場合)
  const maxPaceValue = Math.max(maxValue, 360) + 30; // 最大値+余裕
  
  // 10秒刻みの目盛りを生成する関数
  const generatePaceTicks = (min: number, max: number, step: number = 10) => {
    const ticks: number[] = [];
    for (let i = Math.floor(min / step) * step; i <= Math.ceil(max / step) * step; i += step) {
      // 30秒区切りの分だけ表示する (例: 4:00, 4:30, 5:00...)
      if (i % 30 === 0) {
        ticks.push(i);
      }
    }
    return ticks;
  };
  
  // Custom label component for cumulative times
  const CustomizedLabel = (props: any) => {
    const { x, y, value, index } = props;
    
    // Skip some points on mobile to avoid overcrowding
    if (isMobile && index !== 0 && index !== chartData.length - 1 && index % 2 !== 0) {
      return null;
    }
    
    const cumulativeTime = chartData[index]?.cumulativeTime;
    if (!cumulativeTime) return null;
    
    return (
      <Text
        x={x}
        y={y - 15}
        fill="#82ca9d"
        fontSize={isMobile ? 8 : 10}
        textAnchor="middle"
        verticalAnchor="middle"
      >
        {cumulativeTime}
      </Text>
    );
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
        <ResponsiveContainer width="100%" height={exportMode ? 500 : height + 100}>
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 35,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="distance" 
              label={{ 
                value: 'Distance (km)', 
                position: 'insideBottomRight', 
                offset: -10,
                style: { 
                  fontSize: isMobile ? 10 : 12,
                  fill: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#4b5563'
                }
              }}
              tick={{ fontSize: isMobile ? 8 : 10 }}
              tickFormatter={(value) => {
                // 5km単位のポイントのみ表示
                const distance = parseFloat(value);
                return distance % 5 === 0 || distance === 42.2 ? value : '';
              }}
              interval={0}
            />
            <YAxis 
              label={{ 
                value: 'min/km', 
                angle: -90, 
                position: 'insideLeft',
                style: { 
                  textAnchor: 'middle',
                  fontSize: isMobile ? 8 : 10,
                  fill: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#4b5563'
                }
              }}
              domain={[minPaceValue, maxPaceValue]}
              // Invert the axis so lower pace (faster) is higher on the chart
              reversed
              ticks={[4*60, 4*60+30, 5*60, 5*60+30, 6*60]} // 30秒単位の目盛り
              tick={{ fontSize: isMobile ? 8 : 10 }}
              tickFormatter={(value) => {
                const min = Math.floor(value / 60);
                const sec = Math.floor(value % 60); // roundではなくfloorに変更
                return `${min}:${sec.toString().padStart(2, '0')}`;
              }}
            />
            <Tooltip 
              formatter={paceTooltipFormatter}
              labelFormatter={(label) => `Distance: ${label}`}
              contentStyle={{ 
                backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#ffffff',
                border: '1px solid #ccc'
              }}
            />
            <Legend verticalAlign="top" height={36} />
            <ReferenceLine 
              y={avgTargetPace} 
              stroke="#8884d8" 
              strokeDasharray="3 3" 
              label="Avg Target Pace" 
            />
            <Line 
              type="monotone" 
              dataKey="targetPace" 
              stroke="#8884d8" 
              name="Target Pace" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="pace" 
              stroke="#82ca9d" 
              name="Pace" 
              strokeWidth={2}
              dot={{ r: 4 }}
              label={<CustomizedLabel />}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="text-xs text-center mt-2 text-muted-foreground">
          {!exportMode ? "Note: Cumulative times shown above each data point" : ""}
        </div>
      </div>
    </div>
  );
}