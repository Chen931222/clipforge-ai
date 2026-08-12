import { db } from "@/lib/db";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { brandInputSchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const brands = await db.brand.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  return jsonOk(brands);
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = brandInputSchema.parse(await req.json());
  const brand = await db.brand.create({
    data: {
      userId: user.id,
      name: body.name,
      industry: body.industry,
      description: body.description,
      audience: body.audience,
      tone: body.tone,
      defaultCta: body.defaultCta,
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
      textColor: body.textColor,
      logoUrl: body.logoUrl ?? null,
      websiteUrl: body.websiteUrl || null,
    },
  });
  return jsonOk(brand, { status: 201 });
});
