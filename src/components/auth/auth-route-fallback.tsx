import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function AuthRouteFallback({ merchantName }: { merchantName?: string }) {
  return (
    <>
      <SiteHeader />
      <main id="content" className="mx-auto flex min-h-[60dvh] max-w-lg flex-col justify-center px-4 py-12">
        <p className="text-sm text-muted">Loading…</p>
      </main>
      <SiteFooter merchantName={merchantName} />
    </>
  );
}
