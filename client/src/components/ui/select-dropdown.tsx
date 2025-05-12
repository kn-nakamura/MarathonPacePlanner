import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectDropdownProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
}

export function SelectDropdown({
  label,
  options,
  value,
  onChange,
  className,
  triggerClassName
}: SelectDropdownProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger 
          id={label.toLowerCase().replace(/\s+/g, '-')}
          className={cn("w-full", triggerClassName)}
        >
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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
  onChangeSeconds
}: TimeSelectDropdownsProps) {
  // Generate options
  const hourOptions = Array.from({ length: 10 }, (_, i) => ({
    value: i.toString(),
    label: i.toString()
  }));
  
  const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
    value: i.toString().padStart(2, '0'),
    label: i.toString().padStart(2, '0')
  }));
  
  const secondOptions = Array.from({ length: 60 }, (_, i) => ({
    value: i.toString().padStart(2, '0'),
    label: i.toString().padStart(2, '0')
  }));
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <SelectDropdown
        label="Hours"
        options={hourOptions}
        value={hours}
        onChange={onChangeHours}
      />
      <SelectDropdown
        label="Minutes"
        options={minuteOptions}
        value={minutes}
        onChange={onChangeMinutes}
      />
      <SelectDropdown
        label="Seconds"
        options={secondOptions}
        value={seconds}
        onChange={onChangeSeconds}
      />
    </div>
  );
}

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
  onChangeSeconds
}: PaceSelectDropdownsProps) {
  // Generate options for pace
  const minuteOptions = Array.from({ length: 8 }, (_, i) => ({
    value: (i + 3).toString(), // Start from 3 minutes
    label: (i + 3).toString()
  }));
  
  const secondOptions = Array.from({ length: 60 }, (_, i) => ({
    value: i.toString().padStart(2, '0'),
    label: i.toString().padStart(2, '0')
  }));
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <SelectDropdown
        label="Minutes"
        options={minuteOptions}
        value={minutes}
        onChange={onChangeMinutes}
      />
      <SelectDropdown
        label="Seconds"
        options={secondOptions}
        value={seconds}
        onChange={onChangeSeconds}
      />
    </div>
  );
}