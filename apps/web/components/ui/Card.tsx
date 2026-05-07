import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  isGlass?: boolean;
}

export const Card = ({ children, className, isGlass = true, ...props }: CardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "rounded-2xl border border-white/10 transition-all duration-300",
        isGlass && "bg-black/40 backdrop-blur-xl shadow-glass-inner hover:border-cyber-cyan/30",
        !isGlass && "bg-zinc-900/50",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("px-6 py-4 border-b border-white/5 bg-white/5", className)}>
    {children}
  </div>
);

export const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("p-6", className)}>
    {children}
  </div>
);
