export type ProviderId = "kie" | "fal" | "ppio" | "grsai";

export interface ProviderConfig {
  apiKey: string;
  enabled: boolean;
}