/**
 * Stock Interior Library
 * Pre-approved interior PDFs for cover-only notebook mode
 */

export interface StockInterior {
  id: string
  name: string
  description: string
  category: 'lined' | 'dotted' | 'blank' | 'grid' | 'planner' | 'bullet' | 'music' | 'calendar'
  pageCount: number
  pageSize: string // e.g., '5.5x8.5', '6x9', '8.5x11'
  paperWeight: string // e.g., '60lb', '70lb', '80lb'
  lineSpacing?: string // For lined pages, e.g., '0.25in', '7mm'
  dotSpacing?: string // For dotted pages, e.g., '0.2in', '5mm'
  gridSize?: string // For grid pages, e.g., '0.25in', '5mm'
  color: 'white' | 'cream' | 'gray'
  printReady: boolean
  pdfUrl?: string // URL to pre-generated PDF (will be stored in storage)
  thumbnailUrl?: string
  metadata: {
    dpi: number
    colorSpace: string
    bleed: string
    margins: {
      top: string
      bottom: string
      left: string
      right: string
    }
  }
  tags: string[]
  popular: boolean
  createdAt: string
}

/**
 * Stock interior catalog
 * These are pre-approved templates ready for print
 */
export const STOCK_INTERIORS: StockInterior[] = [
  // Lined Notebooks
  {
    id: 'lined-6x9-college',
    name: 'College Ruled Lined',
    description: 'Classic college-ruled lined pages, perfect for note-taking',
    category: 'lined',
    pageCount: 100,
    pageSize: '6x9',
    paperWeight: '60lb',
    lineSpacing: '0.28in',
    color: 'white',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.75in',
        bottom: '0.75in',
        left: '1.25in',
        right: '0.75in'
      }
    },
    tags: ['lined', 'college', 'notes', 'journal'],
    popular: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'lined-6x9-wide',
    name: 'Wide Ruled Lined',
    description: 'Wide-ruled lines for comfortable writing',
    category: 'lined',
    pageCount: 100,
    pageSize: '6x9',
    paperWeight: '60lb',
    lineSpacing: '0.375in',
    color: 'cream',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.75in',
        bottom: '0.75in',
        left: '1.25in',
        right: '0.75in'
      }
    },
    tags: ['lined', 'wide', 'notes', 'journal'],
    popular: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'lined-5.5x8.5-pocket',
    name: 'Pocket Notebook Lined',
    description: 'Compact lined pages for on-the-go note-taking',
    category: 'lined',
    pageCount: 80,
    pageSize: '5.5x8.5',
    paperWeight: '60lb',
    lineSpacing: '0.28in',
    color: 'white',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.5in',
        bottom: '0.5in',
        left: '1in',
        right: '0.5in'
      }
    },
    tags: ['lined', 'pocket', 'compact'],
    popular: false,
    createdAt: '2026-01-01T00:00:00Z'
  },

  // Dotted Notebooks
  {
    id: 'dotted-6x9-standard',
    name: 'Dot Grid Standard',
    description: 'Popular dot grid pattern for bullet journaling and sketching',
    category: 'dotted',
    pageCount: 100,
    pageSize: '6x9',
    paperWeight: '70lb',
    dotSpacing: '0.2in',
    color: 'white',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.75in',
        bottom: '0.75in',
        left: '0.75in',
        right: '0.75in'
      }
    },
    tags: ['dotted', 'bullet', 'journal', 'sketch'],
    popular: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'dotted-8.5x11-large',
    name: 'Dot Grid Large',
    description: 'Large format dot grid for planning and design work',
    category: 'dotted',
    pageCount: 120,
    pageSize: '8.5x11',
    paperWeight: '70lb',
    dotSpacing: '0.25in',
    color: 'white',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '1in',
        bottom: '1in',
        left: '1in',
        right: '1in'
      }
    },
    tags: ['dotted', 'large', 'planning', 'design'],
    popular: false,
    createdAt: '2026-01-01T00:00:00Z'
  },

  // Blank Notebooks
  {
    id: 'blank-6x9-sketch',
    name: 'Blank Sketchbook',
    description: 'Blank pages for drawing, sketching, and creative work',
    category: 'blank',
    pageCount: 100,
    pageSize: '6x9',
    paperWeight: '80lb',
    color: 'white',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in'
      }
    },
    tags: ['blank', 'sketch', 'drawing', 'art'],
    popular: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'blank-8.5x11-art',
    name: 'Art Journal Blank',
    description: 'Large blank pages on heavy paper stock',
    category: 'blank',
    pageCount: 80,
    pageSize: '8.5x11',
    paperWeight: '80lb',
    color: 'cream',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in'
      }
    },
    tags: ['blank', 'art', 'large', 'drawing'],
    popular: false,
    createdAt: '2026-01-01T00:00:00Z'
  },

  // Grid Notebooks
  {
    id: 'grid-6x9-quad',
    name: 'Quad Grid',
    description: 'Square grid pattern for math, engineering, and design',
    category: 'grid',
    pageCount: 100,
    pageSize: '6x9',
    paperWeight: '60lb',
    gridSize: '0.25in',
    color: 'white',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.75in',
        bottom: '0.75in',
        left: '0.75in',
        right: '0.75in'
      }
    },
    tags: ['grid', 'math', 'engineering', 'technical'],
    popular: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'grid-8.5x11-engineering',
    name: 'Engineering Grid',
    description: 'Large format grid for technical drawings and schematics',
    category: 'grid',
    pageCount: 100,
    pageSize: '8.5x11',
    paperWeight: '70lb',
    gridSize: '0.2in',
    color: 'white',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in'
      }
    },
    tags: ['grid', 'engineering', 'technical', 'large'],
    popular: false,
    createdAt: '2026-01-01T00:00:00Z'
  },

  // Planner Layouts
  {
    id: 'planner-6x9-weekly',
    name: 'Weekly Planner',
    description: 'Weekly spread layout for planning and scheduling',
    category: 'planner',
    pageCount: 104, // 52 weeks
    pageSize: '6x9',
    paperWeight: '60lb',
    color: 'white',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in'
      }
    },
    tags: ['planner', 'weekly', 'schedule', 'productivity'],
    popular: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'planner-8.5x11-daily',
    name: 'Daily Planner',
    description: 'One page per day for detailed planning',
    category: 'planner',
    pageCount: 365,
    pageSize: '8.5x11',
    paperWeight: '60lb',
    color: 'white',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.75in',
        bottom: '0.75in',
        left: '0.75in',
        right: '0.75in'
      }
    },
    tags: ['planner', 'daily', 'schedule', 'productivity'],
    popular: true,
    createdAt: '2026-01-01T00:00:00Z'
  },

  // Bullet Journal
  {
    id: 'bullet-6x9-standard',
    name: 'Bullet Journal',
    description: 'Dot grid with index and monthly pages for bullet journaling',
    category: 'bullet',
    pageCount: 120,
    pageSize: '6x9',
    paperWeight: '70lb',
    dotSpacing: '0.2in',
    color: 'cream',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.75in',
        bottom: '0.75in',
        left: '0.75in',
        right: '0.75in'
      }
    },
    tags: ['bullet', 'journal', 'dotted', 'planning'],
    popular: true,
    createdAt: '2026-01-01T00:00:00Z'
  },

  // Music Manuscript
  {
    id: 'music-6x9-staff',
    name: 'Music Manuscript',
    description: 'Blank music staff paper for composition',
    category: 'music',
    pageCount: 100,
    pageSize: '6x9',
    paperWeight: '60lb',
    color: 'white',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.75in',
        bottom: '0.75in',
        left: '0.75in',
        right: '0.75in'
      }
    },
    tags: ['music', 'staff', 'composition', 'notation'],
    popular: false,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'music-8.5x11-staff-large',
    name: 'Music Manuscript Large',
    description: 'Large format music staff paper',
    category: 'music',
    pageCount: 100,
    pageSize: '8.5x11',
    paperWeight: '60lb',
    color: 'white',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.75in',
        bottom: '0.75in',
        left: '0.75in',
        right: '0.75in'
      }
    },
    tags: ['music', 'staff', 'composition', 'large'],
    popular: false,
    createdAt: '2026-01-01T00:00:00Z'
  },

  // Calendar
  {
    id: 'calendar-8.5x11-monthly',
    name: 'Monthly Calendar',
    description: '12-month calendar with notes section',
    category: 'calendar',
    pageCount: 24, // 12 months x 2 pages
    pageSize: '8.5x11',
    paperWeight: '60lb',
    color: 'white',
    printReady: true,
    metadata: {
      dpi: 300,
      colorSpace: 'CMYK',
      bleed: '0.125in',
      margins: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in'
      }
    },
    tags: ['calendar', 'monthly', 'planning', 'schedule'],
    popular: true,
    createdAt: '2026-01-01T00:00:00Z'
  }
]

