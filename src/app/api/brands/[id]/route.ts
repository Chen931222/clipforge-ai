import { db } from "@/lib/db";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOwnedBrand } from "@/lib/models";
import { brandInputSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  return jsonOk(await getOwnedBrand(user.id, id));
});

export const PATCH = withErrorHandling<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedBrand(user.id, id);
  const body = brandInputSchema.partial().parse(await req.json());
  const brand = await db.brand.update({
    where: { id },
    data: {
      ...body,
      websiteUrl: body.websiteUrl === "" ? null : body.websiteUrl,
    },
  });
  return jsonOk(brand);
});

export const DELETE = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedBrand(user.id, id);
  await db.brand.delete({ where: { id } });
  return jsonOk({ ok: true });
});
