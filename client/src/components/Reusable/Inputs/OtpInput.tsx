import React, { useMemo, useRef, useState } from "react";
import Button from "../Button";
import { cn } from "../../../utils/cn";

export default function OtpInput({
  onSubmit,
  isLoading,
  title = "Verify OTP",
  subtitle = "Enter the 6-digit code sent to your email.",
}: {
  onSubmit: (otp: string) => any;
  isLoading: boolean;
  title?: string;
  subtitle?: string;
}) {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpValue = useMemo(() => otp.join(""), [otp]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!/^[a-zA-Z0-9]?$/.test(value)) return;

    const next = [...otp];
    next[index] = value;
    setOtp(next);

    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").trim().slice(0, 6);
    if (!/^[a-zA-Z0-9]+$/.test(text)) return;
    const chars = text.split("").slice(0, 6);
    const next = Array.from({ length: 6 }).map((_, i) => chars[i] || "");
    setOtp(next);
    const last = Math.min(chars.length, 6) - 1;
    if (last >= 0) inputRefs.current[last]?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(otpValue);
  };

  return (
    <form onSubmit={submit} className="w-full">
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-bold text-text">{title}</h2>
        <p className="mt-1 text-sm text-card-text">{subtitle}</p>
      </div>

      <div onPaste={handlePaste} className="flex justify-center gap-2">
        {otp.map((_, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            value={otp[index]}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            maxLength={1}
            inputMode="text"
            className={cn(
              "h-12 w-12 rounded-xl border border-card-border bg-card",
              "text-center text-xl font-semibold text-text",
              "shadow-sm transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary-shadow focus:border-primary-border",
              "hover:bg-card-hover"
            )}
          />
        ))}
      </div>

      <div className="mt-6">
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading || otpValue.length < 6}
          className="w-full"
        >
          Verify
        </Button>
      </div>
    </form>
  );
}
