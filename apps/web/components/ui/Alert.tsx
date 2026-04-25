"use client";

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertProps {
  type?: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
  autoClose?: number;
}

export const Alert = ({
  type = 'info',
  title,
  message,
  onClose,
  className,
  autoClose = 5000,
}: AlertProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  if (!isVisible) return null;

  const icons = {
    success: <CheckCircle2 className="text-green-400" size={20} />,
    error: <AlertCircle className="text-red-400" size={20} />,
    info: <Info className="text-blue-400" size={20} />,
    warning: <AlertTriangle className="text-yellow-400" size={20} />,
  };

  const backgrounds = {
    success: 'bg-green-500/10 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]',
    error: 'bg-red-500/10 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]',
    info: 'bg-blue-500/10 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]',
    warning: 'bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]',
  };

  return (
    <div
      className={cn(
        'fixed bottom-8 right-8 z-[100] flex max-w-md animate-in slide-in-from-right-10 duration-500',
        className
      )}
    >
      <div className={cn('flex w-full p-4 rounded-2xl border backdrop-blur-md', backgrounds[type])}>
        <div className="flex-shrink-0 mr-3 mt-0.5">{icons[type]}</div>
        <div className="flex-1">
          {title && <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 mb-1">{title}</h3>}
          <p className="text-sm font-medium text-zinc-400 leading-relaxed">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            if (onClose) onClose();
          }}
          className="flex-shrink-0 ml-4 h-6 w-6 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-zinc-500 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
