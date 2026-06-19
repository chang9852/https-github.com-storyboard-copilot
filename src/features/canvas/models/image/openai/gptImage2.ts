import type { ImageModelDefinition } from '../../types';

export const OPENAI_GPT_IMAGE_2_MODEL_ID = 'openai/gpt-image-2';

export const imageModel: ImageModelDefinition = {
  id: OPENAI_GPT_IMAGE_2_MODEL_ID,
  mediaType: 'image',
  displayName: 'GPT Image 2',
  displayNameZh: 'GPT Image 2',
  providerId: 'openai',
  description: '江湖驿站 · OpenAI 兼容图像生成接口',
  eta: '1min',
  expectedDurationMs: 60000,
  defaultAspectRatio: '1:1',
  defaultResolution: '1K',
  aspectRatios: [
    { value: '1:1', label: '1:1' },
    { value: '16:9', label: '16:9' },
    { value: '9:16', label: '9:16' },
    { value: '4:3', label: '4:3' },
    { value: '3:4', label: '3:4' },
    { value: '3:2', label: '3:2' },
    { value: '2:3', label: '2:3' },
  ],
  resolutions: [
    { value: '1K', label: '1K' },
  ],
  resolveRequest: () => ({
    requestModel: OPENAI_GPT_IMAGE_2_MODEL_ID,
    modeLabel: '生成模式',
  }),
};
