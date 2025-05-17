import { useState, useEffect, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { SegmentTable } from '@/components/plan-table/segment-table';
import { PaceChart } from '@/components/pace-chart/pace-chart';
import { PlanSummaryCard } from '@/components/result-summary/plan-summary-card';
import { SavePlanCard } from '@/components/plan-table/save-plan-card';
import { ExportSegmentTable } from '@/components/pace-chart/export-segment-table';
import { TimeSelectDropdowns, PaceSelectDropdowns } from '@/components/ui/select-dropdown';
import { DEFAULT_SEGMENTS, Segment, PacePlan, RaceDistance, RACE_DISTANCES, generateSegments } from '@/models/pace';
import { usePaceConverter } from '@/hooks/use-pace-converter';
import { formatTime, calculateTotalTime, calculateAveragePace, paceToSeconds, secondsToPace, calculateSegmentTime } from '@/utils/pace-utils';
import { useToast } from '@/hooks/use-toast';
import { BasicGpxUploader } from '@/components/gpx/basic-gpx-uploader';

export default function Home() {
  const [targetHours, setTargetHours] = useState<string>("3");
  const [targetMinutes, setTargetMinutes] = useState<string>("30");
  const [targetSeconds, setTargetSeconds] = useState<string>("00");
  const [segments, setSegments] = useState<Segment[]>([...DEFAULT_SEGMENTS]);
  const [planName, setPlanName] = useState<string>("");
  const [raceDistance, setRaceDistance] = useState<RaceDistance>("Full");
  const [ultraDistance, setUltraDistance] = useState<number>(100);
  const [splitStrategy, setSplitStrategy] = useState<number>(0); // 0 = even pace, negative = negative split, positive = positive split
  
  // スプリット戦略を適用する効果
  useEffect(() => {
    // スプリット戦略が変更されたときにリアルタイムでペースを調整
    if (segments.length === 0 || splitStrategy === 0) return;
    
    const updatedSegments = segments.map((segment, index) => {
      // レース内の相対位置（0から1）
      const position = index / (segments.length - 1);
      
      // スプリット調整量（-1.0から1.0）に変換、中央が0
      const adjustment = (position - 0.5) * 2;
      
      // ペースを分:秒形式から秒に変換
      const paceStr = segment.targetPace.replace('/km', '');
      const [paceMin, paceSec] = paceStr.split(':').map(Number);
      const paceInSeconds = (paceMin * 60) + paceSec;
      
      // スプリット戦略による調整（ネガティブ=後半速く、ポジティブ=前半速く）
      const adjustmentInSeconds = -(adjustment * splitStrategy * paceInSeconds * 0.002);
      
      // 調整したペースを秒から分:秒形式に戻す
      const newPaceInSeconds = Math.max(1, paceInSeconds + adjustmentInSeconds);
      const newPaceMin = Math.floor(newPaceInSeconds / 60);
      const newPaceSec = Math.round(newPaceInSeconds % 60);
      
      const adjustedPace = `${newPaceMin}:${newPaceSec < 10 ? '0' + newPaceSec : newPaceSec}/km`;
      
      // セグメント時間も再計算
      const distance = parseFloat(segment.distance.split(' ')[0]);
      const segmentTime = calculateTime(adjustedPace, distance);
      
      return {
        ...segment,
        customPace: adjustedPace,
        segmentTime
      };
    });
    
    setSegments(updatedSegments);
  }, [splitStrategy]);
  
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
  
  // Format the target time
  const targetTime = `${targetHours}:${targetMinutes}:${targetSeconds}`;

  // Calculate total time and average pace based on selected race distance
  const totalTime = calculateTotalTime(segments);
  const distanceValue = raceDistance === 'Ultra' ? ultraDistance : RACE_DISTANCES[raceDistance]; 
  const averagePace = calculateAveragePace(totalTime, distanceValue);

  // 平均ペース入力用
  const [averagePaceInput, setAveragePaceInput] = useState<string>("");
  const [averagePaceMode, setAveragePaceMode] = useState<boolean>(false);
  
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
  
  // 平均ペースから目標タイムを更新する関数
  const handleAveragePaceChange = () => {
    if (averagePaceInput.includes(':')) {
      const [min, sec] = averagePaceInput.split(':').map(Number);
      
      if (!isNaN(min) && !isNaN(sec)) {
        // 精密な計算のため小数点以下を保持
        const paceSeconds = min * 60 + sec;
        // 総時間を計算
        const totalSeconds = paceSeconds * distanceValue;
        
        // 各単位に変換
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        
        setTargetHours(hours.toString());
        setTargetMinutes(minutes.toString().padStart(2, '0'));
        setTargetSeconds(seconds.toString().padStart(2, '0'));
      }
    }
  };
  
  // 入力モード切り替え
  const toggleInputMode = () => {
    setAveragePaceMode(!averagePaceMode);
    if (!averagePaceMode) {
      // ターゲットタイムから平均ペースを計算して初期値にセット
      const [hours, minutes, seconds] = targetTime.split(':').map(Number);
      const totalTargetSeconds = hours * 3600 + minutes * 60 + seconds;
      
      const paceSecondsPerKm = totalTargetSeconds / distanceValue;
      
      const paceMinutes = Math.floor(paceSecondsPerKm / 60);
      const paceSeconds = Math.round(paceSecondsPerKm % 60);
      setAveragePaceInput(`${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`);
    }
  };

  // Race distance handlers
  const handleRaceDistanceChange = (newDistance: RaceDistance) => {
    setRaceDistance(newDistance);
    
    // Generate new segments based on selected race distance
    const newSegments = generateSegments(newDistance, newDistance === 'Ultra' ? ultraDistance : undefined);
    setSegments(newSegments);
    
    // Adjust target time based on new distance
    updateTargetTimeForDistance(newDistance);
  };
  
  // Handle ultra distance change
  const handleUltraDistanceChange = (newDistance: number) => {
    setUltraDistance(newDistance);
    if (raceDistance === 'Ultra') {
      // Regenerate segments for ultra with new distance
      const newSegments = generateSegments('Ultra', newDistance);
      setSegments(newSegments);
    }
  };
  
  // Update target time based on selected distance
  const updateTargetTimeForDistance = (distance: RaceDistance) => {
    const distanceValue = distance === 'Ultra' ? ultraDistance : RACE_DISTANCES[distance];
    
    // Get current pace from marathon time
    const [hours, minutes, seconds] = targetTime.split(':').map(Number);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    // Get current distance to use as reference
    const currentDistance = RACE_DISTANCES[raceDistance === 'Ultra' ? 'Full' : raceDistance];
    const currentPacePerKm = totalSeconds / currentDistance;
    
    // Calculate new time for selected distance
    const newTotalSeconds = currentPacePerKm * distanceValue;
    
    // Convert to HH:MM:SS
    const newHours = Math.floor(newTotalSeconds / 3600);
    const newMinutes = Math.floor((newTotalSeconds % 3600) / 60);
    const newSeconds = Math.floor(newTotalSeconds % 60);
    
    // Update target time
    setTargetHours(newHours.toString());
    setTargetMinutes(newMinutes.toString().padStart(2, '0'));
    setTargetSeconds(newSeconds.toString().padStart(2, '0'));
  };

  // Generate pace plan based on user inputs
  const generatePlan = () => {
    // Calculate default pace
    const [hours, minutes, seconds] = targetTime.split(':').map(Number);
    const totalTargetSeconds = hours * 3600 + minutes * 60 + seconds;
    
    // Calculate average pace
    const distanceKm = raceDistance === 'Ultra' ? ultraDistance : RACE_DISTANCES[raceDistance];
    const paceSecondsPerKm = totalTargetSeconds / distanceKm;
    
    // Convert to MM:SS/km format
    const paceMinutes = Math.floor(paceSecondsPerKm / 60);
    const paceSeconds = Math.floor(paceSecondsPerKm % 60);
    const defaultPace = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
    
    // Create new segments with calculated pace based on race distance
    const newSegments = generateSegments(raceDistance, raceDistance === 'Ultra' ? ultraDistance : undefined)
      .map((segment, index) => {
        const segmentDistance = parseFloat(segment.distance.split(' ')[0]);
        
        // ここでスプリット戦略を適用
        let adjustedPace = defaultPace;
        let segmentTime = calculateTime(defaultPace, segmentDistance);
        
        // スプリット戦略が設定されている場合
        if (splitStrategy !== 0) {
          // レース内の相対位置（0から1）
          const position = index / (newSegments.length - 1);
          
          // スプリット調整量（-1.0から1.0）に変換、中央が0
          const adjustment = (position - 0.5) * 2;
          
          // ペースを分:秒形式から秒に変換
          const [paceMin, paceSec] = defaultPace.replace('/km','').split(':').map(Number);
          const paceInSeconds = (paceMin * 60) + paceSec;
          
          // スプリット戦略による調整（ネガティブ=後半速く、ポジティブ=前半速く）
          const adjustmentInSeconds = -(adjustment * splitStrategy * paceInSeconds * 0.002);
          
          // 調整したペースを秒から分:秒形式に戻す
          const newPaceInSeconds = Math.max(1, paceInSeconds + adjustmentInSeconds);
          const newPaceMin = Math.floor(newPaceInSeconds / 60);
          const newPaceSec = Math.round(newPaceInSeconds % 60);
          
          adjustedPace = `${newPaceMin}:${newPaceSec < 10 ? '0' + newPaceSec : newPaceSec}/km`;
          
          // セグメント時間も再計算
          segmentTime = calculateTime(adjustedPace, segmentDistance);
        }
        
        return {
          ...segment,
          targetPace: defaultPace,
          customPace: adjustedPace,
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
    const distance = parseFloat(updatedSegment.distance.split(' ')[0]);
    
    newSegments[index] = {
      ...updatedSegment,
      segmentTime: calculateTime(updatedSegment.customPace, distance)
    };
    setSegments(newSegments);
  };
  
  // Update pace for all remaining segments
  const handleUpdateRemainingSegments = (startIndex: number, pace: string) => {
    const newSegments = segments.map((segment, i) => {
      if (i >= startIndex) {
        const distance = parseFloat(segment.distance.split(' ')[0]);
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
    onError: (error: any) => {
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
      
      <div className="space-y-6">
        {/* セグメントエディター */}
        <Card>
          <CardHeader>
            <CardTitle>Segment Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* レース距離選択 */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={raceDistance === '5K' ? "default" : "outline"}
                size="sm"
                onClick={() => handleRaceDistanceChange('5K')}
              >
                5K
              </Button>
              <Button
                variant={raceDistance === '10K' ? "default" : "outline"}
                size="sm"
                onClick={() => handleRaceDistanceChange('10K')}
              >
                10K
              </Button>
              <Button
                variant={raceDistance === 'Half' ? "default" : "outline"}
                size="sm"
                onClick={() => handleRaceDistanceChange('Half')}
              >
                Half Marathon
              </Button>
              <Button
                variant={raceDistance === 'Full' ? "default" : "outline"}
                size="sm"
                onClick={() => handleRaceDistanceChange('Full')}
              >
                Full Marathon
              </Button>
              <Button
                variant={raceDistance === 'Ultra' ? "default" : "outline"}
                size="sm"
                onClick={() => handleRaceDistanceChange('Ultra')}
              >
                Ultra Marathon
              </Button>
            </div>
            
            {/* ウルトラマラソン距離入力 */}
            {raceDistance === 'Ultra' && (
              <div className="flex items-center gap-2">
                <Label htmlFor="ultraDistance">Distance (km): </Label>
                <Input
                  id="ultraDistance"
                  type="number"
                  value={ultraDistance}
                  min={42.2}
                  max={1000}
                  onChange={(e) => handleUltraDistanceChange(Number(e.target.value))}
                  className="max-w-[100px]"
                />
              </div>
            )}
            
            {/* 目標タイム or 平均ペース入力 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={averagePaceMode}
                  onCheckedChange={toggleInputMode}
                />
                <Label>{averagePaceMode ? 'Average Pace Mode' : 'Target Time Mode'}</Label>
              </div>
              
              {averagePaceMode ? (
                <div>
                  <Label>Average Pace (min/km):</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={averagePaceInput}
                      onChange={(e) => setAveragePaceInput(e.target.value)}
                      placeholder="4:30"
                      className="w-24"
                    />
                    <Button onClick={handleAveragePaceChange}>
                      Apply
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Target Time:</Label>
                  <div className="flex items-center gap-2">
                    <TimeSelectDropdowns
                      hours={targetHours}
                      minutes={targetMinutes}
                      seconds={targetSeconds}
                      onHoursChange={handleHoursChange}
                      onMinutesChange={handleMinutesChange}
                      onSecondsChange={handleSecondsChange}
                      disableSeconds={false}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* ペーシング戦略スライダー */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Pacing Strategy: {splitStrategy < 0 ? 'Negative Split' : splitStrategy > 0 ? 'Positive Split' : 'Even Pace'}</Label>
                <span className="text-sm text-muted-foreground">{splitStrategy}%</span>
              </div>
              <Slider
                min={-50}
                max={50}
                step={5}
                value={[splitStrategy]}
                onValueChange={(values) => setSplitStrategy(values[0])}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Faster Finish</span>
                <span>Even Pace</span>
                <span>Faster Start</span>
              </div>
            </div>
            
            <Button onClick={generatePlan} className="w-full">
              Generate Plan
            </Button>
            
            <SegmentTable 
              segments={segments} 
              onUpdateSegment={handleUpdateSegment}
              onUpdateRemainingSegments={handleUpdateRemainingSegments}
            />
          </CardContent>
        </Card>
        
        {/* ペース分布グラフ - セグメントエディターの下に配置 */}
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
        
        {/* GPXアップローダー - ペース分布グラフの下に配置 */}
        <Card>
          <CardHeader>
            <CardTitle>GPX Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <BasicGpxUploader
              segments={segments}
              onUpdateSegments={setSegments}
            />
          </CardContent>
        </Card>
        
        {/* 結果サマリー */}
        <PlanSummaryCard
          segments={segments}
          targetTime={targetTime}
          totalTime={totalTime}
          averagePace={averagePace}
        />
        
        {/* プラン保存 - 一番下に配置 */}
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
  );
}