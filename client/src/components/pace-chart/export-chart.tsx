import { useRef } from 'react';
import { toPng } from 'html-to-image';
import { Segment } from '@/models/pace';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { HorizontalPaceChart } from './horizontal-pace-chart';

interface ExportChartProps {
  segments: Segment[];
  targetTime: string;
}

export function ExportChart({ segments, targetTime }: ExportChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Handle export as image
  const exportAsImage = async () => {
    if (!chartRef.current) return;
    
    try {
      const dataUrl = await toPng(chartRef.current, {
        quality: 0.95,
        width: 800, // Fixed width for consistency
        height: 500, // Fixed height to fit chart
        pixelRatio: 2, // Higher quality
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'
      });
      
      const link = document.createElement('a');
      link.download = `marathon-pace-chart-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
      
      toast({
        title: 'Chart Saved',
        description: 'Pace chart downloaded as image successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save chart as image',
        variant: 'destructive',
      });
      console.error('Error saving image:', err);
    }
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        onClick={exportAsImage}
        className="mb-4"
      >
        Save as Image
      </Button>
      
      <div 
        ref={chartRef}
        className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-xl font-bold mb-4">Marathon Pace Distribution</h2>
        <HorizontalPaceChart 
          segments={segments}
          exportMode={true}
        />
      </div>
    </>
  );
}