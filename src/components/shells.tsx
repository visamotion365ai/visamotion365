"use client";
import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, FileText, Workflow, Bot, MonitorPlay,
  ShieldCheck, KeyRound, Globe2, BookOpenCheck, Wallet, MessageSquare, ScrollText,
  Settings, Bell, LogOut, Plus, ChevronRight, Home, Inbox, User, CheckSquare,
  Receipt, Search, Cpu, Sparkles, AlertTriangle
} from "lucide-react";
import type { Session } from "@/lib/schema";
import { logoutAction } from "@/app/actions/auth";

function TopBar({ s, tenantLabel, onBell, unread }: { s: Session; tenantLabel?: string; onBell?: () => void; unread: number }) {
  return (
    <header className="h-14 border-b border-slate-200 bg-white/90 backdrop-blur flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {tenantLabel && (
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600">
            <Building2 size={12} /> {tenantLabel}
          </span>
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 hidden sm:block">{s.role.replace("_", " ")}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button onClick={onBell} className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 relative">
            <Bell size={16} />
            {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>}
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[11px] font-bold flex items-center justify-center">
            {s.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-slate-800">{s.name}</p>
            <p className="text-[10px] text-slate-400">{s.email}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button type="submit" title="Sign out" className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500">
            <LogOut size={15} />
          </button>
        </form>
      </div>
    </header>
  );
}

function SideNav({ items, s }: { items: { group: string; links: { href: string; label: string; icon: any }[] }[]; s: Session }) {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white hidden lg:flex flex-col">
      <div className="px-4 py-3 overflow-y-auto flex-1">
        {items.map((g) => (
          <div key={g.group} className="mb-4">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{g.group}</p>
            <nav className="space-y-0.5">
              {g.links.map((l) => {
                const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href + "/"));
                return (
                  <Link key={l.href} href={l.href}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition ${active ? "bg-slate-900 text-white shadow-card" : "text-slate-600 hover:bg-slate-100"}`}>
                    <l.icon size={15} className={active ? "text-white" : "text-slate-400"} />
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-100">
        <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-3 text-white">
          <p className="text-[11px] font-bold flex items-center gap-1.5"><Sparkles size={12} /> Dry-run mode {s.role === "SUPER_ADMIN" ? "ON" : ""}</p>
          <p className="text-[10px] opacity-80 mt-1">All external actions require human approval. Nothing is submitted autonomously.</p>
        </div>
      </div>
    </aside>
  );
}

const SUPER_NAV = [
  { group: "Overview", links: [{ href: "/dashboard", label: "Master Dashboard", icon: LayoutDashboard }] },
  { group: "Tenants", links: [{ href: "/tenants", label: "Tenants", icon: Building2 }] },
  { group: "Cases", links: [
    { href: "/applicants", label: "Applicants", icon: Users },
    { href: "/applications", label: "Pipeline", icon: Workflow },
    { href: "/dispatch-queue", label: "Dispatch Queue", icon: Inbox },
    { href: "/documents", label: "Documents", icon: FileText }
  ]},
  { group: "AI Operations", links: [
    { href: "/agents", label: "Agent Control", icon: Bot },
    { href: "/agent-runs", label: "Agent Runs", icon: Cpu },
    { href: "/browser-sessions", label: "Browser Use", icon: MonitorPlay },
    { href: "/approvals", label: "Approvals", icon: ShieldCheck }
  ]},
  { group: "Vault", links: [{ href: "/credentials", label: "API Keys & Vault", icon: KeyRound }] },
  { group: "Catalog", links: [
    { href: "/countries", label: "Countries", icon: Globe2 },
    { href: "/visa-programs", label: "Visa Programs", icon: BookOpenCheck }
  ]},
  { group: "Finance", links: [{ href: "/finance", label: "Billing & Commission", icon: Wallet }] },
  { group: "Comms", links: [{ href: "/messages", label: "Messages", icon: MessageSquare }] },
  { group: "System", links: [
    { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
    { href: "/settings", label: "Settings", icon: Settings }
  ]}
];

export function SuperShell({ s, children, unread = 0 }: { s: Session; children: React.ReactNode; unread?: number }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <SideNav items={SUPER_NAV} s={s} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar s={s} tenantLabel="All Tenants" unread={unread} />
        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export function AgencyShell({ s, children, tenantName, unread = 0 }: { s: Session; children: React.ReactNode; tenantName?: string; unread?: number }) {
  const nav = [
    { group: "Overview", links: [{ href: "/agency/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
    { group: "Cases", links: [
      { href: "/agency/applicants", label: "Applicants", icon: Users },
      { href: "/agency/applications", label: "Pipeline", icon: Workflow },
      { href: "/agency/documents", label: "Documents", icon: FileText },
      { href: "/agency/dispatch-requests", label: "Dispatch Requests", icon: Inbox }
    ]},
    { group: "Comms", links: [{ href: "/agency/messages", label: "Messages", icon: MessageSquare }] },
    { group: "Finance", links: [{ href: "/agency/billing", label: "Billing", icon: Receipt }] },
    { group: "System", links: [{ href: "/agency/settings", label: "Settings", icon: Settings }] }
  ];
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <SideNav items={nav} s={s} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar s={s} tenantLabel={tenantName} unread={unread} />
        <main className="flex-1 p-4 lg:p-6 max-w-[1200px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

const PORTAL_TABS = [
  { href: "/portal", label: "Home", icon: Home, exact: true },
  { href: "/portal/documents", label: "Docs", icon: FileText },
  { href: "/portal/application", label: "Application", icon: CheckSquare },
  { href: "/portal/messages", label: "Inbox", icon: Inbox },
  { href: "/portal/payments", label: "Payments", icon: Receipt }
];

export function PortalShell({ s, children, active }: { s: Session; children: React.ReactNode; active?: string }) {
  const pathname = usePathname();
  const current = active || (PORTAL_TABS.find((t) => (t.exact ? pathname === t.href : pathname.startsWith(t.href)))?.href || "/portal");
  return (
    <div className="min-h-screen bg-slate-200/70 flex justify-center">
      <div className="w-full max-w-[430px] bg-slate-50 min-h-screen flex flex-col relative shadow-pop">
        <div className="flex-1 pb-20">{children}</div>
        <nav className="fixed bottom-0 w-full max-w-[430px] bg-white border-t border-slate-200 grid grid-cols-5 z-40">
          {PORTAL_TABS.map((t) => {
            const active = current === t.href;
            return (
              <Link key={t.href} href={t.href} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${active ? "text-indigo-600" : "text-slate-400"}`}>
                <t.icon size={18} strokeWidth={active ? 2.4 : 2} />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
