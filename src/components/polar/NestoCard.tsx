import * as React from "react";
import { cn } from "@/lib/utils";

export interface NestoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "large" | "subtle" | "small";
  hoverable?: boolean;
  radius?: "default" | "small";
  nested?: boolean;
}

const NestoCard = React.forwardRef<HTMLDivElement, NestoCardProps>(
  ({ className, variant = "default", hoverable = false, radius = "default", nested = false, ...props }, ref) => {
    const radiusClass = radius === "small" ? "rounded-card-sm" : "rounded-card";
    
    return (
      <div
        ref={ref}
          className={cn(
            "bg-card text-card-foreground",
            "transition-[box-shadow,transform,border-color] duration-200",
            radiusClass,
            {
              "p-6": variant === "default",
              "p-8": variant === "large",
              "p-6 bg-accent": variant === "subtle",
              "p-4": variant === "small",
            },
            nested && "border border-border/40",
            !nested && "dark:border dark:border-border/50",
            hoverable && !nested && "cursor-pointer hover:-translate-y-px dark:hover:border-border/70",
            className
          )}
        style={{
          boxShadow: nested
            ? "none"
            : hoverable
              ? undefined
              : "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)",
          ...(props.style || {}),
        }}
        onMouseEnter={hoverable && !nested ? (e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
          props.onMouseEnter?.(e);
        } : props.onMouseEnter}
        onMouseLeave={hoverable && !nested ? (e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)";
          props.onMouseLeave?.(e);
        } : props.onMouseLeave}
        {...props}
      />
    );
  }
);
NestoCard.displayName = "NestoCard";

const NestoCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));
NestoCardHeader.displayName = "NestoCardHeader";

const NestoCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-h2 font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
NestoCardTitle.displayName = "NestoCardTitle";

const NestoCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-small text-muted-foreground", className)}
    {...props}
  />
));
NestoCardDescription.displayName = "NestoCardDescription";

const NestoCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
NestoCardContent.displayName = "NestoCardContent";

const NestoCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
));
NestoCardFooter.displayName = "NestoCardFooter";

export {
  NestoCard,
  NestoCardHeader,
  NestoCardTitle,
  NestoCardDescription,
  NestoCardContent,
  NestoCardFooter,
};
