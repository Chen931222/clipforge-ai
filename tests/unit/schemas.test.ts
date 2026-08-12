import { describe, expect, it } from "vitest";
import { sceneSchema, scenesSchema } from "@/lib/ai/schemas";
import { extractJson } from "@/lib/ai/anthropic-provider";
import { projectCreateSchema } from "@/lib/validation";

describe("sceneSchema", () => {
  it("補齊預設值", () => {
    const scene = sceneSchema.parse({
      id: "s1",
      durationSec: 5,
      narration: "hi",
      title: "t",
    });
    expect(scene.assetMode).toBe("cover");
    expect(scene.assetId).toBeNull();
    expect(scene.needsConfirmation).toBe(false);
  });
  it("拒絕非法秒數與色碼", () => {
    expect(() =>
      sceneSchema.parse({ id: "s1", durationSec: 0, narration: "", title: "t" }),
    ).toThrow();
    expect(() =>
      sceneSchema.parse({
        id: "s1",
        durationSec: 5,
        narration: "",
        title: "t",
        backgroundColor: "red",
      }),
    ).toThrow();
  });
  it("scenesSchema 拒絕空陣列", () => {
    expect(() => scenesSchema.parse([])).toThrow();
  });
});

describe("projectCreateSchema", () => {
  const base = {
    name: "p",
    brandId: "b",
    productName: "x",
    objective: "promotion",
    masterDuration: 90,
    shortVideoCount: 3,
  };
  it("接受合法輸入", () => {
    expect(() => projectCreateSchema.parse(base)).not.toThrow();
  });
  it("拒絕 75 秒主影片與 6 支短影音", () => {
    expect(() => projectCreateSchema.parse({ ...base, masterDuration: 75 })).toThrow();
    expect(() => projectCreateSchema.parse({ ...base, shortVideoCount: 6 })).toThrow();
  });
  it("賣點最多五項", () => {
    expect(() =>
      projectCreateSchema.parse({ ...base, sellingPoints: ["1", "2", "3", "4", "5", "6"] }),
    ).toThrow();
  });
});

describe("extractJson", () => {
  it("解析純 JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it("解析 markdown 圍欄中的 JSON", () => {
    expect(extractJson('說明文字\n```json\n{"a":[1,2]}\n```')).toEqual({ a: [1, 2] });
  });
  it("解析失敗回 null", () => {
    expect(extractJson("完全不是 JSON")).toBeNull();
  });
});
