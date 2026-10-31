import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-[6px] border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "border-border bg-subtle text-text",
        secondary:
          "border-border bg-subtle text-text",
        action:
          "border-transparent bg-action-subtle text-action-subtle-fg",
        lift:
          "border-[#B3E5E5] dark:border-transparent bg-[#E6F6F6] dark:bg-[rgba(79,209,197,0.16)] text-data-lift font-semibold tabular-nums",
        drag:
          "border-[#F8C8E1] dark:border-transparent bg-[#FDF0F6] dark:bg-[rgba(245,139,190,0.16)] text-data-drag font-semibold tabular-nums",
        success:
          "border-[#BDE8D0] dark:border-transparent bg-status-success-bg text-status-success",
        warning:
          "border-[#F9E2B5] dark:border-transparent bg-status-warning-bg text-status-warning",
        error:
          "border-[#F9CBC6] dark:border-transparent bg-status-error-bg text-status-error",
        outline:
          "border-border bg-surface text-text-muted",
        pill:
          "rounded-full border-border bg-subtle text-text px-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends useRender.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: BadgeProps) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
