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

export function useSettingsDraft(isOpen: boolean) {
  const store = useSettingsStore();

  const [draft, setDraft] = useState<SettingsDraft>({
    apiKeys: {},
    grsaiNanoBananaProModel: store.grsaiNanoBananaProModel,
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
    grsaiCreditTierId: store.grsaiCreditTierId,
    uiRadiusPreset: 'default',
    themeTonePreset: 'neutral',
    accentColor: '#3B82F6',
    canvasEdgeRoutingMode: 'spline',
    autoCheckAppUpdateOnLaunch: true,
    enableUpdateDialog: true,
  });

  const resetDraft = useCallback(() => {
    setDraft({
      apiKeys: { ...store.apiKeys },
      grsaiNanoBananaProModel: store.grsaiNanoBananaProModel,
      downloadPresetPaths: [...store.downloadPresetPaths],
      useUploadFilenameAsNodeTitle: store.useUploadFilenameAsNodeTitle,
      storyboardGenKeepStyleConsistent: store.storyboardGenKeepStyleConsistent,
      storyboardGenDisableTextInImage: store.storyboardGenDisableTextInImage,
      storyboardGenAutoInferEmptyFrame: store.storyboardGenAutoInferEmptyFrame,
      ignoreAtTagWhenCopyingAndGenerating: store.ignoreAtTagWhenCopyingAndGenerating,
      enableStoryboardGenGridPreviewShortcut: store.enableStoryboardGenGridPreviewShortcut,
      showStoryboardGenAdvancedRatioControls: store.showStoryboardGenAdvancedRatioControls,
      showNodePrice: store.showNodePrice,
      priceDisplayCurrencyMode: store.priceDisplayCurrencyMode,
      usdToCnyRate: String(store.usdToCnyRate),
      preferDiscountedPrice: store.preferDiscountedPrice,
      grsaiCreditTierId: store.grsaiCreditTierId,
      uiRadiusPreset: store.uiRadiusPreset,
      themeTonePreset: store.themeTonePreset,
      accentColor: store.accentColor,
      canvasEdgeRoutingMode: store.canvasEdgeRoutingMode,
      autoCheckAppUpdateOnLaunch: store.autoCheckAppUpdateOnLaunch,
      enableUpdateDialog: store.enableUpdateDialog,
    });
  }, [store]);

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
  }, [draft, store]);

  return { draft, updateDraft, commitDraft };
}