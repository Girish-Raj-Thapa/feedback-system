import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap rounded-[10px] select-none outline-none transition-all duration-100 ease-out focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-action text-text-on-action shadow-sm hover:bg-action-hover active:bg-action-active",
        outline:
          "border border-border bg-surface text-text shadow-sm hover:bg-hover active:bg-subtle",
        secondary:
          "bg-subtle text-text hover:bg-hover active:bg-border",
        ghost:
          "text-text hover:bg-hover active:bg-subtle",
        destructive:
          "bg-status-error text-white shadow-sm hover:opacity-90 active:opacity-80",
        "subtle-action":
          "bg-action-subtle text-action-subtle-fg hover:opacity-90 active:opacity-80",
        link:
          "text-link underline-offset-4 hover:underline p-0 h-auto active:scale-100",
      },
      size: {
        default: "h-10 px-4 text-sm gap-2", // md = 40px
        sm: "h-8 px-3 text-xs gap-1.5",     // sm = 32px
        lg: "h-12 px-6 text-base gap-2.5",  // lg = 48px
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof buttonVariants> {}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
