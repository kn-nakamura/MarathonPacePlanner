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
}

interface ChartData {
  name: string;
  distance: string;
  pace: number;
  targetPace: number;
  cumulativeTime?: string;
}

export function PaceChart({ segments, targetTime }: PaceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Update chart data when segments change
  useEffect(() => {
    // Get cumulative times
    const cumulativeTimes = calculateCumulativeTimes(segments);
    
    // Build chart data with cumulative times
    const data = segments.map((segment, index) => ({
      name: segment.name,
      distance: segment.distance,
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
  
  // Calculate min and max pace values for y-axis (with padding)
  const paceValues = chartData.flatMap(d => [d.pace, d.targetPace]);
  const minPaceValue = Math.max(0, Math.min(...paceValues) - 15); // Add padding, but don't go below 0
  const maxPaceValue = Math.max(...paceValues) + 15; // Add padding
  
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
    <div className="mt-4">
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
      
      <div 
        ref={chartRef} 
        className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <ResponsiveContainer width="100%" height={350}>
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
                value: 'Distance', 
                position: 'insideBottomRight', 
                offset: -10 
              }} 
            />
            <YAxis 
              label={{ 
                value: 'min/km', 
                angle: -90, 
                position: 'insideLeft',
                style: { 
                  textAnchor: 'middle',
                  fontSize: isMobile ? 10 : 12,
                  fill: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#4b5563'
                }
              }}
              domain={[minPaceValue, maxPaceValue]}
              // Invert the axis so lower pace (faster) is higher on the chart
              reversed
              tickCount={isMobile ? 4 : 6}
              tickFormatter={(value) => {
                const min = Math.floor(value / 60);
                const sec = Math.round(value % 60);
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
          Note: Cumulative times shown above each data point
        </div>
      </div>
    </div>
  );
}