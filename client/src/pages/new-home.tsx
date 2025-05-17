import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SegmentTable } from '@/components/plan-table/segment-table';
import { HorizontalPaceChart } from '@/components/pace-chart/horizontal-pace-chart';
import { PlanSummaryCard } from '@/components/result-summary/plan-summary-card';
import { ExportSegmentTable } from '@/components/pace-chart/export-segment-table';
import { ExportChart } from '@/components/pace-chart/export-chart';
import { TimeSelectDropdowns, PaceSelectDropdowns } from '@/components/ui/select-dropdown';
import { DEFAULT_SEGMENTS, Segment, PacePlan, RaceDistance, RACE_DISTANCES, generateSegments, SegmentAnalysis } from '@/models/pace';
import { usePaceConverter } from '@/hooks/use-pace-converter';
import { formatTime, calculateTotalTime, calculateAveragePace, paceToSeconds, secondsToPace, calculateSegmentTime } from '@/utils/pace-utils';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { BasicGpxUploader } from '@/components/gpx/basic-gpx-uploader';
import { toPng } from 'html-to-image';

export default function Home() {
  const [targetHours, setTargetHours] = useState<string>("3");
  const [targetMinutes, setTargetMinutes] = useState<string>("30");
  const [targetSeconds, setTargetSeconds] = useState<string>("00");
  // ベースとなるセグメント（ターゲットペースと距離情報のみ）
  const [baseSegments, setBaseSegments] = useState<Segment[]>([...DEFAULT_SEGMENTS]);
  // 表示用の派生セグメント（UI表示やエクスポート用）
  const [displaySegments, setDisplaySegments] = useState<Segment[]>([...DEFAULT_SEGMENTS]);
  const [planName, setPlanName] = useState<string>("");
  const [raceDistance, setRaceDistance] = useState<RaceDistance>("Full");
  const [ultraDistance, setUltraDistance] = useState<number>(100);
  const [splitStrategy, setSplitStrategy] = useState<number>(0); // 0 = even pace, negative = negative split, positive = positive split
  const [segmentAnalysis, setSegmentAnalysis] = useState<SegmentAnalysis[]>([]);
  const [gradientFactor, setGradientFactor] = useState<number>(0); // 0 = no effect, 1 = full effect
  
  // Derive表示用セグメントを計算する関数
  const calculateDisplaySegments = useCallback(() => {
    if (baseSegments.length === 0) return;
    
    const calculatedSegments = baseSegments.map((segment, index) => {
      // 基本情報の取得
      const position = index / (baseSegments.length - 1);
      const adjustment = (position - 0.5) * 2; // -1.0から1.0の範囲
      const distanceNum = parseFloat(segment.distance);
      
      // 1. ベースペースを秒に変換
      const basePaceSec = paceToSeconds(segment.targetPace);
      
      // 2. スプリット戦略による調整
      const splitAdjSec = (adjustment * splitStrategy * basePaceSec * 0.002);
      const paceAfterSplit = basePaceSec + splitAdjSec;
      
      // 3. 勾配による調整（勾配情報が利用可能な場合）
      let gradientAdjSec = 0;
      const segAnalysis = segmentAnalysis.find(a => a.segmentName === segment.name);
      
      if (segAnalysis && gradientFactor > 0) {
        // 勾配に基づくペース調整を計算
        gradientAdjSec = calculateGradientAdjustment(segAnalysis) * gradientFactor;
      }
      
      // 4. 最終ペースの計算
      const finalPaceSec = Math.max(1, paceAfterSplit + gradientAdjSec);
      const finalPace = secondsToPace(finalPaceSec);
      
      // 5. セグメント時間の計算
      const segTime = calculateSegmentTime(finalPace, distanceNum);
      
      return {
        ...segment,
        customPace: finalPace,
        segmentTime: segTime
      };
    });
    
    setDisplaySegments(calculatedSegments);
  }, [baseSegments, splitStrategy, gradientFactor, segmentAnalysis]);
  
  // セグメント変更時またはファクター変更時に表示用セグメントを再計算
  useEffect(() => {
    calculateDisplaySegments();
  }, [baseSegments, splitStrategy, gradientFactor, calculateDisplaySegments]);
  
  // 勾配に基づくペース調整を計算する関数
  const calculateGradientAdjustment = (info: SegmentAnalysis): number => {
    if (info.gradient > 4 || (info.gradient > 2 && info.elevGain > 100)) {
      return 30; // +30 sec/km for steep uphills
    } else if (info.gradient > 2 || (info.gradient > 1 && info.elevGain > 80)) {
      return 20; // +20 sec/km for moderate uphills
    } else if (info.gradient > 0.5 || (info.gradient > 0 && info.elevGain > 50)) {
      return 10; // +10 sec/km for gentle uphills
    } else if (info.gradient < -4 || (info.gradient < -2 && info.elevLoss > 100)) {
      return -15; // -15 sec/km for steep downhills
    } else if (info.gradient < -2) {
      return -8; // -8 sec/km for moderate downhills
    }
    return 0;
  };
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
        setBaseSegments(plan.segments);
        
        toast({
          title: 'Plan Restored',
          description: 'Your saved marathon pace plan has been loaded',
        });
      }
    } catch (err) {
      console.error('Error loading saved plan:', err);
    }
  }, [toast]);
  
  // プルダウン式の時間入力変更ハンドラー - 平均ペースも自動更新
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
  
  // 目標タイムから平均ペースを更新する関数 - 丸め誤差修正
  const updateAveragePaceFromTime = (hours: string, minutes: string, seconds: string) => {
    const h = parseInt(hours);
    const m = parseInt(minutes);
    const s = parseInt(seconds);
    
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
      // 精密な計算のため小数点以下を保持
      const totalSeconds = h * 3600 + m * 60 + s;
      const paceSecondsPerKm = totalSeconds / 42.195;
      
      // 例: 3:00:00 → 4:15/km (精密に計算)
      const paceMinutes = Math.floor(paceSecondsPerKm / 60);
      // 小数点以下を保持し、整数部分だけを表示
      const paceSeconds = Math.floor(paceSecondsPerKm % 60);
      
      setAveragePaceInput(`${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`);
    }
  };
  
  // Format the target time
  const targetTime = `${targetHours}:${targetMinutes}:${targetSeconds}`;

  // Calculate total time and average pace based on selected race distance - useEffect内で更新
  const [totalTime, setTotalTime] = useState<string>("");
  const [averagePace, setAveragePace] = useState<string>("");
  
  // 表示用セグメントが変更されたときに合計時間と平均ペースを再計算
  useEffect(() => {
    const newTotalTime = calculateTotalTime(displaySegments);
    const distanceValue = raceDistance === 'Ultra' ? ultraDistance : RACE_DISTANCES[raceDistance];
    const newAveragePace = calculateAveragePace(newTotalTime, distanceValue);
    
    setTotalTime(newTotalTime);
    setAveragePace(newAveragePace);
  }, [displaySegments, raceDistance, ultraDistance]);

  // 平均ペース入力用
  const [averagePaceInput, setAveragePaceInput] = useState<string>("");
  const [averagePaceMode, setAveragePaceMode] = useState<boolean>(false);
  
  // 平均ペース入力変更ハンドラー - 目標タイムも自動更新
  const handleAveragePaceChange = (e: ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    // MM:SS形式のみを許可
    if (/^(\d{0,2})(:|$)(\d{0,2})$/.test(input)) {
      setAveragePaceInput(input);
      
      // 平均ペースから目標タイムを更新
      updateTargetTimeFromPace(input);
    }
  };
  
  // 平均ペースから目標タイムを更新する関数 - 丸め誤差修正
  const updateTargetTimeFromPace = (paceInput: string) => {
    if (paceInput.includes(':')) {
      const [min, sec] = paceInput.split(':').map(Number);
      
      if (!isNaN(min) && !isNaN(sec)) {
        // 精密な計算のため小数点以下を保持
        const paceSeconds = min * 60 + sec;
        // 総時間を計算（42.195kmの正確な距離を使用）
        const totalSeconds = paceSeconds * 42.195;
        
        // 各単位に変換して整数部分のみを使用
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        
        // 例: 4:15/km → 3:00:00 (切り捨てで計算)
        setTargetHours(hours.toString());
        setTargetMinutes(minutes.toString().padStart(2, '0'));
        setTargetSeconds(seconds.toString().padStart(2, '0'));
      }
    }
  };
  
  // Race distance handlers
  const handleRaceDistanceChange = (newDistance: RaceDistance) => {
    setRaceDistance(newDistance);
    
    // Generate new segments based on selected race distance
    const newSegments = generateSegments(newDistance, newDistance === 'Ultra' ? ultraDistance : undefined);
    setBaseSegments(newSegments);
    
    // Adjust target time based on new distance
    updateTargetTimeForDistance(newDistance);
  };
  
  // Handle ultra distance change
  const handleUltraDistanceChange = (newDistance: number) => {
    setUltraDistance(newDistance);
    if (raceDistance === 'Ultra') {
      // Regenerate segments for ultra with new distance
      const newSegments = generateSegments('Ultra', newDistance);
      setBaseSegments(newSegments);
    }
  };
  
  // Update target time based on selected distance
  const updateTargetTimeForDistance = (distance: RaceDistance) => {
    const distanceValue = distance === 'Ultra' ? ultraDistance : RACE_DISTANCES[distance];
    
    // Only adjust time if we're not in average pace mode
    if (!averagePaceMode) {
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
    }
  };

  // 入力モード切り替え
  const toggleInputMode = () => {
    setAveragePaceMode(!averagePaceMode);
    if (!averagePaceMode) {
      // ターゲットタイムから平均ペースを計算して初期値にセット
      const [hours, minutes, seconds] = targetTime.split(':').map(Number);
      const totalTargetSeconds = hours * 3600 + minutes * 60 + seconds;
      
      // Get the current distance value
      const distanceValue = raceDistance === 'Ultra' ? ultraDistance : RACE_DISTANCES[raceDistance];
      const paceSecondsPerKm = totalTargetSeconds / distanceValue;
      
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
      
      // 正確なペース計算 - 選択した距離に基づいて計算
      const distanceValue = raceDistance === 'Ultra' ? ultraDistance : RACE_DISTANCES[raceDistance];
      const paceSecondsPerKm = totalTargetSeconds / distanceValue;
      
      // Convert to MM:SS/km format
      const paceMinutes = Math.floor(paceSecondsPerKm / 60);
      const paceSeconds = Math.floor(paceSecondsPerKm % 60); // roundではなくfloorを使う
      defaultPace = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
    }
    
    // Create new base segments with calculated pace based on race distance
    const newBaseSegments = generateSegments(raceDistance, raceDistance === 'Ultra' ? ultraDistance : undefined).map((segment, index) => {
      let segmentDistance: number;
      
      // Different segment calculation based on race type
      if (raceDistance === '5K' || raceDistance === '10K') {
        segmentDistance = 1; // 1km segments for short races
      } else if (raceDistance === 'Half' || raceDistance === 'Full') {
        // For half and full marathon
        const totalSegments = generateSegments(raceDistance).length;
        if (index === totalSegments - 1) {
          // Calculate final segment distance (might be partial)
          const totalDistance = raceDistance === 'Half' ? 21.1 : 42.195;
          const remainingDistance = totalDistance - (5 * (totalSegments - 1));
          segmentDistance = Math.max(0.1, remainingDistance);
        } else {
          segmentDistance = 5; // 5km segments
        }
      } else {
        // Ultra marathon
        const totalSegments = generateSegments(raceDistance, ultraDistance).length;
        if (index === totalSegments - 1) {
          // Calculate final segment distance (might be partial)
          const remainingDistance = ultraDistance - (10 * (totalSegments - 1));
          segmentDistance = Math.max(0.1, remainingDistance);
        } else {
          segmentDistance = 10; // 10km segments
        }
      }
      
      // ベースセグメントにはデフォルトペースのみを設定
      // 調整（スプリット戦略と勾配）はcalculateDisplaySegmentsで適用
      const segmentTime = calculateSegmentTime(defaultPace, segmentDistance);
      
      return {
        ...segment,
        targetPace: defaultPace,
        customPace: defaultPace,
        segmentTime
      };
    });
    
    setBaseSegments(newBaseSegments);
    
    toast({
      title: 'Plan Generated',
      description: `Created plan with target time ${targetTime} (${defaultPace})`,
    });
  };
  
  // Update segment data - ベースセグメントを更新（表示用セグメントは自動的に再計算される）
  const handleUpdateSegment = (index: number, updatedSegment: Segment) => {
    const newBaseSegments = [...baseSegments];
    // カスタムペースがターゲットペースにもなる
    newBaseSegments[index] = {
      ...baseSegments[index],
      targetPace: updatedSegment.customPace,
    };
    setBaseSegments(newBaseSegments);
  };
  
  // Update pace for all remaining segments
  const handleUpdateRemainingSegments = (startIndex: number, pace: string) => {
    const newBaseSegments = baseSegments.map((segment, i) => {
      if (i >= startIndex) {
        return {
          ...segment,
          targetPace: pace
        };
      }
      return segment;
    });
    
    setBaseSegments(newBaseSegments);
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
      segments: displaySegments,  // 表示用セグメントを使用
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
      
      {/* 単一カラムレイアウトに変更 */}
      <div className="space-y-6">
        {/* セグメントエディター */}
        <Card>
          <CardHeader>
            <CardTitle>Create Pace Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Race Distance Selector */}
            <div className="mb-6">
              <Label htmlFor="race-distance" className="mb-2 block">Race Distance</Label>
              <div className="flex items-center gap-4">
                <Select 
                  value={raceDistance} 
                  onValueChange={(value) => handleRaceDistanceChange(value as RaceDistance)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Distance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5K">5K</SelectItem>
                    <SelectItem value="10K">10K</SelectItem>
                    <SelectItem value="Half">Half Marathon (21.1km)</SelectItem>
                    <SelectItem value="Full">Marathon (42.2km)</SelectItem>
                    <SelectItem value="Ultra">Ultra Marathon</SelectItem>
                  </SelectContent>
                </Select>
                
                {raceDistance === 'Ultra' && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="ultra-distance">Distance (km):</Label>
                    <Input
                      id="ultra-distance"
                      type="number"
                      min="50"
                      max="200"
                      value={ultraDistance}
                      onChange={(e) => handleUltraDistanceChange(Number(e.target.value))}
                      className="w-[100px]"
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Input Mode Toggle */}
            <div className="flex items-center mb-6 space-x-2">
              <Switch 
                id="input-mode" 
                checked={averagePaceMode}
                onCheckedChange={toggleInputMode}
              />
              <Label htmlFor="input-mode">
                {averagePaceMode ? "Create from Average Pace" : "Create from Target Time"}
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
                segments={displaySegments}
                targetTime={targetTime}
                totalTime={totalTime}
                averagePace={averagePace}
              />
            </div>
            
            {/* Segment Editor */}
            <SegmentTable
              segments={displaySegments}
              onUpdateSegment={handleUpdateSegment}
              onUpdateRemainingSegments={handleUpdateRemainingSegments}
              splitStrategy={{
                value: splitStrategy,
                onChange: setSplitStrategy
              }}
            />
            
            <div className="mt-4 flex justify-end">
              <ExportSegmentTable
                segments={displaySegments}
                targetTime={targetTime}
                totalTime={totalTime}
                averagePace={averagePace}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* ペース分布グラフ - セグメントエディターの下に配置 */}
        <Card>
          <CardHeader>
            <CardTitle>Pace Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalPaceChart 
              segments={displaySegments}
            />
          </CardContent>
        </Card>
        
        {/* GPX Elevation Analysis - ペース分布グラフの下に配置 */}
        <Card>
          <CardHeader>
            <CardTitle>Elevation Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <BasicGpxUploader
              segments={baseSegments}
              onUpdateSegments={setBaseSegments}
              onSegmentAnalysisReady={setSegmentAnalysis}
              gradientFactor={gradientFactor}
              onGradientFactorChange={setGradientFactor}
            />
          </CardContent>
        </Card>
        

      </div>
    </div>
  );
}