/**
 * Get all stock interiors
 */
export function getAllStockInteriors(): StockInterior[] {
  return STOCK_INTERIORS
}

/**
 * Get stock interior by ID
 */
export function getStockInteriorById(id: string): StockInterior | undefined {
  return STOCK_INTERIORS.find(interior => interior.id === id)
}

/**
 * Get stock interiors by category
 */
export function getStockInteriorsByCategory(category: StockInterior['category']): StockInterior[] {
  return STOCK_INTERIORS.filter(interior => interior.category === category)
}

/**
 * Get popular stock interiors
 */
export function getPopularStockInteriors(): StockInterior[] {
  return STOCK_INTERIORS.filter(interior => interior.popular)
}

/**
 * Get stock interiors by page size
 */
export function getStockInteriorsByPageSize(pageSize: string): StockInterior[] {
  return STOCK_INTERIORS.filter(interior => interior.pageSize === pageSize)
}

/**
 * Search stock interiors by tags
 */
export function searchStockInteriors(query: string): StockInterior[] {
  const lowerQuery = query.toLowerCase()
  return STOCK_INTERIORS.filter(interior =>
    interior.name.toLowerCase().includes(lowerQuery) ||
    interior.description.toLowerCase().includes(lowerQuery) ||
    interior.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Get categories with counts
 */
export function getStockInteriorCategories(): Array<{ category: string, count: number }> {
  const categories = new Map<string, number>()

  STOCK_INTERIORS.forEach(interior => {
    categories.set(interior.category, (categories.get(interior.category) || 0) + 1)
  })

  return Array.from(categories.entries()).map(([category, count]) => ({
    category,
    count
  }))
}
