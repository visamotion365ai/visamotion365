import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-8 max-w-md w-full text-center">
        <p className="text-4xl font-black text-slate-900">404</p>
        <p className="text-sm text-slate-500 mt-2">Page not found — or this resource is outside your tenant scope (access fails closed).</p>
        <Link href="/login" className="inline-block mt-5 rounded-xl bg-slate-900 text-white text-sm font-semibold px-4 py-2.5">Back to sign in</Link>
      </div>
    </div>
  );
}
