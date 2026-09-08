import React from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'horizontal' | 'vertical' | 'iconOnly';
  showSubtitle?: boolean;
  subtitleText?: string;
  className?: string;
  badgeText?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  showSubtitle = false,
  subtitleText = 'Calculadora Nutricional & Perfil de Usuario',
  className = '',
  badgeText,
}) => {
  // Dimension mapping for the circular emblem
  const iconDimensions = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size];

  const titleSizes = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }[size];

  const subtitleSizes = {
    xs: 'text-[9px]',
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
  }[size];

  // Emblem rendered using the high-resolution vector icon
  const emblemElement = (
    <div 
      className={`relative shrink-0 rounded-2xl overflow-hidden shadow-sm transition-transform group-hover:scale-105 select-none ${iconDimensions}`}
    >
      <img
        src="/icon.svg"
        alt="NutriFit Pro Logo Emblem"
        className="w-full h-full object-contain"
        referrerPolicy="no-referrer"
        loading="eager"
      />
    </div>
  );

  if (variant === 'iconOnly') {
    return <div className={`inline-flex items-center ${className}`}>{emblemElement}</div>;
  }

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {emblemElement}
        <div className="mt-3">
          <div className={`font-black tracking-tight text-zinc-900 dark:text-white flex items-center justify-center gap-1.5 ${titleSizes}`}>
            <span>NUTRIFIT</span>
            <span className="text-teal-500 dark:text-teal-400 drop-shadow-[0_0_12px_rgba(20,184,166,0.35)]">PRO</span>
            {badgeText && (
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 ml-1">
                {badgeText}
              </span>
            )}
          </div>
          {showSubtitle && (
            <p className={`text-teal-600 dark:text-teal-300/90 font-medium mt-1 leading-snug ${subtitleSizes}`}>
              {subtitleText}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default: Horizontal
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {emblemElement}
      <div className="flex flex-col">
        <div className={`font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5 leading-none ${titleSizes}`}>
          <span>NUTRIFIT</span>
          <span className="text-teal-500 dark:text-teal-400 drop-shadow-[0_0_10px_rgba(20,184,166,0.3)]">PRO</span>
          {badgeText && (
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 ml-1">
              {badgeText}
            </span>
          )}
        </div>
        {showSubtitle && (
          <p className={`text-teal-600 dark:text-teal-300/80 font-medium mt-1 leading-none ${subtitleSizes}`}>
            {subtitleText}
          </p>
        )}
      </div>
    </div>
  );
};
