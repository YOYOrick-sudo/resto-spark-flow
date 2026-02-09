import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-full border-[1.5px] border-transparent transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] data-[state=unchecked]:bg-muted data-[state=unchecked]:border-border dark:data-[state=unchecked]:bg-muted/60 dark:data-[state=unchecked]:border-border/60 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[16px] w-[16px] rounded-full bg-white shadow-sm dark:bg-white/90 dark:shadow-none ring-0 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] data-[state=checked]:translate-x-[19px] data-[state=checked]:shadow-md data-[state=unchecked]:translate-x-[1px]",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
