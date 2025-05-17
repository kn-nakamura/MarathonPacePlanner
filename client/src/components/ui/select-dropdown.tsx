import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Time Select Dropdowns Component
interface TimeSelectDropdownsProps {
  hours: string;
  minutes: string;
  seconds: string;
  onChangeHours: (value: string) => void;
  onChangeMinutes: (value: string) => void;
  onChangeSeconds: (value: string) => void;
}

export function TimeSelectDropdowns({
  hours,
  minutes,
  seconds,
  onChangeHours,
  onChangeMinutes,
  onChangeSeconds,
}: TimeSelectDropdownsProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 justify-center w-full max-w-xs sm:max-w-md mx-auto">
      <div className="w-1/3">
        <Select value={hours} onValueChange={onChangeHours}>
          <SelectTrigger className="w-full text-center text-xs sm:text-sm">
            <SelectValue placeholder="Hr" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 7 }, (_, i) => (
              <SelectItem key={`hour-${i}`} value={String(i)}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-1/3">
        <Select value={minutes} onValueChange={onChangeMinutes}>
          <SelectTrigger className="w-full text-center text-xs sm:text-sm">
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 60 }, (_, i) => (
              <SelectItem key={`min-${i}`} value={String(i).padStart(2, "0")}>
                {String(i).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-1/3">
        <Select value={seconds} onValueChange={onChangeSeconds}>
          <SelectTrigger className="w-full text-center text-xs sm:text-sm">
            <SelectValue placeholder="Sec" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 60 }, (_, i) => (
              <SelectItem key={`sec-${i}`} value={String(i).padStart(2, "0")}>
                {String(i).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Pace Select Dropdowns Component
interface PaceSelectDropdownsProps {
  minutes: string;
  seconds: string;
  onChangeMinutes: (value: string) => void;
  onChangeSeconds: (value: string) => void;
}

export function PaceSelectDropdowns({
  minutes,
  seconds,
  onChangeMinutes,
  onChangeSeconds,
}: PaceSelectDropdownsProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 justify-center w-full max-w-xs sm:max-w-md mx-auto">
      <div className="w-1/2">
        <Select value={minutes} onValueChange={onChangeMinutes}>
          <SelectTrigger className="w-full text-center text-xs sm:text-sm">
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 10 }, (_, i) => (
              <SelectItem key={`pace-min-${i}`} value={String(i + 3)}>
                {i + 3}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-1/2">
        <Select value={seconds} onValueChange={onChangeSeconds}>
          <SelectTrigger className="w-full text-center text-xs sm:text-sm">
            <SelectValue placeholder="Sec" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 60 }, (_, i) => (
              <SelectItem key={`pace-sec-${i}`} value={String(i).padStart(2, "0")}>
                {String(i).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Pace Dropdown for Segment Editor
interface PaceDropdownProps {
  pace: string;
  onPaceChange: (newPace: string) => void;
}

export function PaceDropdown({ pace, onPaceChange }: PaceDropdownProps) {
  const [min, sec] = pace.replace('/km', '').split(':');
  
  const handleMinChange = (newMin: string) => {
    onPaceChange(`${newMin}:${sec}/km`);
  };
  
  const handleSecChange = (newSec: string) => {
    onPaceChange(`${min}:${newSec}/km`);
  };
  
  return (
    <div className="flex space-x-1 items-center">
      <Select value={min} onValueChange={handleMinChange}>
        <SelectTrigger className="h-7 sm:h-8 w-10 sm:w-12 px-1 text-xs sm:text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 10 }, (_, i) => (
            <SelectItem key={`seg-min-${i}`} value={String(i + 3)}>
              {i + 3}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs sm:text-sm">:</span>
      <Select value={sec} onValueChange={handleSecChange}>
        <SelectTrigger className="h-7 sm:h-8 w-12 sm:w-14 px-1 text-xs sm:text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 60 }, (_, i) => (
            <SelectItem key={`seg-sec-${i}`} value={String(i).padStart(2, '0')}>
              {String(i).padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}