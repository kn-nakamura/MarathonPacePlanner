import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SegmentTable } from '@/components/plan-table/segment-table';
import { SummaryCard } from '@/components/result-summary/summary-card';
import { DEFAULT_SEGMENTS, Segment, PacePlan } from '@/models/pace';
import { usePaceConverter } from '@/hooks/use-pace-converter';
import { formatTime, calculateTotalTime, calculateAveragePace } from '@/utils/pace-utils';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Save, Share2, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/auth-context';

export default function Home() {
  const [targetHours, setTargetHours] = useState<string>("3");
  const [targetMinutes, setTargetMinutes] = useState<string>("30");
  const [targetSeconds, setTargetSeconds] = useState<string>("00");
  const [segments, setSegments] = useState<Segment[]>([...DEFAULT_SEGMENTS]);
  const [planName, setPlanName] = useState<string>("");
  const { calculatePace, calculateTime } = usePaceConverter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Query saved plans if user is logged in
  const { data: savedPlans } = useQuery({
    queryKey: ['/api/pace-plans'],
    enabled: !!user,
  });

  // Format the target time
  const targetTime = `${targetHours}:${targetMinutes}:${targetSeconds}`;

  // Calculate total time and average pace
  const totalTime = calculateTotalTime(segments);
  const averagePace = calculateAveragePace(totalTime, 42.2);

  // Generate plan based on target time
  const generatePlan = () => {
    // Calculate default pace from target time
    const defaultPace = calculatePace(targetTime, 42.2);
    
    // Create new segments with calculated pace
    const newSegments = segments.map((segment, index) => {
      const distanceParts = segment.distance.split('-');
      let distance: number;
      
      if (index === segments.length - 1) {
        // Final segment is special (2.2km)
        distance = 2.2;
      } else {
        distance = 5; // All other segments are 5km
      }
      
      const segmentTime = calculateTime(defaultPace, distance);
      
      return {
        ...segment,
        targetPace: defaultPace,
        customPace: defaultPace,
        segmentTime: segmentTime.split(':').slice(1).join(':') // Remove hours part
      };
    });
    
    setSegments(newSegments);
    
    toast({
      title: "Plan Generated",
      description: `Created a pace plan for a target time of ${targetTime}.`,
    });
  };

  // Handle updating a single segment
  const handleUpdateSegment = (index: number, updatedSegment: Segment) => {
    const newSegments = [...segments];
    
    // Get the distance for this segment
    const distance = index === segments.length - 1 ? 2.2 : 5;
    
    // Recalculate segment time based on new pace
    const segmentTime = calculateTime(updatedSegment.customPace, distance);
    
    // Update the segment with the new pace and time
    newSegments[index] = {
      ...updatedSegment,
      segmentTime: segmentTime.split(':').slice(1).join(':') // Remove hours part
    };
    
    setSegments(newSegments);
  };

  // Handle updating all remaining segments
  const handleUpdateRemainingSegments = (startIndex: number, pace: string) => {
    const newSegments = [...segments];
    
    for (let i = startIndex; i < segments.length; i++) {
      // Get the distance for this segment
      const distance = i === segments.length - 1 ? 2.2 : 5;
      
      // Recalculate segment time based on new pace
      const segmentTime = calculateTime(pace, distance);
      
      // Update the segment with the new pace and time
      newSegments[i] = {
        ...segments[i],
        customPace: pace,
        segmentTime: segmentTime.split(':').slice(1).join(':') // Remove hours part
      };
    }
    
    setSegments(newSegments);
  };

  // Save plan mutation
  const savePlanMutation = useMutation({
    mutationFn: async (plan: PacePlan) => {
      const response = await apiRequest('POST', '/api/pace-plans', plan);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pace-plans'] });
      toast({
        title: "Plan Saved",
        description: "Your pace strategy has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Saving Plan",
        description: "There was an error saving your plan. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle saving the current plan
  const handleSavePlan = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to save your pace plan.",
      });
      return;
    }
    
    // Generate a name if none was provided
    const name = planName || `Marathon Plan ${targetTime}`;
    
    // Create plan object
    const plan: PacePlan = {
      name,
      targetTime,
      segments,
      totalTime
    };
    
    savePlanMutation.mutate(plan);
  };

  // Hours, minutes, seconds options for selects
  const hoursOptions = Array.from({ length: 7 }, (_, i) => i.toString());
  const minutesOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  const secondsOptions = ['00', '15', '30', '45'];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-display font-semibold mb-2">Welcome, Runner!</h2>
        <p className="text-gray-600 dark:text-gray-400">Create, customize and save your marathon pace strategy below.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input & Summary */}
        <div className="lg:col-span-4 space-y-6">
          {/* Target Time Input Card */}
          <Card>
            <CardHeader>
              <CardTitle>Target Marathon Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="hour">Hours</Label>
                  <Select value={targetHours} onValueChange={setTargetHours}>
                    <SelectTrigger id="hour">
                      <SelectValue placeholder="Hours" />
                    </SelectTrigger>
                    <SelectContent>
                      {hoursOptions.map(hour => (
                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="minute">Minutes</Label>
                  <Select value={targetMinutes} onValueChange={setTargetMinutes}>
                    <SelectTrigger id="minute">
                      <SelectValue placeholder="Minutes" />
                    </SelectTrigger>
                    <SelectContent>
                      {minutesOptions.map(minute => (
                        <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="second">Seconds</Label>
                  <Select value={targetSeconds} onValueChange={setTargetSeconds}>
                    <SelectTrigger id="second">
                      <SelectValue placeholder="Seconds" />
                    </SelectTrigger>
                    <SelectContent>
                      {secondsOptions.map(second => (
                        <SelectItem key={second} value={second}>{second}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                className="mt-4 w-full" 
                onClick={generatePlan}
                disabled={!targetHours && !targetMinutes}
              >
                Generate Pace Plan
              </Button>
            </CardContent>
          </Card>
          
          {/* Plan Summary Card */}
          <SummaryCard
            segments={segments}
            targetTime={targetTime}
            totalTime={totalTime}
            averagePace={averagePace}
            onSavePlan={handleSavePlan}
          />
          
          {/* Saved Plans Card */}
          {user && (
            <Card>
              <CardHeader>
                <CardTitle>Saved Plans</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {savedPlans?.length > 0 ? (
                  savedPlans.map((plan: PacePlan) => (
                    <div 
                      key={plan.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    >
                      <div>
                        <h4 className="font-medium">{plan.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {plan.totalTime} ({calculateAveragePace(plan.totalTime, 42.2)})
                        </p>
                      </div>
                      <Link href={`/saved-plans/${plan.id}`}>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No saved plans yet. Create and save your first plan!
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Right Column: Segment Pace Editor */}
        <div className="lg:col-span-8 space-y-6">
          {/* Hero Section */}
          <div className="relative rounded-xl overflow-hidden h-56 md:h-64">
            <div 
              className="w-full h-full bg-cover bg-center" 
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1530137234525-770c4962e0cc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80')"
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary-900/80 to-transparent flex items-center">
              <div className="px-6 md:px-10 py-4 text-white">
                <h2 className="text-2xl md:text-3xl font-display font-bold">Pace Strategy</h2>
                <p className="mt-2 max-w-md">Fine-tune your segment paces to achieve your marathon goal</p>
              </div>
            </div>
          </div>

          {/* Segments Editor */}
          <SegmentTable 
            segments={segments}
            onUpdateSegment={handleUpdateSegment}
            onUpdateRemainingSegments={handleUpdateRemainingSegments}
          />

          {/* Pace Distribution Chart - placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Pace Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto mb-2"
                  >
                    <path d="M3 3v18h18"></path>
                    <path d="M3 9h18"></path>
                    <path d="M3 15h18"></path>
                    <path d="M9 3v18"></path>
                    <path d="M15 3v18"></path>
                  </svg>
                  <p>Pace distribution chart visualization</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tips and Strategy Section */}
          <Card>
            <CardHeader>
              <CardTitle>Strategy Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="inline mr-2"
                    >
                      <path d="M12 2v6"></path>
                      <path d="M12 18v4"></path>
                      <path d="M4.93 4.93l4.24 4.24"></path>
                      <path d="M14.83 14.83l4.24 4.24"></path>
                      <path d="M2 12h6"></path>
                      <path d="M18 12h4"></path>
                      <path d="M4.93 19.07l4.24-4.24"></path>
                      <path d="M14.83 9.17l4.24-4.24"></path>
                    </svg>
                    Negative Split
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Running the second half of your marathon faster than the first can help prevent burnout and improve your overall time.
                  </p>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                  <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="inline mr-2"
                    >
                      <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                    </svg>
                    Heart Rate Management
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Starting slightly slower helps keep your heart rate in check and preserves energy for the challenging final kilometers.
                  </p>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-700 dark:text-purple-300 mb-2">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="inline mr-2"
                    >
                      <path d="M18 11.5V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1.4"></path>
                      <path d="M14 10V8a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path>
                      <path d="M10 9.9V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"></path>
                      <path d="M6 14v0a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path>
                      <path d="M18 11v0a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0"></path>
                    </svg>
                    Course Profile
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Adjust your pace strategy based on the course elevation - slower on uphills, faster on downhills to maintain consistent effort.
                  </p>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-700 dark:text-orange-300 mb-2">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="inline mr-2"
                    >
                      <path d="M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0"></path>
                      <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"></path>
                    </svg>
                    The Wall
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Plan for slightly slower paces between 30-35km when many runners hit "the wall" due to glycogen depletion.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
