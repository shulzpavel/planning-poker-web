import { useCallback, useId, useLayoutEffect, useRef } from "react";
import { FieldLabel } from "../../../design-system";
import { cn } from "../../../design-system/utils";
import { standupAdaptiveInputClass } from "./standupUi";

interface StandupAdaptiveTextareaProps {
  label: string;
  value: string;
  placeholder?: string;
  /** Hide visible label — use inside task cards where section title gives context. */
  hideLabel?: boolean;
  className?: string;
  inputClassName?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

/** Grows vertically to fit task title / long text without clipping. */
export function StandupAdaptiveTextarea({
  label,
  value,
  placeholder,
  hideLabel = false,
  className,
  inputClassName,
  onChange,
  onBlur,
}: StandupAdaptiveTextareaProps) {
  const inputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    adjustHeight();
  }, [adjustHeight, value]);

  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => adjustHeight());
    observer.observe(element);
    return () => observer.disconnect();
  }, [adjustHeight]);

  return (
    <div className={cn("min-w-0", hideLabel ? undefined : "space-y-1.5", className)}>
      {hideLabel ? null : <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <textarea
        ref={textareaRef}
        id={inputId}
        rows={1}
        value={value}
        placeholder={placeholder}
        aria-label={hideLabel ? label : undefined}
        className={cn(standupAdaptiveInputClass, inputClassName)}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}
