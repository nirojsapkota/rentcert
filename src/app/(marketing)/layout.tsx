import { MarketingHeader } from "@/components/marketing/marketing-header";
import { SiteFooter } from "@/components/site-footer";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <MarketingHeader />
      <main className="min-w-0 mx-auto w-full max-w-5xl flex-1 px-4 py-12">{children}</main>
      <SiteFooter />
    </>
  );
}
