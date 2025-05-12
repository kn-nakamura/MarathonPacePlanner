import { useRef } from 'react';
import { toPng } from 'html-to-image';
import { Segment } from '@/models/pace';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { calculateCumulativeTimes } from '@/utils/pace-utils';

interface ExportSegmentTableProps {
  segments: Segment[];
  targetTime: string;
  totalTime: string;
  averagePace: string;
}

export function ExportSegmentTable({ 
  segments, 
  targetTime, 
  totalTime, 
  averagePace 
}: ExportSegmentTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Calculate cumulative times
  const cumulativeTimes = calculateCumulativeTimes(segments);
  
  // Handle export as image
  const exportAsImage = async () => {
    if (!tableRef.current) return;
    
    try {
      const dataUrl = await toPng(tableRef.current, {
        quality: 0.95,
        width: 500, // Fixed width for consistency
        height: 650, // Fixed height to fit all content
        pixelRatio: 2, // Higher quality
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'
      });
      
      const link = document.createElement('a');
      link.download = `marathon-pace-plan-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
      
      toast({
        title: 'Image Saved',
        description: 'Pace plan was successfully downloaded as an image',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save image',
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
        Export as Image
      </Button>
      
      <div className="hidden">
        <div 
          ref={tableRef}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          style={{ width: 500, height: 650 }}
        >
          <h2 className="text-2xl font-bold mb-4">Marathon Pace Plan</h2>
          
          {/* Plan Summary */}
          <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Target Time:</div>
                <div className="text-lg font-semibold">{targetTime}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Actual Time:</div>
                <div className="text-lg font-semibold">{totalTime}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Avg Pace:</div>
                <div className="text-lg font-semibold">{averagePace}</div>
              </div>
            </div>
          </div>
          
          {/* Segment Table */}
          <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="py-2 px-3 text-left font-medium">Distance</th>
                  <th className="py-2 px-3 text-left font-medium">Pace</th>
                  <th className="py-2 px-3 text-left font-medium">Segment Time</th>
                  <th className="py-2 px-3 text-left font-medium">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((segment, index) => (
                  <tr key={segment.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="py-2 px-3">{segment.distance}</td>
                    <td className="py-2 px-3 font-medium">{segment.customPace}</td>
                    <td className="py-2 px-3">{segment.segmentTime}</td>
                    <td className="py-2 px-3 text-primary-600 dark:text-primary-400 font-semibold">{cumulativeTimes[index]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="text-xs text-center mt-4 text-muted-foreground">
            Generated on {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </>
  );
}