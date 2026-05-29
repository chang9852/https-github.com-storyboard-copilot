export type ProviderId = 'kie' | 'fal' | 'openai' | 'stability';

export interface PricingTier {
  id: string;
  name: string;
  pricePerImage: number;
  currency: string;
  features: string[];
}

export interface ProviderPricing {
  provider: ProviderId;
  tiers: PricingTier[];
  freeCredits?: number;
}

export interface UsageRecord {
  id: string;
  provider: ProviderId;
  model: string;
  timestamp: number;
  cost: number;
  imageUrl?: string;
}

export interface UsageSummary {
  totalCost: number;
  totalImages: number;
  byProvider: Record<ProviderId, { cost: number; count: number }>;
  byModel: Record<string, { cost: number; count: number }>;
}

export const PROVIDER_PRICING: Record<ProviderId, ProviderPricing> = {
  kie: {
    provider: 'kie',
    tiers: [
      { id: 'basic', name: '基础版', pricePerImage: 0.1, currency: 'CNY', features: ['标准质量', '基础模型'] },
      { id: 'pro', name: '专业版', pricePerImage: 0.3, currency: 'CNY', features: ['高质量', '所有模型', '优先队列'] },
    ],
    freeCredits: 10,
  },
  fal: {
    provider: 'fal',
    tiers: [
      { id: 'standard', name: '标准', pricePerImage: 0.05, currency: 'USD', features: ['标准质量'] },
      { id: 'premium', name: '高级', pricePerImage: 0.15, currency: 'USD', features: ['高质量', '快速生成'] },
    ],
  },
  openai: {
    provider: 'openai',
    tiers: [
      { id: 'dall-e-3', name: 'DALL-E 3', pricePerImage: 0.04, currency: 'USD', features: ['标准1024x1024'] },
      { id: 'dall-e-3-hd', name: 'DALL-E 3 HD', pricePerImage: 0.08, currency: 'USD', features: ['高清1024x1792'] },
    ],
  },
  stability: {
    provider: 'stability',
    tiers: [
      { id: 'stable-diffusion', name: 'Stable Diffusion', pricePerImage: 0.02, currency: 'USD', features: ['标准生成'] },
    ],
  },
};

export const MODEL_PRICING: Record<string, number> = {
  'kie/nano-banana-pro': 0.3,
  'kie/nano-banana': 0.1,
  'fal/flux-dev': 0.05,
  'fal/flux-pro': 0.15,
  'openai/dall-e-3': 0.04,
  'openai/dall-e-3-hd': 0.08,
  'stability/stable-diffusion-xl': 0.02,
};
