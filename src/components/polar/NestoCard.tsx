import * as React from "react";
import { cn } from "@/lib/utils";

export interface NestoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "large" | "subtle";
  hoverable?: boolean;
}

const NestoCard = React.forwardRef<HTMLDivElement, NestoCardProps>(
  ({ className, variant = "default", hoverable = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card text-card-foreground border border-border",
          "transition-all duration-200",
          {
            "rounded-card p-6": variant === "default",
            "rounded-card-lg p-8": variant === "large",
            "rounded-card p-6 bg-accent": variant === "subtle",
          },
          hoverable && "cursor-pointer hover:border-primary hover:shadow-md",
          className
        )}
        style={{
          boxShadow: hoverable
            ? undefined
            : "inset 0 0 0 1px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.04)",
        }}
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
