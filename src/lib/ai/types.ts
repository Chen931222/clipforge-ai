import type { ContentStrategy, Scene, SocialCopy } from "./schemas";

export interface BrandInput {
  name: string;
  industry: string;
  description: string;
  audience: string;
  tone: string;
  defaultCta: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
}

export interface ProjectInput {
  name: string;
  productName: string;
  productDescription: string;
  objective: string;
  audience: string;
  sellingPoints: string[];
  cta: string;
  language: string;
  style: string;
  masterDuration: number;
  shortVideoCount: number;
}

export interface AssetInput {
  id: string;
  type: string;
  originalName: string;
}

export interface StrategyInput {
  brand: BrandInput;
  project: ProjectInput;
  assets: AssetInput[];
}

export interface RegenerateSceneInput {
  brand: BrandInput;
  project: ProjectInput;
  scene: Scene;
  sceneIndex: number;
  sceneCount: number;
  videoTitle: string;
  instruction?: string;
}

export interface SocialCopyInput {
  brand: BrandInput;
  project: ProjectInput;
  masterTitle: string;
}

/**
 * AI 供應商抽象介面（規格 §9）。
 * 所有實作的回傳值都必須通過 Zod schema 驗證後才回傳。
 */
export interface ContentAIProvider {
  readonly name: string;
  generateStrategy(input: StrategyInput): Promise<ContentStrategy>;
  regenerateScene(input: RegenerateSceneInput): Promise<Scene>;
  generateSocialCopy(input: SocialCopyInput): Promise<SocialCopy>;
}
