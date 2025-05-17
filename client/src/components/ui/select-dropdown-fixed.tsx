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
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  onSecondsChange: (value: string) => void;
  disableSeconds?: boolean;
}

export function TimeSelectDropdowns({
  hours,
  minutes,
  seconds,
  onHoursChange,
  onMinutesChange,
  onSecondsChange,
  disableSeconds = false
}: TimeSelectDropdownsProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 justify-center w-full max-w-xs sm:max-w-md mx-auto">
      <div className="w-1/3">
        <Select value={hours} onValueChange={onHoursChange}>
          <SelectTrigger className="w-full text-center text-xs sm:text-sm">
            <SelectValue placeholder="Hr" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 73 }, (_, i) => (
              <SelectItem key={`hour-${i}`} value={String(i)}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-1/3">
        <Select value={minutes} onValueChange={onMinutesChange}>
          <SelectTrigger className="w-full text-center text-xs sm:text-sm">
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 60 }, (_, i) => (
              <SelectItem
                key={`min-${i}`}
                value={String(i).padStart(2, '0')}
              >
                {String(i).padStart(2, '0')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-1/3">
        <Select value={seconds} onValueChange={onSecondsChange} disabled={disableSeconds}>
          <SelectTrigger className="w-full text-center text-xs sm:text-sm">
            <SelectValue placeholder="Sec" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 60 }, (_, i) => (
              <SelectItem
                key={`sec-${i}`}
                value={String(i).padStart(2, '0')}
              >
                {String(i).padStart(2, '0')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Pace Select Dropdowns Component for MM:SS format
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
    <div className="flex items-center gap-2 justify-center">
      <div className="w-24">
        <Select value={minutes} onValueChange={onChangeMinutes}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 16 }, (_, i) => (
              <SelectItem key={`paceMin-${i}`} value={String(i)}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <span className="text-lg">:</span>
      <div className="w-24">
        <Select value={seconds} onValueChange={onChangeSeconds}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sec" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 60 }, (_, i) => (
              <SelectItem
                key={`paceSec-${i}`}
                value={String(i).padStart(2, '0')}
              >
                {String(i).padStart(2, '0')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}