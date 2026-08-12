import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageTitle } from "@/components/ui";
import { BrandForm } from "@/components/brand-form";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "品牌設定 — ClipForge AI" };
export const dynamic = "force-dynamic";

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  const { id } = await params;
  const brand = user
    ? await db.brand.findFirst({ where: { id, userId: user.id } })
    : null;
  if (!brand) notFound();

  return (
    <AppShell>
      <PageTitle kicker="BRAND BOOK" title={brand.name} />
      <BrandForm
        initial={{
          id: brand.id,
          name: brand.name,
          industry: brand.industry,
          description: brand.description,
          audience: brand.audience,
          tone: brand.tone,
          defaultCta: brand.defaultCta,
          primaryColor: brand.primaryColor,
          secondaryColor: brand.secondaryColor,
          textColor: brand.textColor,
          logoUrl: brand.logoUrl,
          websiteUrl: brand.websiteUrl,
        }}
      />
    </AppShell>
  );
}
