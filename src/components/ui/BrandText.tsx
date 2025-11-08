import React from "react";

export default function BrandText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-clip-text text-transparent bg-linear-to-r from-emerald-400 to-indigo-500 font-['Poppins',sans-serif] font-bold">
      {children}
    </span>
  );
}
