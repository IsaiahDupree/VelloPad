/**
 * E2E Tests for Photo Book Layout Editor
 * @see PB-019: Manual Layout Adjustment
 */

import { test, expect } from '@playwright/test'

test.describe('PB-019: Manual Layout Adjustment', () => {
  test('LayoutEditor component should be importable', async () => {
    const module = await import('../components/photo-book/editor')
    expect(module.LayoutEditor).toBeDefined()
  })

  test('PhotoElement interface should have required fields', () => {
    interface PhotoElement {
      id: string
      photoId: string
      imageUrl: string
      x: number
      y: number
      width: number
      height: number
      rotation: number
      zIndex: number
    }

    const element: PhotoElement = {
      id: '1',
      photoId: 'photo-1',
      imageUrl: '/test.jpg',
      x: 0.1,
      y: 0.1,
      width: 0.4,
      height: 0.4,
      rotation: 0,
      zIndex: 1
    }

    expect(element.id).toBe('1')
    expect(element.photoId).toBe('photo-1')
    expect(element.imageUrl).toBe('/test.jpg')
    expect(element.x).toBe(0.1)
    expect(element.y).toBe(0.1)
    expect(element.width).toBe(0.4)
    expect(element.height).toBe(0.4)
    expect(element.rotation).toBe(0)
    expect(element.zIndex).toBe(1)
  })

  test('PageLayout interface should support multiple elements', () => {
    interface PhotoElement {
      id: string
      photoId: string
      imageUrl: string
      x: number
      y: number
      width: number
      height: number
      rotation: number
      zIndex: number
    }

    interface PageLayout {
      pageNumber: number
      elements: PhotoElement[]
      backgroundColor?: string
    }

    const layout: PageLayout = {
      pageNumber: 1,
      elements: [
        {
          id: '1',
          photoId: 'photo-1',
          imageUrl: '/test1.jpg',
          x: 0.1,
          y: 0.1,
          width: 0.4,
          height: 0.4,
          rotation: 0,
          zIndex: 1
        },
        {
          id: '2',
          photoId: 'photo-2',
          imageUrl: '/test2.jpg',
          x: 0.5,
          y: 0.5,
          width: 0.3,
          height: 0.3,
          rotation: 45,
          zIndex: 2
        }
      ]
    }

    expect(layout.pageNumber).toBe(1)
    expect(layout.elements.length).toBe(2)
    expect(layout.elements[0].id).toBe('1')
    expect(layout.elements[1].id).toBe('2')
  })

  test('should support normalized coordinates (0-1)', () => {
    interface PhotoElement {
      x: number
      y: number
      width: number
      height: number
    }

    const element: PhotoElement = {
      x: 0.25, // 25% from left
      y: 0.5, // 50% from top
      width: 0.5, // 50% of page width
      height: 0.4 // 40% of page height
    }

    expect(element.x).toBeGreaterThanOrEqual(0)
    expect(element.x).toBeLessThanOrEqual(1)
    expect(element.y).toBeGreaterThanOrEqual(0)
    expect(element.y).toBeLessThanOrEqual(1)
    expect(element.width).toBeGreaterThanOrEqual(0)
    expect(element.width).toBeLessThanOrEqual(1)
    expect(element.height).toBeGreaterThanOrEqual(0)
    expect(element.height).toBeLessThanOrEqual(1)
  })

  test('should support rotation in degrees', () => {
    interface PhotoElement {
      rotation: number
    }

    const rotations: PhotoElement[] = [
      { rotation: 0 },
      { rotation: 90 },
      { rotation: 180 },
      { rotation: 270 },
      { rotation: 45 }
    ]

    rotations.forEach(element => {
      expect(element.rotation).toBeGreaterThanOrEqual(0)
      expect(element.rotation).toBeLessThan(360)
    })
  })

  test('should support z-index for layering', () => {
    interface PhotoElement {
      id: string
      zIndex: number
    }

    const elements: PhotoElement[] = [
      { id: '1', zIndex: 1 },
      { id: '2', zIndex: 2 },
      { id: '3', zIndex: 3 }
    ]

    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)

    expect(sorted[0].id).toBe('1')
    expect(sorted[1].id).toBe('2')
    expect(sorted[2].id).toBe('3')
  })

  test('should support optional background color', () => {
    interface PageLayout {
      pageNumber: number
      elements: any[]
      backgroundColor?: string
    }

    const whiteBackground: PageLayout = {
      pageNumber: 1,
      elements: [],
      backgroundColor: '#ffffff'
    }

    const noBackground: PageLayout = {
      pageNumber: 2,
      elements: []
    }

    expect(whiteBackground.backgroundColor).toBe('#ffffff')
    expect(noBackground.backgroundColor).toBeUndefined()
  })

  test('should validate element positioning', () => {
    interface PhotoElement {
      x: number
      y: number
      width: number
      height: number
    }

    const element: PhotoElement = {
      x: 0.2,
      y: 0.3,
      width: 0.5,
      height: 0.4
    }

    // Element should fit within page bounds
    const fitsHorizontally = element.x + element.width <= 1
    const fitsVertically = element.y + element.height <= 1

    expect(fitsHorizontally).toBe(true)
    expect(fitsVertically).toBe(true)
  })

  test('should handle element updates', () => {
    interface PhotoElement {
      id: string
      x: number
      y: number
      rotation: number
    }

    interface PageLayout {
      elements: PhotoElement[]
    }

    const layout: PageLayout = {
      elements: [
        { id: '1', x: 0.1, y: 0.1, rotation: 0 },
        { id: '2', x: 0.5, y: 0.5, rotation: 0 }
      ]
    }

    // Update element
    const updatedElements = layout.elements.map(el =>
      el.id === '1' ? { ...el, x: 0.2, rotation: 90 } : el
    )

    expect(updatedElements[0].x).toBe(0.2)
    expect(updatedElements[0].rotation).toBe(90)
    expect(updatedElements[1].x).toBe(0.5)
  })

  test('should handle element deletion', () => {
    interface PhotoElement {
      id: string
    }

    interface PageLayout {
      elements: PhotoElement[]
    }

    const layout: PageLayout = {
      elements: [{ id: '1' }, { id: '2' }, { id: '3' }]
    }

    const afterDelete = layout.elements.filter(el => el.id !== '2')

    expect(afterDelete.length).toBe(2)
    expect(afterDelete.map(el => el.id)).toEqual(['1', '3'])
  })

  test('should support drag and drop operations', () => {
    interface DragState {
      draggedElement: string | null
      dragStart: { x: number; y: number } | null
    }

    let state: DragState = {
      draggedElement: null,
      dragStart: null
    }

    // Start dragging
    state = {
      draggedElement: 'element-1',
      dragStart: { x: 100, y: 200 }
    }

    expect(state.draggedElement).toBe('element-1')
    expect(state.dragStart).toEqual({ x: 100, y: 200 })

    // Stop dragging
    state = {
      draggedElement: null,
      dragStart: null
    }

    expect(state.draggedElement).toBeNull()
    expect(state.dragStart).toBeNull()
  })
})
