import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/utils/cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-[10px] border border-border bg-subtle/40 px-3.5 py-2 text-base md:text-sm text-text placeholder:text-text-subtle transition-colors outline-none focus-visible:border-action focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-status-error aria-invalid:ring-2 aria-invalid:ring-status-error/20",
        className
      )}
      {...props}
    />
  );
}

export { Input };
