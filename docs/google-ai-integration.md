# Google AI Integration Guide

## Overview

VelloPad now includes testing capabilities for Google's AI services:
- **Imagen 3**: High-quality image generation for notebook covers and designs
- **Veo**: Video generation for product showcases and before/after transitions

## Quick Start

### 1. Navigate to test directory
```bash
cd tests/google-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure API key
Create a `.env` file:
```bash
cp .env.example .env
```

Add your Google AI API key (get it from [Google AI Studio](https://makersuite.google.com/app/apikey)):
```
GOOGLE_AI_API_KEY=your-api-key-here
```

### 4. Run tests
```bash
# Test image generation
npm run test:image

# Test video generation
npm run test:video

# Run all tests
npm run test:all
```

## Features

### Image Generation (Imagen 3)
- Generate custom notebook cover designs
- Multiple aspect ratios (1:1, 16:9, 9:16, 4:3, 3:4)
- High-quality product photography style
- Automatic file saving with metadata

### Video Generation (Veo)
- Text-to-video generation
- Before/after frame transitions
- Customizable duration (3-10 seconds)
- Product showcase animations

## Use Cases

### 1. Cover Design Variations
Generate multiple design options for A/B testing:
```typescript
await generateImage({
  prompt: 'Minimalist notebook cover with geometric patterns',
  aspectRatio: '3:4',
  outputDir: './output/covers',
});
```

### 2. Product Showcase Videos
Create marketing videos:
```typescript
await generateVideo({
  prompt: 'Professional rotating view of premium notebook',
  duration: 5,
  outputDir: './output/marketing',
});
```

### 3. Customization Previews
Show before/after transformations:
```typescript
await generateVideo({
  prompt: 'Smooth transition showing customization',
  beforeFrame: './stock.png',
  afterFrame: './custom.png',
  duration: 3,
});
```

## Integration Roadmap

### Phase 1: Testing (Current)
- ✅ Standalone test scripts
- ✅ Image generation testing
- ✅ Video generation testing
- ✅ Documentation

### Phase 2: API Integration
- [ ] Add to main app dependencies
- [ ] Create service wrappers
- [ ] Build API routes
- [ ] Add error handling & retries

### Phase 3: UI Integration
- [ ] Cover design generator UI
- [ ] Video preview component
- [ ] Template marketplace integration
- [ ] Batch generation tools

### Phase 4: Production Features
- [ ] Caching layer
- [ ] Cost optimization
- [ ] Quality control workflow
- [ ] Analytics & monitoring

## Pricing Considerations

### Imagen 3
- ~$0.04 per standard image
- ~$0.08 per HD image

### Veo
- ~$0.10 per second of video
- 5-second video ≈ $0.50

**Cost optimization strategies:**
1. Cache generated assets
2. Generate in batches
3. Use for final designs only
4. Implement approval workflow

## Technical Details

### Models Used
- **Imagen**: `imagen-3.0-generate-001`
- **Veo**: `veo-001`

### Output Formats
- **Images**: PNG (base64 decoded)
- **Videos**: MP4/WebM (base64 decoded)

### File Structure
```
tests/google-ai/
├── test-image-generation.ts    # Image generation script
├── test-video-generation.ts    # Video generation script
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── .env.example                # Environment template
├── README.md                   # Detailed documentation
└── output/                     # Generated files
    ├── images/
    └── videos/
```

## Next Steps

1. **Test the APIs**: Run the test scripts to verify functionality
2. **Review outputs**: Check generated images and videos
3. **Adjust prompts**: Refine prompts for better results
4. **Plan integration**: Decide which features to integrate first

## Resources

- [Test Suite README](../tests/google-ai/README.md)
- [Google AI Studio](https://makersuite.google.com/)
- [Imagen Documentation](https://ai.google.dev/docs/imagen)
- [Veo Documentation](https://ai.google.dev/docs/veo)

## Support

The TypeScript errors about missing `@google/generative-ai` module will resolve once you run `npm install` in the `tests/google-ai` directory.
