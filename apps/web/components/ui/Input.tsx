import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({
  className,
  label,
  error,
  type = 'text',
  ...props
}: InputProps) => {
  return (
    <div className="space-y-1.5 w-full group">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-focus-within:text-cyber-cyan transition-colors ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          className={cn(
            "w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl h-11 px-4 text-sm text-white placeholder:text-zinc-600 transition-all duration-300 focus:outline-none focus:border-cyber-cyan/50 focus:ring-1 focus:ring-cyber-cyan/20 shadow-glass-inner",
            error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        <motion.div 
          className="absolute inset-0 rounded-xl pointer-events-none border border-cyber-cyan/0 group-focus-within:border-cyber-cyan/20 transition-all duration-500"
          initial={false}
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-[10px] font-bold text-red-400 ml-1 uppercase tracking-wider"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};
