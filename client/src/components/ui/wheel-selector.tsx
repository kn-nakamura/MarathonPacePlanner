import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface WheelSelectorProps {
  options: string[] | number[];
  value: string | number;
  onChange: (value: string | number) => void;
  className?: string;
}

export function WheelSelector({ options, value, onChange, className }: WheelSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrolling, setScrolling] = useState(false);

  // Find the index of the currently selected value
  const selectedIndex = options.findIndex(option => option === value);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || scrolling) return;

    // Scroll to the selected option (50px per option)
    const targetScrollTop = selectedIndex * 50;
    container.scrollTop = targetScrollTop;
  }, [selectedIndex, scrolling]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!scrolling) return;
      
      // Calculate which option is centered based on scroll position
      const scrollPosition = container.scrollTop;
      const optionHeight = 50;
      const index = Math.round(scrollPosition / optionHeight);
      
      if (index >= 0 && index < options.length) {
        onChange(options[index]);
      }
    };

    const handleScrollEnd = () => {
      // Snap to the nearest option
      const scrollPosition = container.scrollTop;
      const optionHeight = 50;
      const index = Math.round(scrollPosition / optionHeight);
      
      if (index >= 0 && index < options.length) {
        container.scrollTop = index * optionHeight;
        setScrolling(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('scrollend', handleScrollEnd);
    
    // For browsers that don't support scrollend
    let scrollTimeout: NodeJS.Timeout;
    const handleScrollWithTimeout = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScrollEnd, 150);
    };
    
    container.addEventListener('scroll', handleScrollWithTimeout);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('scrollend', handleScrollEnd);
      container.removeEventListener('scroll', handleScrollWithTimeout);
      clearTimeout(scrollTimeout);
    };
  }, [options, onChange, scrolling]);

  return (
    <div className="relative h-40 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
      <div 
        ref={containerRef}
        className={cn(
          "wheel-selector scroll-smooth", 
          "overflow-y-auto h-40 scrollbar-none snap-y snap-mandatory",
          className
        )}
        onMouseDown={() => setScrolling(true)}
        onTouchStart={() => setScrolling(true)}
      >
        <div className="h-[50px]"></div> {/* Top spacer */}
        {options.map((option, index) => (
          <div 
            key={index}
            className={cn(
              "wheel-option snap-center h-[50px] flex items-center justify-center",
              "text-base font-medium",
              value === option 
                ? "text-primary-600 dark:text-primary-400" 
                : "text-gray-700 dark:text-gray-300"
            )}
          >
            {option}
          </div>
        ))}
        <div className="h-[50px]"></div> {/* Bottom spacer */}
      </div>
      
      {/* Selection indicator */}
      <div className="absolute left-0 right-0 top-1/2 -mt-[25px] h-[50px] pointer-events-none border-t border-b border-primary-200 dark:border-primary-700"></div>
    </div>
  );
}
