export type ProviderId = "kie" | "fal" | "ppio" | "grsai" | "openai";

export interface ProviderConfig {
  apiKey: string;
  enabled: boolean;
}
