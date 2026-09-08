import type { ReactNode } from "react";

export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 ${className}`}>{children}</div>;
}

export function SectionHeader({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 text-xs font-bold text-rouge uppercase tracking-widest mt-6 mb-3 first:mt-0">{children}</div>;
}

export function InputField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`border border-gray-200 rounded-lg p-3 w-full text-base focus:border-rouge focus:outline-none ${props.className ?? ""}`} />;
}

export function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`border border-gray-200 rounded-lg p-3 w-full text-base focus:border-rouge focus:outline-none ${props.className ?? ""}`} />;
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`bg-rouge text-white font-bold py-3 px-4 rounded-lg shadow disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200">{children}</div>;
}
