import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    let variantClasses = '';
    switch (variant) {
      case 'default': variantClasses = 'bg-slate-900 text-slate-50 hover:bg-slate-900/90'; break;
      case 'destructive': variantClasses = 'bg-red-500 text-slate-50 hover:bg-red-500/90'; break;
      case 'outline': variantClasses = 'border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900'; break;
      case 'secondary': variantClasses = 'bg-slate-100 text-slate-900 hover:bg-slate-100/80'; break;
      case 'ghost': variantClasses = 'hover:bg-slate-100 hover:text-slate-900'; break;
      case 'link': variantClasses = 'text-slate-900 underline-offset-4 hover:underline'; break;
    }

    let sizeClasses = '';
    switch (size) {
      case 'default': sizeClasses = 'h-10 px-4 py-2'; break;
      case 'sm': sizeClasses = 'h-9 rounded-md px-3'; break;
      case 'lg': sizeClasses = 'h-11 rounded-md px-8'; break;
      case 'icon': sizeClasses = 'h-10 w-10'; break;
    }

    const baseClasses = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
