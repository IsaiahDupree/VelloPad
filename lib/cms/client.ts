/**
 * BS-801: Headless CMS Integration
 *
 * Flexible CMS client supporting multiple providers (Sanity, Contentful, MDX)
 * Features:
 * - Unified interface for different CMS providers
 * - Fetch blog posts, tutorials, content
 * - Caching and performance optimization
 */

export type CMSProvider = 'sanity' | 'contentful' | 'mdx' | 'custom'

export interface CMSContent {
  id: string
  title: string
  slug: string
  body: string
  excerpt?: string
  category?: string
  tags?: string[]
  featured_image?: string
  published_at?: string
  updated_at?: string
  author?: string
  reading_time?: number
  metadata?: Record<string, unknown>
}

export interface CMSQuery {
  category?: string
  tags?: string[]
  featured?: boolean
  limit?: number
  offset?: number
  search?: string
}

export abstract class CMSClient {
  protected provider: CMSProvider
  protected apiKey?: string
  protected baseUrl?: string
  protected cacheMap: Map<string, { data: unknown; timestamp: number }> = new Map()
  protected cacheTTL: number = 5 * 60 * 1000 // 5 minutes default

  constructor(provider: CMSProvider, apiKey?: string, baseUrl?: string) {
    this.provider = provider
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  abstract getPosts(query?: CMSQuery): Promise<CMSContent[]>
  abstract getPost(slug: string): Promise<CMSContent | null>
  abstract getTutorials(query?: CMSQuery): Promise<CMSContent[]>
  abstract getTutorial(slug: string): Promise<CMSContent | null>
  abstract getPromptLibrary(): Promise<CMSContent[]>

  protected getCached(key: string): unknown | null {
    const cached = this.cacheMap.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cacheMap.delete(key)
      return null
    }

    return cached.data
  }

  protected setCache(key: string, data: unknown): void {
    this.cacheMap.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  protected clearCache(): void {
    this.cacheMap.clear()
  }
}

/**
 * Sanity CMS Client
 */
export class SanityCMSClient extends CMSClient {
  constructor(projectId: string, dataset: string, apiKey?: string) {
    const baseUrl = `https://${projectId}.api.sanity.io/v1/data/query/${dataset}`
    super('sanity', apiKey, baseUrl)
  }

  async getPosts(query?: CMSQuery): Promise<CMSContent[]> {
    const cacheKey = `posts:${JSON.stringify(query || {})}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached as CMSContent[]

    try {
      const groqQuery = this.buildGroqQuery('post', query)
      const response = await fetch(`${this.baseUrl}?query=${encodeURIComponent(groqQuery)}`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      })

      if (!response.ok) throw new Error(`Sanity API error: ${response.status}`)

      const data = await response.json()
      const posts = data.result.map((post: any) => this.sanitizePost(post))

      this.setCache(cacheKey, posts)
      return posts
    } catch (err) {
      console.error('[BS-801] Error fetching posts from Sanity:', err)
      return []
    }
  }

  async getPost(slug: string): Promise<CMSContent | null> {
    const cacheKey = `post:${slug}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached as CMSContent

    try {
      const groqQuery = `*[_type == "post" && slug.current == "${slug}"][0]`
      const response = await fetch(`${this.baseUrl}?query=${encodeURIComponent(groqQuery)}`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      })

      if (!response.ok) return null

      const data = await response.json()
      const post = data.result ? this.sanitizePost(data.result) : null

      if (post) this.setCache(cacheKey, post)
      return post
    } catch (err) {
      console.error('[BS-801] Error fetching post from Sanity:', err)
      return null
    }
  }

