import { db } from "@/lib/db";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOwnedBrand } from "@/lib/models";
import { projectCreateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const projects = await db.project.findMany({
    where: { userId: user.id },
    include: { brand: true },
    orderBy: { updatedAt: "desc" },
  });
  return jsonOk(projects);
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = projectCreateSchema.parse(await req.json());
  await getOwnedBrand(user.id, body.brandId); // 品牌所有權
  const project = await db.project.create({
    data: {
      userId: user.id,
      brandId: body.brandId,
      name: body.name,
      productName: body.productName,
      productDescription: body.productDescription,
      objective: body.objective,
      audience: body.audience,
      sellingPointsJson: JSON.stringify(
        body.sellingPoints.map((p) => p.trim()).filter(Boolean),
      ),
      cta: body.cta,
      language: body.language,
      style: body.style,
      masterDuration: body.masterDuration,
      shortVideoCount: body.shortVideoCount,
      status: "draft",
    },
  });
  return jsonOk(project, { status: 201 });
});
