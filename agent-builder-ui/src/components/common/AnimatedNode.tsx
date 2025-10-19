import React, { useEffect, useState } from 'react';

interface AnimatedNodeProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedNode({ children, className = '' }: AnimatedNodeProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger the animation after a small delay to ensure smooth rendering
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`transition-all duration-300 ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-2'
      } ${className}`}
    >
      {children}
    </div>
  );
}