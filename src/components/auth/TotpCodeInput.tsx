import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";

/** Six large, individually-boxed digit slots (3-3 split) instead of a single cramped text input —
 * shared by the tenant and platform TOTP enrollment/challenge flows. */
export function TotpCodeInput({
  value,
  onChange,
  autoFocus,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  id?: string;
}) {
  return (
    <InputOTP id={id} maxLength={6} value={value} onChange={onChange} autoFocus={autoFocus} inputMode="numeric" containerClassName="justify-center gap-2">
      <InputOTPGroup>
        <InputOTPSlot index={0} className="size-11 text-lg sm:size-12 sm:text-xl" />
        <InputOTPSlot index={1} className="size-11 text-lg sm:size-12 sm:text-xl" />
        <InputOTPSlot index={2} className="size-11 text-lg sm:size-12 sm:text-xl" />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} className="size-11 text-lg sm:size-12 sm:text-xl" />
        <InputOTPSlot index={4} className="size-11 text-lg sm:size-12 sm:text-xl" />
        <InputOTPSlot index={5} className="size-11 text-lg sm:size-12 sm:text-xl" />
      </InputOTPGroup>
    </InputOTP>
  );
}
