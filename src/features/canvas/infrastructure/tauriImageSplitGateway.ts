import { invoke } from "@tauri-apps/api/core";
import type { ImageSplitGateway } from "../application/ports";

export class TauriImageSplitGateway implements ImageSplitGateway {
  async splitImage(
    imageUrl: string,
    rows: number,
    cols: number
  ): Promise<Array<{ index: number; imageUrl: string; width: number; height: number }>> {
    const result = await invoke<Array<{ index: number; image_data: string; width: number; height: number }>>(
      "split_grid_image",
      { imageUrl, rows, cols }
    );

    // Convert base64 image data to data URLs
    return result.map((cell) => ({
      index: cell.index,
      imageUrl: `data:image/png;base64,${cell.image_data}`,
      width: cell.width,
      height: cell.height,
    }));
  }
}

export const tauriImageSplitGateway = new TauriImageSplitGateway();
