import { useRef } from 'react';
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
  ReferenceLine
} from 'recharts';
import { paceToSeconds, secondsToPace } from '@/utils/pace-utils';
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
}

export function PaceChart({ segments, targetTime }: PaceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Convert segment data for the chart
  const chartData: ChartData[] = segments.map(segment => ({
    name: segment.name,
    distance: segment.distance,
    pace: paceToSeconds(segment.customPace),
    targetPace: paceToSeconds(segment.targetPace)
  }));

  // Calculate average target pace
  const avgTargetPace = chartData.reduce((sum, segment) => sum + segment.targetPace, 0) / chartData.length;

  // Custom tooltip formatter
  const paceTooltipFormatter = (value: number) => {
    return secondsToPace(value);
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
              top: 5,
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
                value: 'Pace (seconds/km)', 
                angle: -90, 
                position: 'insideLeft' 
              }}
              domain={['auto', 'auto']}
              // Invert the axis so lower pace (faster) is higher on the chart
              reversed
            />
            <Tooltip 
              formatter={paceTooltipFormatter}
              labelFormatter={(label) => `Distance: ${label}`}
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
              name="Custom Pace" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}