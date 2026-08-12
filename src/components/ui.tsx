import { clsx } from "clsx";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/** 共用元件（DESIGN.md 元件基調） */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function buttonClass(variant: ButtonVariant = "secondary", extra?: string) {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-[4px] px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45",
    {
      primary: "bg-rec text-white hover:bg-rec-dark",
      secondary: "border border-ink bg-sheet text-ink hover:bg-paper",
      danger: "border border-rec bg-sheet text-rec hover:bg-rec hover:text-white",
      ghost: "text-ink-60 hover:text-ink underline-offset-4 hover:underline",
    }[variant],
    extra,
  );
}

export function Button({
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("flex flex-col gap-1.5", className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-40">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-[4px] border border-rule bg-sheet px-3 py-2 text-sm text-ink placeholder:text-ink-40 focus:border-ink focus:outline-none";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={clsx(inputBase, className)} {...rest} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea className={clsx(inputBase, "min-h-24", className)} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select className={clsx(inputBase, "appearance-none", className)} {...rest}>
      {children}
    </select>
  );
}

/** 狀態章：印刷膠囊（DESIGN.md） */
export function StatusStamp({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; rec?: boolean }> = {
    draft: { label: "草稿", cls: "border-rule text-ink-40" },
    scripted: { label: "已生成腳本", cls: "border-ink text-ink" },
    edited: { label: "已編輯", cls: "border-ink text-ink" },
    rendering: { label: "渲染中", cls: "border-rec text-rec", rec: true },
    rendered: { label: "已輸出", cls: "border-ink text-ink" },
    queued: { label: "排隊中", cls: "border-rule text-ink-40" },
    processing: { label: "渲染中", cls: "border-rec text-rec", rec: true },
    completed: { label: "已完成", cls: "border-ink text-ink" },
    failed: { label: "失敗", cls: "border-rec bg-rec text-white" },
  };
  const item = map[status] ?? { label: status, cls: "border-rule text-ink-40" };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs",
        item.cls,
      )}
    >
      {item.rec ? <span className="rec-dot inline-block h-2 w-2 rounded-full bg-rec" /> : null}
      {item.label}
    </span>
  );
}

export function SceneNo({ n }: { n: number }) {
  return <span className="font-mono text-xs text-ink-40">S{String(n).padStart(2, "0")}</span>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-md border border-rule bg-sheet", className)}>{children}</div>
  );
}

export function PageTitle({
  kicker,
  title,
  actions,
}: {
  kicker?: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-10">
      <div>
        {kicker ? <div className="font-mono text-xs tracking-widest text-ink-40">{kicker}</div> : null}
        <h1 className="mt-1 font-serif text-3xl font-semibold">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
