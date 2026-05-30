import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProviderId } from "@/types/ai";

export type PriceDisplayCurrencyMode = 'auto' | 'cny' | 'usd';

interface SettingsState {
  // API keys (new format - flat map)
  apiKeys: Record<string, string>;

  // Legacy format (kept for backward compatibility)
  providerConfigs: Record<ProviderId, { apiKey: string; enabled: boolean }>;

  // UI preferences
  showNodePrice: boolean;
  priceDisplayCurrencyMode: PriceDisplayCurrencyMode;
  usdToCnyRate: number;
  preferDiscountedPrice: boolean;
  downloadPresetPaths: string[];
  ignoreAtTagWhenCopyingAndGenerating: boolean;
  autoCheckAppUpdateOnLaunch: boolean;

  // Actions
  setProviderApiKey: (providerId: string, key: string) => void;
  loadSettings: () => void;
  getApiKey: (provider: ProviderId) => string;
  setShowNodePrice: (show: boolean) => void;
  setPriceDisplayCurrencyMode: (mode: PriceDisplayCurrencyMode) => void;
  setUsdToCnyRate: (rate: number) => void;
  setPreferDiscountedPrice: (enabled: boolean) => void;
  setDownloadPresetPaths: (paths: string[]) => void;
  setIgnoreAtTagWhenCopyingAndGenerating: (enabled: boolean) => void;
  setAutoCheckAppUpdateOnLaunch: (enabled: boolean) => void;
}

const STORAGE_KEY = "storyboard-settings";

export function getConfiguredApiKeyCount(
  apiKeys: Record<string, string>,
  providerIds: string[]
): number {
  return providerIds.filter((id) => (apiKeys[id] ?? '').trim().length > 0).length;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // API keys
      apiKeys: {},

      // Legacy format
      providerConfigs: {
        kie: { apiKey: "", enabled: true },
        fal: { apiKey: "", enabled: true },
        ppio: { apiKey: "", enabled: false },
        grsai: { apiKey: "", enabled: false },
      },

      // UI preferences
      showNodePrice: true,
      priceDisplayCurrencyMode: 'auto',
      usdToCnyRate: 7.2,
      preferDiscountedPrice: false,
      downloadPresetPaths: [],
      ignoreAtTagWhenCopyingAndGenerating: false,
      autoCheckAppUpdateOnLaunch: true,

      // Actions
      setProviderApiKey: (providerId, key) => {
        set((state) => ({
          apiKeys: { ...state.apiKeys, [providerId]: key },
          providerConfigs: {
            ...state.providerConfigs,
            [providerId as ProviderId]: {
              ...state.providerConfigs[providerId as ProviderId],
              apiKey: key,
            },
          },
        }));
      },

      loadSettings: () => {
        // Migration: if apiKeys is empty but providerConfigs has keys, migrate
        const state = get();
        if (Object.keys(state.apiKeys).length === 0) {
          const migrated: Record<string, string> = {};
          for (const [id, config] of Object.entries(state.providerConfigs)) {
            if (config.apiKey) {
              migrated[id] = config.apiKey;
            }
          }
          if (Object.keys(migrated).length > 0) {
            set({ apiKeys: migrated });
          }
        }
      },

      getApiKey: (provider) => {
        const state = get();
        return state.apiKeys[provider] || state.providerConfigs[provider]?.apiKey || "";
      },

      setShowNodePrice: (show) => set({ showNodePrice: show }),
      setPriceDisplayCurrencyMode: (mode) => set({ priceDisplayCurrencyMode: mode }),
      setUsdToCnyRate: (rate) => set({ usdToCnyRate: rate }),
      setPreferDiscountedPrice: (enabled) => set({ preferDiscountedPrice: enabled }),
      setDownloadPresetPaths: (paths) => set({ downloadPresetPaths: paths }),
      setIgnoreAtTagWhenCopyingAndGenerating: (enabled) => set({ ignoreAtTagWhenCopyingAndGenerating: enabled }),
      setAutoCheckAppUpdateOnLaunch: (enabled) => set({ autoCheckAppUpdateOnLaunch: enabled }),
    }),
    {
      name: STORAGE_KEY,
    }
  )
);
