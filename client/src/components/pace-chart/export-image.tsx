import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';
import { Segment } from '@/models/pace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ExportImageProps {
  segments: Segment[];
  targetTime: string;
  totalTime: string;
  averagePace: string;
}

export function ExportImage({ segments, targetTime, totalTime, averagePace }: ExportImageProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    if (exportRef.current === null) {
      return;
    }

    try {
      const dataUrl = await toPng(exportRef.current, { 
        cacheBust: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        quality: 0.95,
        width: exportRef.current.offsetWidth,
        height: exportRef.current.offsetHeight
      });
      
      const link = document.createElement('a');
      link.download = `marathon-pace-plan-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: 'Plan Exported',
        description: 'Your pace plan has been saved as an image',
      });
    } catch (err) {
      toast({
        title: 'Export Failed',
        description: 'There was a problem exporting your plan',
        variant: 'destructive',
      });
      console.error('Error exporting image:', err);
    }
  };

  const formattedDate = new Date().toLocaleDateString();

  return (
    <div className="mt-4">
      <Button 
        onClick={handleExport}
        className="mb-4 flex items-center gap-2"
      >
        <Download size={16} />
        <span>Export Plan as Image</span>
      </Button>

      <div ref={exportRef} className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="mb-4 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-primary mr-2"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <h2 className="text-xl font-display font-bold">Marathon Pace Planner</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gray-50 dark:bg-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Plan Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Time:</span>
                  <span className="font-medium">{targetTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Projected Time:</span>
                  <span className="font-medium">{totalTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Pace:</span>
                  <span className="font-medium">{averagePace}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">{formattedDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 dark:bg-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Segment Statistics</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Distance:</span>
                  <span className="font-medium">42.2 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number of Segments:</span>
                  <span className="font-medium">{segments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fastest Segment:</span>
                  <span className="font-medium">
                    {segments.reduce((fastest, segment) => {
                      const currentPace = segment.customPace.split('/')[0];
                      const fastestPace = fastest.customPace.split('/')[0];
                      return currentPace < fastestPace ? segment : fastest;
                    }, segments[0]).customPace}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slowest Segment:</span>
                  <span className="font-medium">
                    {segments.reduce((slowest, segment) => {
                      const currentPace = segment.customPace.split('/')[0];
                      const slowestPace = slowest.customPace.split('/')[0];
                      return currentPace > slowestPace ? segment : slowest;
                    }, segments[0]).customPace}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Segment</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Target Pace</TableHead>
              <TableHead>Custom Pace</TableHead>
              <TableHead>Segment Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((segment) => (
              <TableRow key={segment.id}>
                <TableCell className="font-medium">{segment.name}</TableCell>
                <TableCell>{segment.distance}</TableCell>
                <TableCell>{segment.targetPace}</TableCell>
                <TableCell className="font-medium">{segment.customPace}</TableCell>
                <TableCell>{segment.segmentTime}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="text-xs text-muted-foreground text-center mt-6">
          Generated with Marathon Pace Planner on {formattedDate}
        </div>
      </div>
    </div>
  );
}