import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PacePlan } from '@/models/pace';

interface SavePlanCardProps {
  plan: Partial<PacePlan>;
  planName: string;
  onPlanNameChange: (name: string) => void;
}

export function SavePlanCard({ plan, planName, onPlanNameChange }: SavePlanCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Enter a name for your plan"
            value={planName}
            onChange={(e) => onPlanNameChange(e.target.value)}
            className="w-full"
          />
          <div className="flex justify-end gap-2">
            <Button type="button">Save Plan</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}