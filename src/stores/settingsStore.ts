import { create } from "zustand";
import type { ProviderId, ProviderConfig } from "@/types/ai";

interface SettingsStore {
  providerConfigs: Record<ProviderId, ProviderConfig>;
  setApiKey: (provider: ProviderId, apiKey: string) => void;
  toggleProvider: (provider: ProviderId) => void;
  loadSettings: () => void;
  getApiKey: (provider: ProviderId) => string;
}

const STORAGE_KEY = "storyboard-settings";

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  providerConfigs: {
    kie: { apiKey: "", enabled: true },
    fal: { apiKey: "", enabled: true },
    "派欧云": { apiKey: "", enabled: false },
    GRSAI: { apiKey: "", enabled: false },
  },

  loadSettings: () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const configs = JSON.parse(data);
      set({ providerConfigs: configs });
    }
  },

  setApiKey: (provider, apiKey) => {
    set((state) => {
      const configs = {
        ...state.providerConfigs,
        [provider]: { ...state.providerConfigs[provider], apiKey },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
      return { providerConfigs: configs };
    });
  },

  toggleProvider: (provider) => {
    set((state) => {
      const configs = {
        ...state.providerConfigs,
        [provider]: {
          ...state.providerConfigs[provider],
          enabled: !state.providerConfigs[provider].enabled,
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
      return { providerConfigs: configs };
    });
  },

  getApiKey: (provider) => {
    return get().providerConfigs[provider]?.apiKey || "";
  },
}));
