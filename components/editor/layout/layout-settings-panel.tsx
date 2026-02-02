'use client';

import { LayoutConfig, PageNumberPosition, PageNumberFormat } from './types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface LayoutSettingsPanelProps {
  layoutConfig: LayoutConfig;
  onLayoutChange: (config: LayoutConfig) => void;
}

export function LayoutSettingsPanel({
  layoutConfig,
  onLayoutChange,
}: LayoutSettingsPanelProps) {
  const updateMargins = (key: keyof LayoutConfig['margins'], value: number) => {
    onLayoutChange({
      ...layoutConfig,
      margins: {
        ...layoutConfig.margins,
        [key]: value,
      },
    });
  };

  const updateHeader = (updates: Partial<LayoutConfig['header']>) => {
    onLayoutChange({
      ...layoutConfig,
      header: {
        ...layoutConfig.header,
        ...updates,
      },
    });
  };

  const updateFooter = (updates: Partial<LayoutConfig['footer']>) => {
    onLayoutChange({
      ...layoutConfig,
      footer: {
        ...layoutConfig.footer,
        ...updates,
      },
    });
  };

  const updatePageNumbers = (updates: Partial<LayoutConfig['pageNumbers']>) => {
    onLayoutChange({
      ...layoutConfig,
      pageNumbers: {
        ...layoutConfig.pageNumbers,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-4 p-4 overflow-y-auto h-full">
      {/* Margins */}
      <Card>
        <CardHeader>
          <CardTitle>Margins</CardTitle>
          <CardDescription>All measurements in inches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="margin-top">Top</Label>
              <Input
                id="margin-top"
                type="number"
                step="0.1"
                min="0.25"
                max="3"
                value={layoutConfig.margins.top}
                onChange={(e) => updateMargins('top', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="margin-bottom">Bottom</Label>
              <Input
                id="margin-bottom"
                type="number"
                step="0.1"
                min="0.25"
                max="3"
                value={layoutConfig.margins.bottom}
                onChange={(e) => updateMargins('bottom', parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="margin-inside">Inside</Label>
              <Input
                id="margin-inside"
                type="number"
                step="0.1"
                min="0.5"
                max="3"
                value={layoutConfig.margins.inside}
                onChange={(e) => updateMargins('inside', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="margin-outside">Outside</Label>
              <Input
                id="margin-outside"
                type="number"
                step="0.1"
                min="0.5"
                max="3"
                value={layoutConfig.margins.outside}
                onChange={(e) => updateMargins('outside', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Header</CardTitle>
            <Switch
              checked={layoutConfig.header.enabled}
              onCheckedChange={(enabled) => updateHeader({ enabled })}
            />
          </div>
        </CardHeader>
        {layoutConfig.header.enabled && (
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="header-content">Content</Label>
              <Input
                id="header-content"
                placeholder="Header text..."
                value={layoutConfig.header.content}
                onChange={(e) => updateHeader({ content: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="header-height">Height (inches)</Label>
              <Input
                id="header-height"
                type="number"
                step="0.1"
                min="0.25"
                max="2"
                value={layoutConfig.header.height}
                onChange={(e) => updateHeader({ height: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="header-style">Style</Label>
              <Select
                value={layoutConfig.header.style}
                onValueChange={(value) =>
                  updateHeader({ style: value as 'plain' | 'centered' | 'running-head' })
                }
              >
                <SelectTrigger id="header-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain">Plain</SelectItem>
                  <SelectItem value="centered">Centered</SelectItem>
                  <SelectItem value="running-head">Running Head</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Footer */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Footer</CardTitle>
            <Switch
              checked={layoutConfig.footer.enabled}
              onCheckedChange={(enabled) => updateFooter({ enabled })}
            />
          </div>
        </CardHeader>
        {layoutConfig.footer.enabled && (
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="footer-content">Content</Label>
              <Input
                id="footer-content"
                placeholder="Footer text..."
                value={layoutConfig.footer.content}
                onChange={(e) => updateFooter({ content: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer-height">Height (inches)</Label>
              <Input
                id="footer-height"
                type="number"
                step="0.1"
                min="0.25"
                max="2"
                value={layoutConfig.footer.height}
                onChange={(e) => updateFooter({ height: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer-style">Style</Label>
              <Select
                value={layoutConfig.footer.style}
                onValueChange={(value) =>
                  updateFooter({ style: value as 'plain' | 'centered' | 'running-foot' })
                }
              >
                <SelectTrigger id="footer-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain">Plain</SelectItem>
                  <SelectItem value="centered">Centered</SelectItem>
                  <SelectItem value="running-foot">Running Foot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Page Numbers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Page Numbers</CardTitle>
            <Switch
              checked={layoutConfig.pageNumbers.enabled}
              onCheckedChange={(enabled) => updatePageNumbers({ enabled })}
            />
          </div>
        </CardHeader>
        {layoutConfig.pageNumbers.enabled && (
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="page-number-position">Position</Label>
              <Select
                value={layoutConfig.pageNumbers.position}
                onValueChange={(value) =>
                  updatePageNumbers({ position: value as PageNumberPosition })
                }
              >
                <SelectTrigger id="page-number-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-left">Top Left</SelectItem>
                  <SelectItem value="top-center">Top Center</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-center">Bottom Center</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-number-format">Format</Label>
              <Select
                value={layoutConfig.pageNumbers.format}
                onValueChange={(value) =>
                  updatePageNumbers({ format: value as PageNumberFormat })
                }
              >
                <SelectTrigger id="page-number-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="decimal">1, 2, 3</SelectItem>
                  <SelectItem value="roman-lower">i, ii, iii</SelectItem>
                  <SelectItem value="roman-upper">I, II, III</SelectItem>
                  <SelectItem value="letter-lower">a, b, c</SelectItem>
                  <SelectItem value="letter-upper">A, B, C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      <Separator />

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="font-size">Font Size (pt)</Label>
            <Input
              id="font-size"
              type="number"
              min="8"
              max="18"
              value={layoutConfig.fontSize}
              onChange={(e) =>
                onLayoutChange({
                  ...layoutConfig,
                  fontSize: parseFloat(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="line-spacing">Line Spacing</Label>
            <Select
              value={layoutConfig.lineSpacing.toString()}
              onValueChange={(value) =>
                onLayoutChange({
                  ...layoutConfig,
                  lineSpacing: parseFloat(value),
                })
              }
            >
              <SelectTrigger id="line-spacing">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Single (1.0)</SelectItem>
                <SelectItem value="1.15">1.15</SelectItem>
                <SelectItem value="1.5">1.5</SelectItem>
                <SelectItem value="2">Double (2.0)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
