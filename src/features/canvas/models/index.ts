import { registerKieProvider } from "./providers/kie";
import { registerFalProvider } from "./providers/fal";
import { registerModelAlias } from "./registry";

export type { ImageModelDefinition, ModelProviderDefinition, AspectRatioOption, ExtraParamSchema } from "./types";
export {
  registerProvider,
  getProvider,
  getAllProviders,
  getModel,
  getModelByFullId,
  getModelsForProvider,
  getAllModels,
  registerModelAlias,
  resolveModelAlias,
  getModelByAlias,
} from "./registry";

// Initialize providers
export function initializeModels(): void {
  registerKieProvider();
  registerFalProvider();

  // Register model aliases
  registerModelAlias("gemini-3.1-flash", "fal/nano-banana-pro");
  registerModelAlias("banana-pro", "kie/nano-banana-pro");
  registerModelAlias("banana-2", "kie/nano-banana-2");
}

// Auto-initialize on import
initializeModels();
