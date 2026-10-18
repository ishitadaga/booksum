"use client";
import { useState } from "react";

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  required,
  minLength,
  className = "w-full px-4 py-3 bg-surface border border-line rounded-lg text-primary placeholder-muted focus:outline-none focus:border-blue-500",
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition text-sm"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
