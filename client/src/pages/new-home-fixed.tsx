import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SegmentTable } from '@/components/plan-table/segment-table';
import { PaceChart } from '@/components/pace-chart/pace-chart';
import { PlanSummaryCard } from '@/components/result-summary/plan-summary-card';
import { ExportSegmentTable } from '@/components/pace-chart/export-segment-table';
import { TimeSelectDropdowns } from '@/components/ui/select-dropdown';
import { DEFAULT_SEGMENTS, Segment, PacePlan, RaceDistance, RACE_DISTANCES, generateSegments } from '@/models/pace';
import { usePaceConverter } from '@/hooks/use-pace-converter';
import { formatTime, calculateTotalTime, calculateAveragePace } from '@/utils/pace-utils';
import { useToast } from '@/hooks/use-toast';
import { BasicGpxUploader } from '@/components/gpx/basic-gpx-uploader';
import { toPng } from 'html-to-image';

export default function Home() {
  const [targetHours, setTargetHours] = useState<string>("3");
  const [targetMinutes, setTargetMinutes] = useState<string>("30");
  const [targetSeconds, setTargetSeconds] = useState<string>("00");
  const [segments, setSegments] = useState<Segment[]>([...DEFAULT_SEGMENTS]);
  const [planName, setPlanName] = useState<string>("");
  const [raceDistance, setRaceDistance] = useState<RaceDistance>("Full");
  const [ultraDistance, setUltraDistance] = useState<number>(100);
  const [splitStrategy, setSplitStrategy] = useState<number>(0); // 0 = even pace, negative = negative split, positive = positive split
  const { calculatePace, calculateTime } = usePaceConverter();
  const { toast } = useToast();
  const chartRef = useRef<HTMLDivElement>(null);
  
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
  
  // Time input change handlers
  const handleHoursChange = (hours: string) => {
    setTargetHours(hours);
    updateAveragePaceFromTime(hours, targetMinutes, targetSeconds);
  };
  
  const handleMinutesChange = (minutes: string) => {
    setTargetMinutes(minutes);
    updateAveragePaceFromTime(targetHours, minutes, targetSeconds);
  };
  
  const handleSecondsChange = (seconds: string) => {
    setTargetSeconds(seconds);
    updateAveragePaceFromTime(targetHours, targetMinutes, seconds);
  };
  
  // Calculate average pace from target time
  const updateAveragePaceFromTime = (hours: string, minutes: string, seconds: string) => {
    const timeString = `${hours}:${minutes}:${seconds}`;
    const distance = raceDistance === 'Ultra' ? ultraDistance : RACE_DISTANCES[raceDistance];
    const pace = calculatePace(timeString, distance);
    // setPace(pace);
  };
  
  // Handle race distance change
  const handleRaceDistanceChange = (newDistance: RaceDistance) => {
    setRaceDistance(newDistance);
    
    // Generate new segments for the selected distance
    const newSegments = generateSegments(newDistance, newDistance === 'Ultra' ? ultraDistance : undefined);
    setSegments(newSegments);
    
    // Update target time based on the new distance
    updateTargetTimeForDistance(newDistance);
  };
  
  // Update target time when distance changes (based on a consistent pace)
  const updateTargetTimeForDistance = (distance: RaceDistance) => {
    const currentTime = `${targetHours}:${targetMinutes}:${targetSeconds}`;
    const currentDistance = raceDistance === 'Ultra' ? ultraDistance : RACE_DISTANCES[raceDistance];
    
    // Calculate current pace
    const currentPace = calculatePace(currentTime, currentDistance);
    
    // Calculate new time based on new distance and current pace
    const newDistance = distance === 'Ultra' ? ultraDistance : RACE_DISTANCES[distance];
    const newTime = calculateTime(currentPace, newDistance);
    
    // Parse the new time
    const timeParts = newTime.split(':');
    if (timeParts.length === 3) {
      setTargetHours(timeParts[0]);
      setTargetMinutes(timeParts[1]);
      setTargetSeconds(timeParts[2]);
    } else if (timeParts.length === 2) {
      setTargetHours('0');
      setTargetMinutes(timeParts[0]);
      setTargetSeconds(timeParts[1]);
    }
  };
  
  // Generate pace plan based on user inputs
  const handleGeneratePlan = () => {
    // Get target time in HH:MM:SS format
    const targetTime = `${targetHours}:${targetMinutes}:${targetSeconds}`;
    
    // Calculate average pace
    const distanceKm = raceDistance === 'Ultra' ? ultraDistance : RACE_DISTANCES[raceDistance];
    const averagePace = calculatePace(targetTime, distanceKm);
    
    // Generate new segments with the calculated pace
    const newSegments = generateSegments(raceDistance, raceDistance === 'Ultra' ? ultraDistance : undefined);
    
    // Set the pace for each segment
    const updatedSegments = newSegments.map(segment => {
      const segmentDistance = parseFloat(segment.distance.split(' ')[0]);
      return {
        ...segment,
        targetPace: averagePace,
        customPace: averagePace,
        segmentTime: calculateTime(averagePace, segmentDistance)
      };
    });
    
    // Update segments state
    setSegments(updatedSegments);
    
    toast({
      title: 'Pace Plan Generated',
      description: `Created a new ${raceDistance} pace plan with a target time of ${targetTime}`,
    });
  };
  
  // Handle segment updates
  const handleUpdateSegment = (index: number, updatedSegment: Segment) => {
    const newSegments = [...segments];
    
    // If custom pace changed, recalculate segment time
    if (updatedSegment.customPace !== segments[index].customPace) {
      const segmentDistance = parseFloat(updatedSegment.distance.split(' ')[0]);
      updatedSegment.segmentTime = calculateTime(updatedSegment.customPace, segmentDistance);
    }
    
    newSegments[index] = updatedSegment;
    setSegments(newSegments);
  };
  
  // Update remaining segments with the same pace
  const handleUpdateRemainingSegments = (startIndex: number, pace: string) => {
    if (startIndex >= segments.length - 1) return;
    
    const newSegments = segments.map((segment, i) => {
      if (i <= startIndex) return segment;
      
      // Extract distance from segment name
      let distance;
      if (segment.distance.includes('km')) {
        distance = parseFloat(segment.distance.split(' ')[0]);
      } else {
        // If the distance is in the format "X-Y", handle it differently
        const match = segment.name.match(/(\d+)-(\d+)/);
        if (match) {
          distance = parseFloat(match[2]) - parseFloat(match[1]);
        } else {
          distance = 5; // Default to 5km if parsing fails
        }
      }
      
      return {
        ...segment,
        customPace: pace,
        segmentTime: calculateTime(pace, distance)
      };
    });
    
    setSegments(newSegments);
  };
  
  // Save the current plan
  const handleSavePlan = () => {
    const plan: PacePlan = {
      name: planName || `${raceDistance} Plan`,
      targetTime: `${targetHours}:${targetMinutes}:${targetSeconds}`,
      segments: segments,
      totalTime: calculateTotalTime(segments),
    };
    
    // Save to localStorage temporarily
    try {
      localStorage.setItem('marathonPacePlan', JSON.stringify(plan));
      
      toast({
        title: 'Plan Saved',
        description: 'Your pace plan has been saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'There was an error saving your plan',
        variant: 'destructive',
      });
    }
  };
  
  // Export chart as image
  const handleExportImage = async () => {
    if (chartRef.current) {
      try {
        const dataUrl = await toPng(chartRef.current);
        
        // Create a link element
        const link = document.createElement('a');
        link.download = `${raceDistance}-pace-plan.png`;
        link.href = dataUrl;
        link.click();
        
        toast({
          title: 'Export Successful',
          description: 'Pace chart has been exported as an image',
        });
      } catch (error) {
        toast({
          title: 'Export Failed',
          description: 'There was an error exporting the chart',
          variant: 'destructive',
        });
      }
    }
  };
  
  // Computed values
  const targetTime = `${targetHours}:${targetMinutes}:${targetSeconds}`;
  const totalTime = calculateTotalTime(segments);
  const distanceKm = raceDistance === 'Ultra' ? ultraDistance : RACE_DISTANCES[raceDistance];
  const averagePace = calculateAveragePace(totalTime, distanceKm);
  
  return (
    <div className="container mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Welcome, Runner!</h1>
        <p className="text-muted-foreground mt-2">
          Create, customize and save your marathon pace strategy
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Create Plan */}
          <div className="lg:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle>Create Pace Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="race-distance">Race Distance</Label>
                    <Select 
                      value={raceDistance} 
                      onValueChange={(value) => handleRaceDistanceChange(value as RaceDistance)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select race distance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5K">5K</SelectItem>
                        <SelectItem value="10K">10K</SelectItem>
                        <SelectItem value="Half">Half Marathon (21.1km)</SelectItem>
                        <SelectItem value="Full">Marathon (42.2km)</SelectItem>
                        <SelectItem value="Ultra">Ultra Marathon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {raceDistance === 'Ultra' && (
                    <div>
                      <Label htmlFor="ultra-distance">Distance (km)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="ultra-distance"
                          type="number"
                          min="50"
                          max="200" 
                          value={ultraDistance}
                          onChange={(e) => setUltraDistance(Number(e.target.value))}
                        />
                        <span className="text-muted-foreground">km</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Switch checked={true} disabled /> {/* Always set to target time for this version */}
                    <Label>Create from Target Time</Label>
                  </div>
                  
                  <div>
                    <Label>Target {raceDistance} Time</Label>
                    <div className="flex gap-2 mt-1.5">
                      <TimeSelectDropdowns
                        hours={targetHours}
                        minutes={targetMinutes}
                        seconds={targetSeconds}
                        onChangeHours={handleHoursChange}
                        onChangeMinutes={handleMinutesChange}
                        onChangeSeconds={handleSecondsChange}
                      />
                    </div>
                  </div>
                  
                  <Button className="w-full" onClick={handleGeneratePlan}>
                    Generate Pace Plan
                  </Button>
                  
                  <div>
                    <PlanSummaryCard
                      targetTime={targetTime}
                      totalTime={totalTime}
                      averagePace={averagePace}
                      segments={segments}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Save Plan */}
          <div className="lg:col-span-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <Input
                    placeholder="Enter a name for your plan"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full"
                  />
                  <div className="flex justify-end gap-2">
                    <Button onClick={handleSavePlan}>Save Plan</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Segment Editor - Full Width */}
        <Card>
          <CardContent className="p-0">
            <SegmentTable
              segments={segments}
              onUpdateSegment={handleUpdateSegment}
              onUpdateRemainingSegments={handleUpdateRemainingSegments}
              splitStrategy={{
                value: splitStrategy,
                onChange: setSplitStrategy
              }}
            />
            
            <div className="p-4 flex justify-end">
              <ExportSegmentTable
                segments={segments}
                targetTime={targetTime}
                totalTime={totalTime}
                averagePace={averagePace}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Pace Chart - Below Segment Editor */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>Pace Distribution</CardTitle>
              <Button
                variant="outline" 
                size="sm"
                className="h-8 text-xs"
                onClick={handleExportImage}
              >
                Save as Image
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={chartRef} className="pt-4">
              <PaceChart 
                segments={segments} 
                targetTime={targetTime}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* GPX Analysis - Full Width */}
        <Card>
          <CardHeader>
            <CardTitle>Terrain Analysis and Pace Optimization</CardTitle>
          </CardHeader>
          <CardContent>
            <BasicGpxUploader
              segments={segments}
              onUpdateSegments={setSegments}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}