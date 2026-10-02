"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { COUNTRIES, REGIONS, flagUrl, type Country } from "@/lib/countries";
import { useStore } from "@/lib/store";

/** Real flag image with the emoji as an offline fallback. */
export function Flag({ country, className = "" }: { country: Country; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`vm-flag ${className}`}>
      {broken ? (
        <span className="text-lg leading-none">{country.flag}</span>
      ) : (
        <img
          src={flagUrl(country.code, 160)}
          alt={`${country.name} flag`}
          loading="lazy"
          width={44}
          height={31}
          onError={() => setBroken(true)}
        />
      )}
    </span>
  );
}

interface CountryCardsProps {
  onSelect: (country: Country) => void;
  variant?: "rail" | "grid";
  activeCode?: string | null;
  countries?: Country[];
}

export function CountryCards({ onSelect, variant = "rail", activeCode, countries }: CountryCardsProps) {
  const list = countries ?? COUNTRIES;
  if (variant === "grid") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((country) => (
          <CountryCard
            key={country.code}
            country={country}
            active={activeCode === country.code}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="vm-rail">
      {list.map((country) => (
        <CompactCard
          key={country.code}
          country={country}
          active={activeCode === country.code}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function CompactCard({
  country,
  onSelect,
  active,
}: {
  country: Country;
  onSelect: (country: Country) => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(country)}
      className={`vm-country-chip group ${active ? "vm-country-active" : ""}`}
    >
      <Flag country={country} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[13px] font-medium text-neutral-800">
          {country.name}
        </span>
        <span className="block truncate text-[11px] text-neutral-400">{country.visa}</span>
      </span>
    </button>
  );
}

function CountryCard({
  country,
  onSelect,
  active,
}: {
  country: Country;
  onSelect: (country: Country) => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(country)}
      className={`vm-country-card group ${active ? "vm-country-active" : ""}`}
    >
      <div className="flex items-start justify-between">
        <Flag country={country} className="vm-flag-lg" />
        <ArrowUpRight
          size={16}
          className="text-neutral-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-800"
        />
      </div>
      <div className="mt-3">
        <p className="text-[15px] font-semibold tracking-tight text-neutral-900">
          {country.name}
        </p>
        <p className="mt-0.5 text-[12px] font-medium text-neutral-500">{country.visa}</p>
        <p className="mt-2 text-[11px] leading-snug text-neutral-400">{country.note}</p>
      </div>
    </button>
  );
}

interface DrawerProps {
  onSelect: (country: Country) => void;
}

/** Full destinations browser opened from the sidebar. */
export function CountryDrawer({ onSelect }: DrawerProps) {
  const open = useStore((s) => s.countryDrawerOpen);
  const setOpen = useStore((s) => s.setCountryDrawerOpen);
  const activeCode = useStore((s) => s.countryCode);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string>("All");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COUNTRIES.filter((country) => {
      const matchesRegion = region === "All" || country.region === region;
      const matchesQuery =
        !q ||
        country.name.toLowerCase().includes(q) ||
        country.visa.toLowerCase().includes(q);
      return matchesRegion && matchesQuery;
    });
  }, [query, region]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        aria-label="Close destinations"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm"
      />
      <aside className="vm-drawer relative m-2 flex w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] sm:m-4">
        <header className="flex items-center justify-between border-b border-neutral-200/70 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-neutral-900">
              Destinations
            </h2>
            <p className="text-xs text-neutral-400">Pick a country to prefill the case</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200/70 bg-white/70 text-neutral-500 transition-colors hover:text-neutral-900"
          >
            <X size={16} />
          </button>
        </header>

        <div className="border-b border-neutral-200/70 px-5 py-3">
          <div className="flex items-center gap-2 rounded-2xl border border-neutral-200/70 bg-white/70 px-3 py-2">
            <Search size={15} className="text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country or visa type"
              className="w-full bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["All", ...REGIONS] as string[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRegion(item)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  region === item
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-200/70 bg-white/70 text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <CountryCards variant="grid" activeCode={activeCode} onSelect={onSelect} countries={results} />
          {results.length === 0 && (
            <p className="py-10 text-center text-sm text-neutral-400">No destinations match.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
