import { AppShell } from "@/components/app-shell";
import { PageTitle } from "@/components/ui";
import { BrandForm } from "@/components/brand-form";

export const metadata = { title: "新品牌 — ClipForge AI" };

export default function NewBrandPage() {
  return (
    <AppShell>
      <PageTitle kicker="BRAND BOOK" title="建立品牌" />
      <BrandForm />
    </AppShell>
  );
}
