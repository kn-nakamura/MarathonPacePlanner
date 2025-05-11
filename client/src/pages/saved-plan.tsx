import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentTable } from '@/components/plan-table/segment-table';
import { SummaryCard } from '@/components/result-summary/summary-card';
import { Segment, PacePlan } from '@/models/pace';
import { usePaceConverter } from '@/hooks/use-pace-converter';
import { formatTime, calculateTotalTime, calculateAveragePace } from '@/utils/pace-utils';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Trash } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Link } from 'wouter';

export default function SavedPlan() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/saved-plans/:id');
  const planId = params?.id ? parseInt(params.id) : undefined;
  const { toast } = useToast();
  const { user } = useAuth();
  const { calculateTime } = usePaceConverter();
  
  const [planName, setPlanName] = useState<string>("");
  const [segments, setSegments] = useState<Segment[]>([]);
  
  // Fetch the pace plan
  const { data: plan, isLoading, error } = useQuery({
    queryKey: [`/api/pace-plans/${planId}`],
    enabled: !!planId && !!user
  });

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

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async (updatedPlan: Partial<PacePlan>) => {
      const response = await apiRequest('PUT', `/api/pace-plans/${planId}`, updatedPlan);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pace-plans/${planId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/pace-plans'] });
      toast({
        title: "Plan Updated",
        description: "Your pace strategy has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Plan",
        description: "There was an error updating your plan. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/pace-plans/${planId}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pace-plans'] });
      toast({
        title: "Plan Deleted",
        description: "Your pace strategy has been deleted successfully.",
      });
      setLocation('/');
    },
    onError: (error) => {
      toast({
        title: "Error Deleting Plan",
        description: "There was an error deleting your plan. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Load plan data when it's fetched
  useEffect(() => {
    if (plan) {
      setPlanName(plan.name);
      setSegments(plan.segments);
    }
  }, [plan]);

  // Calculate total time and average pace
  const totalTime = calculateTotalTime(segments);
  const averagePace = calculateAveragePace(totalTime, 42.2);

  // Handle saving the updated plan
  const handleSavePlan = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to save your pace plan.",
      });
      return;
    }
    
    // Create updated plan object
    const updatedPlan: Partial<PacePlan> = {
      name: planName,
      segments,
      totalTime
    };
    
    updatePlanMutation.mutate(updatedPlan);
  };

  // Handle deleting the plan
  const handleDeletePlan = () => {
    if (confirm("Are you sure you want to delete this plan? This action cannot be undone.")) {
      deletePlanMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4">Loading pace plan...</p>
        </div>
      </div>
    );
  }
  
  if (error || !plan) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-10">
          <h2 className="text-2xl font-semibold mb-2">Plan Not Found</h2>
          <p className="text-muted-foreground mb-4">The pace plan you're looking for couldn't be found.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h2 className="text-2xl font-display font-semibold">{planName}</h2>
        </div>
        
        <Button 
          variant="destructive" 
          size="sm"
          onClick={handleDeletePlan}
        >
          <Trash className="w-4 h-4 mr-2" /> Delete Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input & Summary */}
        <div className="lg:col-span-4 space-y-6">
          {/* Plan Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="planName">Plan Name</Label>
                  <Input 
                    id="planName" 
                    value={planName} 
                    onChange={(e) => setPlanName(e.target.value)} 
                    placeholder="Enter plan name"
                  />
                </div>
                <div>
                  <Label>Target Time</Label>
                  <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    {plan.targetTime}
                  </div>
                </div>
                <div>
                  <Label>Created At</Label>
                  <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <Button 
                className="mt-4 w-full" 
                onClick={handleSavePlan}
              >
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </CardContent>
          </Card>
          
          {/* Plan Summary Card */}
          <SummaryCard
            segments={segments}
            targetTime={plan.targetTime}
            totalTime={totalTime}
            averagePace={averagePace}
            onSavePlan={handleSavePlan}
          />
        </div>
        
        {/* Right Column: Segment Pace Editor */}
        <div className="lg:col-span-8 space-y-6">
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
        </div>
      </div>
    </div>
  );
}
