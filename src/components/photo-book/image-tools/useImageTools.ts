/**
 * useImageTools Hook (PB-023)
 *
 * Hook for managing image crop/rotate operations
 */

'use client';

import { useState } from 'react';
import { CropData } from './CropRotateTool';

export interface ImageWithCrop {
  id: string;
  url: string;
  crop?: CropData;
}

export function useImageTools() {
  const [selectedImage, setSelectedImage] = useState<ImageWithCrop | null>(null);

  const openCropTool = (image: ImageWithCrop) => {
    setSelectedImage(image);
  };

  const closeCropTool = () => {
    setSelectedImage(null);
  };

  const saveCrop = async (imageId: string, cropData: CropData) => {
    try {
      // Save crop data to backend
      const response = await fetch(`/api/photo-book/images/${imageId}/crop`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crop: cropData }),
      });

      if (!response.ok) {
        throw new Error('Failed to save crop data');
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving crop:', error);
      return { success: false, error };
    }
  };

  return {
    selectedImage,
    openCropTool,
    closeCropTool,
    saveCrop,
  };
}
