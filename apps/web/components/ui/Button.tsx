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
  const baseStyles = 'relative inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan/30 disabled:pointer-events-none disabled:opacity-50 gap-2 overflow-hidden';
  
  const variants = {
    primary: 'bg-white text-black shadow-lg shadow-white/5',
    secondary: 'bg-zinc-900 text-white border border-white/10 shadow-lg shadow-black/20',
    outline: 'bg-transparent border border-white/10 text-zinc-400',
    ghost: 'bg-transparent text-zinc-400',
    neon: 'bg-cyber-cyan text-black shadow-[0_0_20px_rgba(0,243,255,0.3)]',
  };

  const sizes = {
    sm: 'h-9 px-4 text-[10px] tracking-wider uppercase font-black',
    md: 'h-11 px-6 text-xs tracking-wider uppercase font-black',
    lg: 'h-14 px-10 text-sm tracking-widest uppercase font-black',
    icon: 'h-11 w-11 p-0',
  };

  return (
    <motion.button
      whileHover={{ 
        scale: 1.02,
        y: -1,
        transition: { type: "spring", stiffness: 400, damping: 10 }
      }}
      whileTap={{ scale: 0.97 }}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {/* Background Hover Glow for Primary/Neon */}
      {(variant === 'primary' || variant === 'neon') && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
          animate={{ x: ['100%', '-100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      )}
      
      {/* Subtle Overlay on hover */}
      <motion.div 
        className="absolute inset-0 bg-current opacity-0 hover:opacity-[0.08] transition-opacity duration-300"
      />

      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-current" /> : null}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
};
