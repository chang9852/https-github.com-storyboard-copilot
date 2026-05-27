import type { ProviderId } from "@/types/ai";
import type { ImageModelDefinition, ModelProviderDefinition } from "./types";

const providerRegistry = new Map<ProviderId, ModelProviderDefinition>();
const modelRegistry = new Map<string, ImageModelDefinition>();

export function registerProvider(provider: ModelProviderDefinition): void {
  providerRegistry.set(provider.id, provider);
  for (const model of provider.models) {
    modelRegistry.set(`${provider.id}/${model.id}`, model);
  }
}

export function getProvider(id: ProviderId): ModelProviderDefinition | undefined {
  return providerRegistry.get(id);
}

export function getAllProviders(): ModelProviderDefinition[] {
  return Array.from(providerRegistry.values());
}

export function getModel(providerId: ProviderId, modelId: string): ImageModelDefinition | undefined {
  return modelRegistry.get(`${providerId}/${modelId}`);
}

export function getModelByFullId(fullId: string): ImageModelDefinition | undefined {
  return modelRegistry.get(fullId);
}

export function getModelsForProvider(providerId: ProviderId): ImageModelDefinition[] {
  const provider = providerRegistry.get(providerId);
  return provider?.models ?? [];
}

export function getAllModels(): ImageModelDefinition[] {
  return Array.from(modelRegistry.values());
}

// Model alias support
const modelAliases = new Map<string, string>();

export function registerModelAlias(alias: string, fullId: string): void {
  modelAliases.set(alias, fullId);
}

export function resolveModelAlias(alias: string): string | undefined {
  return modelAliases.get(alias);
}

export function getModelByAlias(alias: string): ImageModelDefinition | undefined {
  const fullId = modelAliases.get(alias);
  return fullId ? modelRegistry.get(fullId) : undefined;
}
