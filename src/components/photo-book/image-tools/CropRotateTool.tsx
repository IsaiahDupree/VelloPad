/**
 * Crop & Rotate Tools (PB-023)
 *
 * Individual image cropping and rotation within photo book layouts
 * Dependencies: PB-019 (Manual Layout Adjustment)
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import {
  RotateCw,
  RotateCcw,
  Crop,
  ZoomIn,
  ZoomOut,
  Move,
  Check,
  X,
} from 'lucide-react';

interface CropRotateToolProps {
  imageUrl: string;
  onSave: (cropData: CropData) => void;
  onCancel: () => void;
  initialCrop?: CropData;
}

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zoom: number;
}

export function CropRotateTool({
  imageUrl,
  onSave,
  onCancel,
  initialCrop,
}: CropRotateToolProps) {
  const [rotation, setRotation] = useState(initialCrop?.rotation || 0);
  const [zoom, setZoom] = useState(initialCrop?.zoom || 1);
  const [crop, setCrop] = useState<CropData>(
    initialCrop || {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      zoom: 1,
    }
  );

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load image
  useEffect(() => {
    if (!imageRef.current) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      img.onload = () => {
        imageRef.current = img;
        renderCanvas();
      };
    }
  }, [imageUrl]);

  // Re-render canvas when crop/rotation/zoom changes
  useEffect(() => {
    renderCanvas();
  }, [rotation, zoom, crop]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Translate to center
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply zoom
    ctx.scale(zoom, zoom);

    // Draw image centered
    const imgWidth = img.width;
    const imgHeight = img.height;
    ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);

    // Restore context
    ctx.restore();

    // Draw crop overlay
    drawCropOverlay(ctx, canvas.width, canvas.height);
  };

  const drawCropOverlay = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Crop area (clear the overlay)
    const cropX = (canvasWidth * crop.x) / 100;
    const cropY = (canvasHeight * crop.y) / 100;
    const cropWidth = (canvasWidth * crop.width) / 100;
    const cropHeight = (canvasHeight * crop.height) / 100;

    ctx.clearRect(cropX, cropY, cropWidth, cropHeight);

    // Draw crop border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);

    // Draw corner handles
    const handleSize = 10;
    ctx.fillStyle = '#ffffff';
    [
      { x: cropX, y: cropY },
      { x: cropX + cropWidth, y: cropY },
      { x: cropX, y: cropY + cropHeight },
      { x: cropX + cropWidth, y: cropY + cropHeight },
    ].forEach(({ x, y }) => {
      ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    });
  };

  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
  };

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  const handleSave = () => {
    const finalCrop: CropData = {
      ...crop,
      rotation,
      zoom,
    };
    onSave(finalCrop);
  };

  const handleReset = () => {
    setRotation(0);
    setZoom(1);
    setCrop({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      zoom: 1,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Crop & Rotate Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full h-auto cursor-move"
              style={{ maxHeight: '500px' }}
            />
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Rotation */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rotation</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRotate(-90)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRotate(90)}
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  {rotation}°
                </span>
              </div>
            </div>

            {/* Zoom */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ZoomIn className="w-4 h-4" />
                Zoom: {zoom.toFixed(2)}x
              </label>
              <Slider
                value={[zoom]}
                onValueChange={handleZoomChange}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Check className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
