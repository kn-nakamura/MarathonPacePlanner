import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SegmentTable } from '@/components/plan-table/segment-table';
import { PaceChart } from '@/components/pace-chart/pace-chart';
import { PlanSummaryCard } from '@/components/result-summary/plan-summary-card';
import { ExportSegmentTable } from '@/components/pace-chart/export-segment-table';
import { ExportChart } from '@/components/pace-chart/export-chart';
import { TimeSelectDropdowns, PaceSelectDropdowns } from '@/components/ui/select-dropdown';
import { DEFAULT_SEGMENTS, Segment, PacePlan } from '@/models/pace';
import { usePaceConverter } from '@/hooks/use-pace-converter';
import { formatTime, calculateTotalTime, calculateAveragePace } from '@/utils/pace-utils';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';

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
  
  // プルダウン式の時間入力変更ハンドラー
  const handleHoursChange = (hours: string) => {
    setTargetHours(hours);
  };
  
  const handleMinutesChange = (minutes: string) => {
    setTargetMinutes(minutes);
  };
  
  const handleSecondsChange = (seconds: string) => {
    setTargetSeconds(seconds);
  };
  
  // Format the target time
  const targetTime = `${targetHours}:${targetMinutes}:${targetSeconds}`;

  // Calculate total time and average pace
  const totalTime = calculateTotalTime(segments);
  const averagePace = calculateAveragePace(totalTime, 42.2);

  // 平均ペース入力用
  const [averagePaceInput, setAveragePaceInput] = useState<string>("");
  const [averagePaceMode, setAveragePaceMode] = useState<boolean>(false);
  
  // 平均ペース入力変更ハンドラー
  const handleAveragePaceChange = (e: ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    // MM:SS形式のみを許可
    if (/^(\d{0,2})(:|$)(\d{0,2})$/.test(input)) {
      setAveragePaceInput(input);
    }
  };
  
  // 入力モード切り替え
  const toggleInputMode = () => {
    setAveragePaceMode(!averagePaceMode);
    if (!averagePaceMode) {
      // ターゲットタイムから平均ペースを計算して初期値にセット
      const [hours, minutes, seconds] = targetTime.split(':').map(Number);
      const totalTargetSeconds = hours * 3600 + minutes * 60 + seconds;
      const paceSecondsPerKm = totalTargetSeconds / 42.195;
      const paceMinutes = Math.floor(paceSecondsPerKm / 60);
      const paceSeconds = Math.round(paceSecondsPerKm % 60);
      setAveragePaceInput(`${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`);
    }
  };

  // Generate plan based on target time or average pace
  const generatePlan = () => {
    // Calculate default pace
    let defaultPace: string;
    
    // 平均ペース入力モードの場合
    if (averagePaceMode && averagePaceInput) {
      // 平均ペースから直接プランを生成
      defaultPace = averagePaceInput;
      if (!defaultPace.includes('/')) {
        defaultPace = `${defaultPace}/km`;
      }
      
      // フォーマットを整える（例：4:8を4:08に）
      const [min, sec] = defaultPace.split('/')[0].split(':');
      defaultPace = `${min}:${sec.padStart(2, '0')}/km`;
    }
    // ターゲットタイム入力の場合
    else {
      // Calculate default pace from target time
      // First calculate the total seconds for the target time
      const [hours, minutes, seconds] = targetTime.split(':').map(Number);
      const totalTargetSeconds = hours * 3600 + minutes * 60 + seconds;
      
      // 正確なペース計算（例：3:30:00 → 4:58/km）
      const paceSecondsPerKm = totalTargetSeconds / 42.195;
      
      // Convert to MM:SS/km format
      const paceMinutes = Math.floor(paceSecondsPerKm / 60);
      const paceSeconds = Math.round(paceSecondsPerKm % 60);
      defaultPace = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
    }
    
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
        segmentTime
      };
    });
    
    setSegments(newSegments);
    
    toast({
      title: 'Plan Generated',
      description: `Created plan with target time ${targetTime} (${defaultPace})`,
    });
  };
  
  // Update segment data
  const handleUpdateSegment = (index: number, updatedSegment: Segment) => {
    const newSegments = [...segments];
    newSegments[index] = {
      ...updatedSegment,
      segmentTime: calculateTime(updatedSegment.customPace, 
        index === segments.length - 1 ? 2.2 : 5) // Last segment is 2.2km
    };
    setSegments(newSegments);
  };
  
  // Update pace for all remaining segments
  const handleUpdateRemainingSegments = (startIndex: number, pace: string) => {
    const newSegments = segments.map((segment, i) => {
      if (i >= startIndex) {
        const distance = i === segments.length - 1 ? 2.195 : 5;
        return {
          ...segment,
          customPace: pace,
          segmentTime: calculateTime(pace, distance)
        };
      }
      return segment;
    });
    
    setSegments(newSegments);
  };
  
  // Mutation for saving plan
  const savePlanMutation = useMutation({
    mutationFn: async (plan: PacePlan) => {
      // Local save only for now
      try {
        localStorage.setItem('marathonPacePlan', JSON.stringify(plan));
        return true;
      } catch (error) {
        throw new Error('Failed to save plan locally');
      }
    },
    onSuccess: () => {
      toast({
        title: 'Plan Saved',
        description: 'Your marathon pace plan has been saved to your browser',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save plan',
        variant: 'destructive',
      });
    }
  });
  
  // Handle save plan
  const handleSavePlan = () => {
    const plan: PacePlan = {
      name: planName || `Marathon Plan (${targetTime})`,
      targetTime,
      segments,
      totalTime,
      createdAt: new Date()
    };
    
    savePlanMutation.mutate(plan);
  };

  // セグメントテーブルの参照は不要になりました
  // ExportSegmentTableコンポーネントが内部で処理します

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
          Welcome, Runner!
        </h1>
        <p className="text-xl text-muted-foreground">
          Create, customize and save your marathon pace strategy
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Generator Card */}
          <Card>
            <CardHeader>
              <CardTitle>ペースプラン生成</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center mb-6 space-x-2">
                <Switch 
                  id="input-mode" 
                  checked={averagePaceMode}
                  onCheckedChange={toggleInputMode}
                />
                <Label htmlFor="input-mode">
                  {averagePaceMode ? "平均ペースから作成" : "目標タイムから作成"}
                </Label>
              </div>
            
              {averagePaceMode ? (
                // 平均ペース入力
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-4">Average Pace Input</h2>
                  <PaceSelectDropdowns
                    minutes={averagePaceInput.split(':')[0] || '4'}
                    seconds={averagePaceInput.split(':')[1] || '00'}
                    onChangeMinutes={(val) => {
                      const seconds = averagePaceInput.split(':')[1] || '00';
                      setAveragePaceInput(`${val}:${seconds}`);
                    }}
                    onChangeSeconds={(val) => {
                      const minutes = averagePaceInput.split(':')[0] || '4';
                      setAveragePaceInput(`${minutes}:${val}`);
                    }}
                  />
                  <div className="flex justify-center mt-6">
                    <Button onClick={generatePlan} className="w-full">
                      Generate Pace Plan
                    </Button>
                  </div>
                </div>
              ) : (
                // 目標タイム入力
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-4">Target Marathon Time</h2>
                  <div className="mb-6">
                    <TimeSelectDropdowns
                      hours={targetHours}
                      minutes={targetMinutes}
                      seconds={targetSeconds}
                      onChangeHours={handleHoursChange}
                      onChangeMinutes={handleMinutesChange}
                      onChangeSeconds={handleSecondsChange}
                    />
                  </div>
                  <div className="flex justify-center mt-6">
                    <Button onClick={generatePlan} className="w-full">
                      Generate Pace Plan
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Plan Summary */}
              <div className="mb-6">
                <PlanSummaryCard
                  segments={segments}
                  targetTime={targetTime}
                  totalTime={totalTime}
                  averagePace={averagePace}
                />
              </div>
              
              {/* Segment Editor */}
              <SegmentTable
                segments={segments}
                onUpdateSegment={handleUpdateSegment}
                onUpdateRemainingSegments={handleUpdateRemainingSegments}
              />
              
              <div className="mt-4 flex justify-end">
                <ExportSegmentTable
                  segments={segments}
                  targetTime={targetTime}
                  totalTime={totalTime}
                  averagePace={averagePace}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Simple Save Button */}
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
        
        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Pace Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Pace Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <PaceChart 
                segments={segments}
                targetTime={targetTime}
              />
            </CardContent>
          </Card>
          
          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Running Strategy Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                      <circle cx="12" cy="13" r="3"></circle>
                    </svg>
                    Race Pacing
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Run the first 10km slightly conservatively, maintain target pace through the middle, and increase pace in the final 7km if you have the energy.
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
                      <path d="M18 11.5V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1.4"></path>
                      <path d="M14 10V8a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path>
                      <path d="M10 9.9V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"></path>
                      <path d="M6 14v0a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path>
                      <path d="M18 11v0a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0"></path>
                    </svg>
                    Course Profile
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Adjust your pace strategy to match elevation changes - slow down on uphills, speed up slightly on downhills, and maintain consistent effort throughout.
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
                    Plan a slightly slower pace during the 30-35km range where many runners hit "the wall" due to glycogen depletion. Proper fueling helps minimize this effect.
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