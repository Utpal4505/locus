import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-mono font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-2 border-primary/50 bg-primary/15 text-primary font-bold",
        accent:
          "border-2 border-accent bg-accent text-accent-foreground font-bold shadow-brutal-sm",
        secondary:
          "border-2 border-border-strong bg-surface-2 text-foreground",
        outline:
          "border-2 border-border-strong bg-transparent text-foreground",
        success:
          "border-2 border-success/50 bg-success/15 text-success font-bold",
        destructive:
          "border-2 border-destructive/50 bg-destructive/15 text-destructive font-bold",
        duration:
          "border-2 border-white/20 bg-black/90 text-white font-mono tracking-normal",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
