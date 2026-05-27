import { invoke } from "@tauri-apps/api/core";
import type { ImageSplitGateway } from "../application/ports";

export class TauriImageSplitGateway implements ImageSplitGateway {
  async split(
    imageSource: string,
    rows: number,
    cols: number,
    lineThickness: number
  ): Promise<string[]> {
    const result = await invoke<string[]>("split_image_source", {
      source: imageSource,
      rows,
      cols,
      lineThickness,
    });
    return result;
  }
}

export const tauriImageSplitGateway = new TauriImageSplitGateway();
