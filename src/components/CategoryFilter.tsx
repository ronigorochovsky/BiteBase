"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface CategoryFilterProps {
  options: FilterOption[];
  paramName?: string;
  allLabel?: string;
  /** Tailwind classes for the active button. Default: brand orange. */
  activeClass?: string;
}

export function CategoryFilter({
  options,
  paramName = "category",
  allLabel = "הכל",
  activeClass = "bg-brand-500 text-white",
}: CategoryFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) ?? "";

  // Restore last selected filter when navigating back without URL params
  useEffect(() => {
    if (!current) {
      const stored = sessionStorage.getItem(`bitebase-filter-${paramName}`) ?? "";
      if (stored) {
        const params = new URLSearchParams(searchParams.toString());
        params.set(paramName, stored);
        router.replace(`${pathname}?${params.toString()}`);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = (value: string) => {
    sessionStorage.setItem(`bitebase-filter-${paramName}`, value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(paramName, value);
    } else {
      params.delete(paramName);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const inactiveClass = "bg-white text-gray-600 border border-stone-300 hover:bg-stone-50";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setFilter("")}
        className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors", !current ? activeClass : inactiveClass)}
      >
        {allLabel}
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setFilter(opt.value)}
          className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors", current === opt.value ? activeClass : inactiveClass)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
