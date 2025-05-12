import { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface WheelOption {
  value: string | number;
  label?: string;
}

interface WheelSelectorProps {
  options: WheelOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  minWidth?: string;
}

export function WheelSelector({
  options,
  value,
  onChange,
  label,
  minWidth = '3rem'
}: WheelSelectorProps) {
  const currentIndex = options.findIndex(opt => opt.value.toString() === value.toString());
  
  const incrementValue = () => {
    const nextIndex = (currentIndex + 1) % options.length;
    onChange(options[nextIndex].value);
  };
  
  const decrementValue = () => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    onChange(options[prevIndex].value);
  };
  
  return (
    <div className="space-y-1">
      {label && <div className="text-center text-sm font-medium text-muted-foreground">{label}</div>}
      <div className="relative mx-auto" style={{ minWidth }}>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={decrementValue} 
          className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10 rounded-full h-6 w-6"
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        
        <div className="flex items-center justify-center h-12 border border-gray-300 dark:border-gray-600 rounded-md">
          <span className="text-2xl font-bold">{
            options[currentIndex]?.label || options[currentIndex]?.value || value
          }</span>
        </div>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={incrementValue} 
          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10 rounded-full h-6 w-6"
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface TimeWheelSelectorProps {
  hours?: number;
  minutes?: number;
  seconds?: number;
  onChangeHours?: (hours: number) => void;
  onChangeMinutes?: (minutes: number) => void;
  onChangeSeconds?: (seconds: number) => void;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
}

export function TimeWheelSelector({
  hours = 0,
  minutes = 0,
  seconds = 0,
  onChangeHours,
  onChangeMinutes,
  onChangeSeconds,
  showHours = true,
  showMinutes = true,
  showSeconds = true
}: TimeWheelSelectorProps) {
  // Generate options
  const hourOptions = Array.from({ length: 10 }, (_, i) => ({
    value: i,
    label: i.toString()
  }));
  
  const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0')
  }));
  
  const secondOptions = Array.from({ length: 60 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0')
  }));
  
  return (
    <div className="grid grid-cols-3 gap-2">
      {showHours && onChangeHours && (
        <WheelSelector
          options={hourOptions}
          value={hours}
          onChange={(val) => onChangeHours(Number(val))}
          label="時間"
        />
      )}
      
      {showMinutes && onChangeMinutes && (
        <WheelSelector
          options={minuteOptions}
          value={minutes}
          onChange={(val) => onChangeMinutes(Number(val))}
          label="分"
        />
      )}
      
      {showSeconds && onChangeSeconds && (
        <WheelSelector
          options={secondOptions}
          value={seconds}
          onChange={(val) => onChangeSeconds(Number(val))}
          label="秒"
        />
      )}
    </div>
  );
}