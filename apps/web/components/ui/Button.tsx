import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'neon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  children,
  ...props
}: ButtonProps) => {
  const baseStyles = 'relative inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan/30 disabled:pointer-events-none disabled:opacity-50 gap-2 overflow-hidden';
  
  const variants = {
    primary: 'bg-white text-black hover:bg-zinc-200 active:scale-[0.98]',
    secondary: 'bg-zinc-900 text-white hover:bg-zinc-800 border border-white/10 active:scale-[0.98]',
    outline: 'bg-transparent border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.03] active:scale-[0.98]',
    ghost: 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/[0.05] active:scale-[0.98]',
    neon: 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20 hover:bg-cyber-cyan/20 active:scale-[0.98] shadow-soft-glow',
  };

  const sizes = {
    sm: 'h-9 px-4 text-xs',
    md: 'h-11 px-6 text-sm',
    lg: 'h-14 px-10 text-base',
    icon: 'h-11 w-11 p-0',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-current" /> : null}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
};
