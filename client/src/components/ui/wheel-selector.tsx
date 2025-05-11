import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface WheelSelectorProps {
  options: string[] | number[];
  value: string | number;
  onChange: (value: string | number) => void;
  className?: string;
  itemHeight?: number;
  height?: number;
}

export function WheelSelector({ 
  options, 
  value, 
  onChange, 
  className,
  itemHeight = 50,
  height = 250 
}: WheelSelectorProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrolling, setScrolling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // Find the index of the currently selected value
  const selectedIndex = options.findIndex(option => option === value);

  // Scroll to the selected option on initial render and when value changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || scrolling || isDragging) return;

    // Scroll to the selected option using the itemHeight property
    const targetScrollTop = selectedIndex * itemHeight;
    container.scrollTop = targetScrollTop;
  }, [selectedIndex, scrolling, isDragging]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartY(e.clientY);
    const container = containerRef.current;
    if (container) {
      setScrollTop(container.scrollTop);
    }
    setScrolling(true);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    const container = containerRef.current;
    if (container) {
      setScrollTop(container.scrollTop);
    }
    setScrolling(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const container = containerRef.current;
    if (!container) return;
    
    const deltaY = e.clientY - startY;
    container.scrollTop = scrollTop - deltaY;
    
    // Calculate which option is centered
    updateSelectedOption();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const container = containerRef.current;
    if (!container) return;
    
    const deltaY = e.touches[0].clientY - startY;
    container.scrollTop = scrollTop - deltaY;
    
    // Calculate which option is centered
    updateSelectedOption();
    
    // Prevent page scrolling
    e.preventDefault();
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    snapToOption();
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    snapToOption();
  };

  const updateSelectedOption = () => {
    const container = containerRef.current;
    if (!container) return;
    
    const scrollPosition = container.scrollTop;
    const index = Math.round(scrollPosition / itemHeight);
    
    if (index >= 0 && index < options.length) {
      onChange(options[index]);
    }
  };

  const snapToOption = () => {
    const container = containerRef.current;
    if (!container) return;
    
    const scrollPosition = container.scrollTop;
    const index = Math.round(scrollPosition / itemHeight);
    
    if (index >= 0 && index < options.length) {
      // Smooth scroll to the exact option position
      container.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      });
      
      // Update the selected value
      onChange(options[index]);
      setScrolling(false);
    }
  };

  // Handle direct option click
  const handleOptionClick = (option: string | number) => {
    onChange(option);
    const index = options.findIndex(opt => opt === option);
    const container = containerRef.current;
    if (container && index >= 0) {
      container.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden" style={{ height }}>
      <div 
        ref={containerRef}
        className={cn(
          "wheel-selector scroll-smooth", 
          "overflow-y-auto scrollbar-none snap-y snap-mandatory",
          className,
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{ height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{ height: itemHeight }}></div> {/* Top spacer */}
        {options.map((option, index) => (
          <div 
            key={index}
            className={cn(
              "wheel-option snap-center flex items-center justify-center",
              isMobile ? "text-sm" : "text-base", 
              "font-medium",
              value === option 
                ? "text-primary-600 dark:text-primary-400" 
                : "text-gray-700 dark:text-gray-300"
            )}
            style={{ height: itemHeight }}
            onClick={() => handleOptionClick(option)}
          >
            {option}
          </div>
        ))}
        <div style={{ height: itemHeight }}></div> {/* Bottom spacer */}
      </div>
      
      {/* Selection indicator */}
      <div 
        className="absolute left-0 right-0 top-1/2 pointer-events-none border-t border-b border-primary-200 dark:border-primary-700"
        style={{ 
          marginTop: -(itemHeight/2), 
          height: itemHeight 
        }}
      ></div>
    </div>
  );
}