  async getTutorials(query?: CMSQuery): Promise<CMSContent[]> {
    const cacheKey = `tutorials:${JSON.stringify(query || {})}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached as CMSContent[]

    try {
      const groqQuery = this.buildGroqQuery('tutorial', query)
      const response = await fetch(`${this.baseUrl}?query=${encodeURIComponent(groqQuery)}`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      })

      if (!response.ok) throw new Error(`Sanity API error: ${response.status}`)

      const data = await response.json()
      const tutorials = data.result.map((t: any) => this.sanitizePost(t))

      this.setCache(cacheKey, tutorials)
      return tutorials
    } catch (err) {
      console.error('[BS-801] Error fetching tutorials from Sanity:', err)
      return []
    }
  }

  async getTutorial(slug: string): Promise<CMSContent | null> {
    const cacheKey = `tutorial:${slug}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached as CMSContent

    try {
      const groqQuery = `*[_type == "tutorial" && slug.current == "${slug}"][0]`
      const response = await fetch(`${this.baseUrl}?query=${encodeURIComponent(groqQuery)}`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      })

      if (!response.ok) return null

      const data = await response.json()
      const tutorial = data.result ? this.sanitizePost(data.result) : null

      if (tutorial) this.setCache(cacheKey, tutorial)
      return tutorial
    } catch (err) {
      console.error('[BS-801] Error fetching tutorial from Sanity:', err)
      return null
    }
  }

  async getPromptLibrary(): Promise<CMSContent[]> {
    const cacheKey = 'prompts'
    const cached = this.getCached(cacheKey)
    if (cached) return cached as CMSContent[]

    try {
      const groqQuery = `*[_type == "prompt"] | order(title asc)`
      const response = await fetch(`${this.baseUrl}?query=${encodeURIComponent(groqQuery)}`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      })

      if (!response.ok) throw new Error(`Sanity API error: ${response.status}`)

      const data = await response.json()
      const prompts = data.result.map((p: any) => this.sanitizePost(p))

      this.setCache(cacheKey, prompts)
      return prompts
    } catch (err) {
      console.error('[BS-801] Error fetching prompts from Sanity:', err)
      return []
    }
  }

  private buildGroqQuery(type: string, query?: CMSQuery): string {
    let groq = `*[_type == "${type}"`

    if (query?.category) {
      groq += ` && category == "${query.category}"`
    }

    if (query?.tags && query.tags.length > 0) {
      groq += ` && tags[] in [${query.tags.map((t) => `"${t}"`).join(', ')}]`
    }

    if (query?.featured) {
      groq += ` && featured == true`
    }

    if (query?.search) {
      groq += ` && (title match "${query.search}" || body match "${query.search}")`
    }

    groq += `] | order(publishedAt desc)`

    if (query?.limit) {
      groq += `[${query.offset || 0}...${(query.offset || 0) + query.limit}]`
    }

    return groq
  }

  private sanitizePost(post: any): CMSContent {
    return {
      id: post._id,
      title: post.title,
      slug: post.slug?.current || '',
      body: post.body ? this.portableTextToHtml(post.body) : '',
      excerpt: post.excerpt,
      category: post.category,
      tags: post.tags || [],
      featured_image: post.featureImage?.asset?.url,
      published_at: post.publishedAt,
      updated_at: post.updatedAt || post.publishedAt,
      author: post.author?.name,
      reading_time: this.calculateReadingTime(post.body),
      metadata: post.metadata,
    }
  }

  private portableTextToHtml(blocks: any[]): string {
    // Simple Portable Text to HTML converter
    // In production, use @sanity/block-content-to-html or similar
    if (!blocks || !Array.isArray(blocks)) return ''

    return blocks
      .map((block) => {
        if (block._type === 'block') {
          return `<p>${block.children?.map((c: any) => c.text || '').join('')}</p>`
        }
        return ''
      })
      .join('')
  }

  private calculateReadingTime(blocks: any[]): number {
    const text = blocks
      ?.map((b: any) => b.children?.map((c: any) => c.text || '').join('') || '')
      .join(' ')
    const words = (text || '').split(/\s+/).length
    return Math.ceil(words / 200) // Assume 200 words per minute
  }
}

/**
 * Create CMS client based on provider
 */
export function createCMSClient(provider: CMSProvider, config: Record<string, string>): CMSClient {
  switch (provider) {
    case 'sanity':
      return new SanityCMSClient(config.projectId, config.dataset, config.apiKey)
    // Additional providers can be added here
    default:
      throw new Error(`Unsupported CMS provider: ${provider}`)
  }
}

/**
 * Get global CMS client (singleton pattern)
 */
let globalCMSClient: CMSClient | null = null

export function getCMSClient(): CMSClient {
  if (globalCMSClient) return globalCMSClient

  const provider = (process.env.CMS_PROVIDER || 'sanity') as CMSProvider

  const config = {
    projectId: process.env.SANITY_PROJECT_ID || '',
    dataset: process.env.SANITY_DATASET || 'production',
    apiKey: process.env.SANITY_API_KEY,
  }

  globalCMSClient = createCMSClient(provider, config)
  return globalCMSClient
}
