import { Check } from "lucide-react";
import { cn } from "cn";

export function Stepper({ steps, currentIndex }: { steps: { key: string; label: string }[]; currentIndex: number }) {
  return (
    <ol className="mb-6 flex items-center">
      {steps.map((step, i) => (
        <li key={step.key} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                i < currentIndex
                  ? "border-primary bg-primary text-primary-foreground"
                  : i === currentIndex
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground"
              )}
            >
              {i < currentIndex ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span className={cn("whitespace-nowrap text-[11px] font-medium", i <= currentIndex ? "text-foreground" : "text-muted-foreground")}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("mx-2 h-px flex-1 -translate-y-2.5", i < currentIndex ? "bg-primary" : "bg-border")} />
          )}
        </li>
      ))}
    </ol>
  );
}
