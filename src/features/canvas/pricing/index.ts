import type { ProviderId, UsageRecord, UsageSummary } from './types';
import { MODEL_PRICING, PROVIDER_PRICING } from './types';

export function estimateCost(model: string, provider: ProviderId): number {
  const modelKey = `${provider}/${model}`;
  if (MODEL_PRICING[modelKey] !== undefined) {
    return MODEL_PRICING[modelKey];
  }

  const providerPricing = PROVIDER_PRICING[provider];
  if (providerPricing && providerPricing.tiers.length > 0) {
    return providerPricing.tiers[0].pricePerImage;
  }

  return 0;
}

export function formatCost(cost: number, currency: string = 'CNY'): string {
  if (currency === 'CNY') {
    return `¥${cost.toFixed(2)}`;
  }
  return `$${cost.toFixed(2)}`;
}

export function calculateUsageSummary(records: UsageRecord[]): UsageSummary {
  const summary: UsageSummary = {
    totalCost: 0,
    totalImages: records.length,
    byProvider: {} as Record<ProviderId, { cost: number; count: number }>,
    byModel: {} as Record<string, { cost: number; count: number }>,
  };

  for (const record of records) {
    summary.totalCost += record.cost;

    if (!summary.byProvider[record.provider]) {
      summary.byProvider[record.provider] = { cost: 0, count: 0 };
    }
    summary.byProvider[record.provider].cost += record.cost;
    summary.byProvider[record.provider].count += 1;

    if (!summary.byModel[record.model]) {
      summary.byModel[record.model] = { cost: 0, count: 0 };
    }
    summary.byModel[record.model].cost += record.cost;
    summary.byModel[record.model].count += 1;
  }

  return summary;
}

export function getFreeCredits(provider: ProviderId): number {
  return PROVIDER_PRICING[provider]?.freeCredits ?? 0;
}

export function getPricingTiers(provider: ProviderId) {
  return PROVIDER_PRICING[provider]?.tiers ?? [];
}
