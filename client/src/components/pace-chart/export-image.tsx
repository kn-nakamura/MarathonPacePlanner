import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2, Instagram, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';
import { Segment } from '@/models/pace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';

interface ExportImageProps {
  segments: Segment[];
  targetTime: string;
  totalTime: string;
  averagePace: string;
}

export function ExportImage({ segments, targetTime, totalTime, averagePace }: ExportImageProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Generate image and return data URL
  const generateImage = async (): Promise<string | null> => {
    if (exportRef.current === null) {
      return null;
    }

    try {
      return await toPng(exportRef.current, { 
        cacheBust: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        quality: 0.95,
        width: exportRef.current.offsetWidth,
        height: exportRef.current.offsetHeight
      });
    } catch (err) {
      console.error('Error generating image:', err);
      return null;
    }
  };

  // Download image directly
  const handleDownload = async () => {
    const dataUrl = await generateImage();
    
    if (!dataUrl) {
      toast({
        title: 'Export Failed',
        description: 'There was a problem generating your plan image',
        variant: 'destructive',
      });
      return;
    }
    
    const link = document.createElement('a');
    link.download = `marathon-pace-plan-${new Date().getTime()}.png`;
    link.href = dataUrl;
    link.click();

    toast({
      title: 'Plan Exported',
      description: 'Your pace plan has been downloaded as an image',
    });
  };

  // Share to social media or file apps
  const handleShare = async () => {
    const dataUrl = await generateImage();
    
    if (!dataUrl) {
      toast({
        title: 'Share Failed',
        description: 'There was a problem generating your plan image',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      // Use Web Share API if available
      if (navigator.share) {
        const file = new File([blob], 'marathon-pace-plan.png', { type: 'image/png' });
        
        await navigator.share({
          title: 'My Marathon Pace Plan',
          text: `Target time: ${targetTime} | Projected time: ${totalTime} | Average pace: ${averagePace}`,
          files: [file]
        });
        
        toast({
          title: 'Plan Shared',
          description: 'Your pace plan has been shared successfully',
        });
      } else {
        // Fallback for browsers that don't support Web Share API
        const shareUrl = URL.createObjectURL(blob);
        window.open(shareUrl, '_blank');
        
        toast({
          title: 'Share Option Not Available',
          description: 'Your browser does not support direct sharing. The image has been opened in a new tab.',
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
      toast({
        title: 'Share Failed',
        description: 'There was a problem sharing your plan',
        variant: 'destructive',
      });
    }
  };

  // Save plan to cookies
  const handleSaveToCookies = () => {
    try {
      // Create plan object to save
      const plan = {
        targetTime,
        totalTime,
        averagePace,
        segments,
        savedAt: new Date().toISOString()
      };
      
      // Save to localStorage (more storage space than cookies)
      localStorage.setItem('marathonPacePlan', JSON.stringify(plan));
      
      toast({
        title: 'Plan Saved',
        description: 'Your pace plan has been saved and will be available when you return',
      });
    } catch (err) {
      console.error('Error saving to cookies:', err);
      toast({
        title: 'Save Failed',
        description: 'There was a problem saving your plan',
        variant: 'destructive',
      });
    }
  };

  const formattedDate = new Date().toLocaleDateString();

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Share2 size={16} />
              <span className="md:inline hidden">Share</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare} className="flex items-center gap-2">
              <Instagram size={16} />
              <span>Instagram/Threads</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload} className="flex items-center gap-2">
              <Download size={16} />
              <span>Download Image</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          onClick={handleDownload}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download size={16} />
          <span className="md:inline hidden">Download</span>
        </Button>
        
        <Button 
          onClick={handleSaveToCookies}
          variant="default"
          className="flex items-center gap-2 ml-auto"
        >
          <Save size={16} />
          <span className="md:inline hidden">Save Plan</span>
        </Button>
      </div>

      <div ref={exportRef} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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

        <div className="overflow-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Segment</TableHead>
                <TableHead className="whitespace-nowrap">Distance</TableHead>
                <TableHead className="whitespace-nowrap">Target Pace</TableHead>
                <TableHead className="whitespace-nowrap">Custom Pace</TableHead>
                <TableHead className="whitespace-nowrap">Segment Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((segment) => (
                <TableRow key={segment.id}>
                  <TableCell className="font-medium whitespace-nowrap">{segment.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{segment.distance}</TableCell>
                  <TableCell className="whitespace-nowrap">{segment.targetPace}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{segment.customPace}</TableCell>
                  <TableCell className="whitespace-nowrap">{segment.segmentTime}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="text-xs text-muted-foreground text-center mt-6">
          Generated with Marathon Pace Planner on {formattedDate}
        </div>
      </div>
    </div>
  );
}