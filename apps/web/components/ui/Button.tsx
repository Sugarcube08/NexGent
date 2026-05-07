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
  const baseStyles = 'relative inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan/50 disabled:pointer-events-none disabled:opacity-50 gap-2 overflow-hidden tracking-wider uppercase';
  
  const variants = {
    primary: 'bg-white text-black hover:bg-cyber-cyan hover:shadow-neon-cyan active:scale-95',
    secondary: 'bg-zinc-800 text-white hover:bg-zinc-700 active:scale-95 border border-white/10',
    outline: 'bg-transparent border border-white/10 text-zinc-300 hover:text-white hover:border-cyber-cyan/50 hover:bg-cyber-cyan/5 active:scale-95',
    ghost: 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95',
    neon: 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30 hover:bg-cyber-cyan/20 hover:shadow-neon-cyan active:scale-95',
  };

  const sizes = {
    sm: 'h-9 px-4 text-[10px]',
    md: 'h-11 px-6 text-[11px]',
    lg: 'h-14 px-10 text-sm',
    icon: 'h-11 w-11 p-0',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
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
