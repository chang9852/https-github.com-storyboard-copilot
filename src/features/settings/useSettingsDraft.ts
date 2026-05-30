import { useState, useCallback, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import type { PriceDisplayCurrencyMode } from '@/features/canvas/pricing/types';
import type { GrsaiCreditTierId } from '@/features/canvas/pricing/types';
import type { UiRadiusPreset, ThemeTonePreset, CanvasEdgeRoutingMode, ProviderApiKeys } from '@/stores/settingsStore';

export interface SettingsDraft {
  apiKeys: ProviderApiKeys;
  grsaiNanoBananaProModel: string;
  downloadPresetPaths: string[];
  useUploadFilenameAsNodeTitle: boolean;
  storyboardGenKeepStyleConsistent: boolean;
  storyboardGenDisableTextInImage: boolean;
  storyboardGenAutoInferEmptyFrame: boolean;
  ignoreAtTagWhenCopyingAndGenerating: boolean;
  enableStoryboardGenGridPreviewShortcut: boolean;
  showStoryboardGenAdvancedRatioControls: boolean;
  showNodePrice: boolean;
  priceDisplayCurrencyMode: PriceDisplayCurrencyMode;
  usdToCnyRate: string;
  preferDiscountedPrice: boolean;
  grsaiCreditTierId: GrsaiCreditTierId;
  uiRadiusPreset: UiRadiusPreset;
  themeTonePreset: ThemeTonePreset;
  accentColor: string;
  canvasEdgeRoutingMode: CanvasEdgeRoutingMode;
  autoCheckAppUpdateOnLaunch: boolean;
  enableUpdateDialog: boolean;
}

function readStoreToDraft(): SettingsDraft {
  const s = useSettingsStore.getState();
  return {
    apiKeys: { ...s.apiKeys },
    grsaiNanoBananaProModel: s.grsaiNanoBananaProModel,
    downloadPresetPaths: [...s.downloadPresetPaths],
    useUploadFilenameAsNodeTitle: s.useUploadFilenameAsNodeTitle,
    storyboardGenKeepStyleConsistent: s.storyboardGenKeepStyleConsistent,
    storyboardGenDisableTextInImage: s.storyboardGenDisableTextInImage,
    storyboardGenAutoInferEmptyFrame: s.storyboardGenAutoInferEmptyFrame,
    ignoreAtTagWhenCopyingAndGenerating: s.ignoreAtTagWhenCopyingAndGenerating,
    enableStoryboardGenGridPreviewShortcut: s.enableStoryboardGenGridPreviewShortcut,
    showStoryboardGenAdvancedRatioControls: s.showStoryboardGenAdvancedRatioControls,
    showNodePrice: s.showNodePrice,
    priceDisplayCurrencyMode: s.priceDisplayCurrencyMode,
    usdToCnyRate: String(s.usdToCnyRate),
    preferDiscountedPrice: s.preferDiscountedPrice,
    grsaiCreditTierId: s.grsaiCreditTierId,
    uiRadiusPreset: s.uiRadiusPreset,
    themeTonePreset: s.themeTonePreset,
    accentColor: s.accentColor,
    canvasEdgeRoutingMode: s.canvasEdgeRoutingMode,
    autoCheckAppUpdateOnLaunch: s.autoCheckAppUpdateOnLaunch,
    enableUpdateDialog: s.enableUpdateDialog,
  };
}

export function useSettingsDraft(isOpen: boolean) {
  const [draft, setDraft] = useState<SettingsDraft>({
    apiKeys: {},
    grsaiNanoBananaProModel: useSettingsStore.getState().grsaiNanoBananaProModel,
    downloadPresetPaths: [],
    useUploadFilenameAsNodeTitle: true,
    storyboardGenKeepStyleConsistent: true,
    storyboardGenDisableTextInImage: true,
    storyboardGenAutoInferEmptyFrame: true,
    ignoreAtTagWhenCopyingAndGenerating: true,
    enableStoryboardGenGridPreviewShortcut: false,
    showStoryboardGenAdvancedRatioControls: false,
    showNodePrice: true,
    priceDisplayCurrencyMode: 'auto',
    usdToCnyRate: '7.2',
    preferDiscountedPrice: false,
    grsaiCreditTierId: useSettingsStore.getState().grsaiCreditTierId,
    uiRadiusPreset: 'default',
    themeTonePreset: 'neutral',
    accentColor: '#3B82F6',
    canvasEdgeRoutingMode: 'spline',
    autoCheckAppUpdateOnLaunch: true,
    enableUpdateDialog: true,
  });

  const resetDraft = useCallback(() => {
    setDraft(readStoreToDraft());
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetDraft();
    }
  }, [isOpen, resetDraft]);

  const updateDraft = useCallback(
    <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const commitDraft = useCallback(() => {
    const store = useSettingsStore.getState();
    const providers = Object.keys(draft.apiKeys);
    for (const providerId of providers) {
      store.setProviderApiKey(providerId, draft.apiKeys[providerId] ?? '');
    }
    store.setGrsaiNanoBananaProModel(draft.grsaiNanoBananaProModel);
    store.setDownloadPresetPaths(draft.downloadPresetPaths);
    store.setUseUploadFilenameAsNodeTitle(draft.useUploadFilenameAsNodeTitle);
    store.setStoryboardGenKeepStyleConsistent(draft.storyboardGenKeepStyleConsistent);
    store.setStoryboardGenDisableTextInImage(draft.storyboardGenDisableTextInImage);
    store.setStoryboardGenAutoInferEmptyFrame(draft.storyboardGenAutoInferEmptyFrame);
    store.setIgnoreAtTagWhenCopyingAndGenerating(draft.ignoreAtTagWhenCopyingAndGenerating);
    store.setEnableStoryboardGenGridPreviewShortcut(draft.enableStoryboardGenGridPreviewShortcut);
    store.setShowStoryboardGenAdvancedRatioControls(draft.showStoryboardGenAdvancedRatioControls);
    store.setShowNodePrice(draft.showNodePrice);
    store.setPriceDisplayCurrencyMode(draft.priceDisplayCurrencyMode);
    store.setUsdToCnyRate(Number(draft.usdToCnyRate));
    store.setPreferDiscountedPrice(draft.preferDiscountedPrice);
    store.setGrsaiCreditTierId(draft.grsaiCreditTierId);
    store.setUiRadiusPreset(draft.uiRadiusPreset);
    store.setThemeTonePreset(draft.themeTonePreset);
    store.setAccentColor(draft.accentColor);
    store.setCanvasEdgeRoutingMode(draft.canvasEdgeRoutingMode);
    store.setAutoCheckAppUpdateOnLaunch(draft.autoCheckAppUpdateOnLaunch);
    store.setEnableUpdateDialog(draft.enableUpdateDialog);
  }, [draft]);

  return { draft, updateDraft, commitDraft };
}