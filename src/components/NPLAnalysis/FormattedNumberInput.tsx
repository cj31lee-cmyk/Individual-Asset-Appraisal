import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  suffix?: string;
}

export function FormattedNumberInput({ value, onChange, placeholder, className, suffix = "원" }: Props) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(value ? String(value) : "");

  useEffect(() => {
    if (!focused) {
      setRaw(value ? String(value) : "");
    }
  }, [value, focused]);

  const displayValue = focused
    ? raw
    : value
    ? value.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
    : "";

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        className={cn(suffix ? "pr-12" : "", className)}
        value={displayValue}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d]/g, "");
          setRaw(cleaned);
          onChange(cleaned ? Number(cleaned) : 0);
        }}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}
