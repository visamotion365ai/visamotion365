export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black shadow-card"
        style={{ width: size, height: size, fontSize: size * 0.42 }}>
        VM
      </div>
      <div className="leading-tight">
        <p className="font-extrabold text-slate-900" style={{ fontSize: size * 0.42 }}>VisaMotion365</p>
        <p className="text-slate-400 font-medium" style={{ fontSize: size * 0.26 }}>Global Visa Operations OS</p>
      </div>
    </div>
  );
}
