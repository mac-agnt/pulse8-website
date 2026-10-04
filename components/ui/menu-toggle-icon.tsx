import { cn } from "@/lib/cn";

/**
 * Hamburger that turns into a cross. Three bars, transform and opacity only,
 * so the morph stays on the compositor.
 */
export function MenuToggleIcon({
  open,
  className,
  duration = 300,
}: {
  open: boolean;
  className?: string;
  duration?: number;
}) {
  const bar =
    "absolute left-0 h-[2px] w-full rounded-full bg-current transition-[transform,opacity] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";
  const style = { transitionDuration: `${duration}ms` };

  return (
    <span aria-hidden="true" className={cn("relative block", className)}>
      <span
        style={style}
        className={cn(bar, "top-[22%]", open && "translate-y-[5.6px] rotate-45")}
      />
      <span style={style} className={cn(bar, "top-1/2 -mt-px", open && "scale-x-0 opacity-0")} />
      <span
        style={style}
        className={cn(bar, "bottom-[22%]", open && "-translate-y-[5.6px] -rotate-45")}
      />
    </span>
  );
}
