import { useState, useEffect, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SegmentTable } from '@/components/plan-table/segment-table';
import { SummaryCard } from '@/components/result-summary/summary-card';
import { PaceChart } from '@/components/pace-chart/pace-chart';
import { ExportImage } from '@/components/pace-chart/export-image';
import { DEFAULT_SEGMENTS, Segment, PacePlan } from '@/models/pace';
import { usePaceConverter } from '@/hooks/use-pace-converter';
import { formatTime, calculateTotalTime, calculateAveragePace } from '@/utils/pace-utils';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [targetHours, setTargetHours] = useState<string>("3");
  const [targetMinutes, setTargetMinutes] = useState<string>("30");
  const [targetSeconds, setTargetSeconds] = useState<string>("00");
  const [segments, setSegments] = useState<Segment[]>([...DEFAULT_SEGMENTS]);
  const [planName, setPlanName] = useState<string>("");
  const { calculatePace, calculateTime } = usePaceConverter();
  const { toast } = useToast();
  
  // Load saved plan from localStorage on component mount
  useEffect(() => {
    try {
      const savedPlan = localStorage.getItem('marathonPacePlan');
      if (savedPlan) {
        const plan = JSON.parse(savedPlan);
        
        // Parse target time
        const [hours, minutes, seconds] = plan.targetTime.split(':');
        setTargetHours(hours);
        setTargetMinutes(minutes);
        setTargetSeconds(seconds);
        
        // Set segments
        setSegments(plan.segments);
        
        toast({
          title: 'Plan Restored',
          description: 'Your saved marathon pace plan has been loaded',
        });
      }
    } catch (err) {
      console.error('Error loading saved plan:', err);
    }
  }, [toast]);
  
  // Handle manual input for time values
  const handleHoursChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;
    setTargetHours(value);
  };
  
  const handleMinutesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;
    if (value && Number(value) >= 0 && Number(value) <= 59) {
      setTargetMinutes(value.padStart(2, '0'));
    }
  };
  
  const handleSecondsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;
    if (value && Number(value) >= 0 && Number(value) <= 59) {
      setTargetSeconds(value.padStart(2, '0'));
    }
  };
  
  // Format the target time
  const targetTime = `${targetHours}:${targetMinutes}:${targetSeconds}`;

  // Calculate total time and average pace
  const totalTime = calculateTotalTime(segments);
  const averagePace = calculateAveragePace(totalTime, 42.2);

  // Generate plan based on target time
  const generatePlan = () => {
    // Calculate default pace from target time
    // First calculate the total seconds for the target time
    const [hours, minutes, seconds] = targetTime.split(':').map(Number);
    const totalTargetSeconds = hours * 3600 + minutes * 60 + seconds;
    
    // Apply a slight buffer to ensure we finish under target time (0.5% faster)
    const bufferFactor = 0.995;
    const adjustedTotalSeconds = totalTargetSeconds * bufferFactor;
    
    // Calculate pace in seconds per km
    const paceSecondsPerKm = adjustedTotalSeconds / 42.2;
    
    // Convert to MM:SS/km format
    const paceMinutes = Math.floor(paceSecondsPerKm / 60);
    const paceSeconds = Math.round(paceSecondsPerKm % 60);
    const defaultPace = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
    
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

  // Handle saving the current plan
  const handleSavePlan = () => {
    // Generate a name if none was provided
    const name = planName || `Marathon Plan ${targetTime}`;
    
    try {
      // Create the plan object
      const plan: PacePlan = {
        name,
        targetTime,
        segments,
        totalTime
      };
      
      // Convert plan to JSON for local storage
      const planJson = JSON.stringify(plan);
      
      // Save to local storage instead of server
      localStorage.setItem(`pace-plan-${Date.now()}`, planJson);
      
      toast({
        title: "Plan Saved",
        description: "Your pace strategy has been saved to your browser.",
      });
    } catch (error) {
      toast({
        title: "Error Saving Plan",
        description: "There was an error saving your plan. Please try again.",
        variant: "destructive",
      });
      console.error('Error saving plan:', error);
    }
  };

  // Hours, minutes, seconds options for selects
  const hoursOptions = Array.from({ length: 7 }, (_, i) => i.toString());
  // Minutes options from 0 to 59 (1 minute increments)
  const minutesOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  // Seconds options from 0 to 59 (1 second increments)
  const secondsOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Welcome Section */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-display font-semibold mb-2">Welcome, Runner!</h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Create, customize and save your marathon pace strategy below.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: Input & Summary */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">
          {/* Target Time Input Card */}
          <Card className="overflow-hidden">
            <CardHeader className="px-4 py-4 sm:p-6">
              <CardTitle className="text-lg">Target Marathon Time</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
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
          

        </div>
        
        {/* Right Column: Segment Pace Editor */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6">
          {/* Hero Section */}
          <div className="relative rounded-xl overflow-hidden h-40 sm:h-56 md:h-64">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 to-blue-600/80 flex items-center">
              <div className="px-4 sm:px-6 md:px-10 py-4 text-white">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold">Pace Strategy</h2>
                <p className="mt-1 sm:mt-2 text-sm sm:text-base max-w-md">Fine-tune your segment paces to achieve your marathon goal</p>
              </div>
            </div>
          </div>

          {/* Segments Editor - Mobile Responsive */}
          <div className="overflow-x-auto">
            <SegmentTable 
              segments={segments}
              onUpdateSegment={handleUpdateSegment}
              onUpdateRemainingSegments={handleUpdateRemainingSegments}
            />
          </div>

          {/* Pace Distribution Chart - Mobile Responsive */}
          <Card className="overflow-hidden">
            <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6">
              <PaceChart 
                segments={segments}
                targetTime={targetTime}
              />
            </CardContent>
          </Card>
          
          {/* Export Plan as Image - Mobile Responsive */}
          <Card className="overflow-hidden">
            <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6">
              <ExportImage 
                segments={segments}
                targetTime={targetTime}
                totalTime={totalTime}
                averagePace={averagePace}
              />
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
