import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
    withText?: boolean;
    variant?: 'default' | 'mark' | 'stacked' | 'text-only';
}

export const Logo = ({ className, withText = true, variant = 'default', ...props }: LogoProps) => {
    return (
        <div className={cn(
            "flex items-center gap-2",
            variant === 'stacked' && "flex-col gap-1",
            className
        )}>
            {variant !== 'text-only' && (
                <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-signal"
                    {...props}
                >
                    <path
                        d="M16 2L18.8 8.8L26 9.5L20.5 14.5L22.2 21.5L16 18L9.8 21.5L11.5 14.5L6 9.5L13.2 8.8L16 2Z"
                        className="fill-current opacity-20 animate-pulse"
                    />
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM16 28C22.6274 28 28 22.6274 28 16C28 9.37258 22.6274 4 16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28Z"
                        fill="currentColor"
                    />
                    <path
                        d="M16 8L18 14H24L19 18L21 24L16 20L11 24L13 18L8 14H14L16 8Z"
                        fill="currentColor"
                    />
                </svg>
            )}
            {withText && (variant === 'default' || variant === 'stacked' || variant === 'text-only') && (
                <span className={cn(
                    "font-bold text-lg tracking-tight text-foreground",
                    variant === 'stacked' && "text-xl"
                )}>
                    Engine<span className="text-signal">O</span>
                    <span className="text-muted-foreground font-normal">.ai</span>
                </span>
            )}
            {variant === 'mark' && (
                <span className="sr-only">EngineO.ai</span>
            )}
        </div>
    );
};
