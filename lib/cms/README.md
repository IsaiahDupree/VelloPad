# BS-801: Headless CMS Integration

Flexible CMS integration supporting multiple providers (Sanity, Contentful, MDX).
Single source of truth for blog posts, tutorials, prompt libraries, and marketing content.

## Features

- **Multi-Provider Support**: Easily swap between Sanity, Contentful, or custom implementations
- **Unified Interface**: Consistent API regardless of backend CMS
- **Caching**: Built-in caching for performance optimization
- **Content Types**: Blog posts, tutorials, prompts, marketing guides
- **Filtering**: Search, filter by category/tags, pagination support
- **Reading Time**: Automatic calculation for blog content

## Supported CMS Providers

### Sanity CMS

Configure with environment variables:
```env
CMS_PROVIDER=sanity
SANITY_PROJECT_ID=your-project-id
SANITY_DATASET=production
SANITY_API_KEY=your-api-key  # Optional for public datasets
```

## Usage

### Get Blog Posts

```typescript
import { getCMSClient } from '@/lib/cms/client'

const cms = getCMSClient()
const posts = await cms.getPosts({
  category: 'marketing',
  tags: ['growth', 'strategy'],
  featured: true,
  limit: 10,
  offset: 0
})
```

### Get Single Post

```typescript
const post = await cms.getPost('how-to-launch-your-book')
if (post) {
  console.log(post.title)
  console.log(post.body)
  console.log(post.reading_time)
}
```

### Get Tutorials

```typescript
const tutorials = await cms.getTutorials({
  category: 'editor',
  limit: 20
})
```

### Get Prompt Library

```typescript
const prompts = await cms.getPromptLibrary()
```

## API Endpoints

### List Blog Posts

```
GET /api/cms/posts?category=marketing&tags=growth&featured=true&limit=10&offset=0
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "post-1",
      "title": "How to Launch Your Book",
      "slug": "how-to-launch-your-book",
      "excerpt": "A complete guide...",
      "category": "marketing",
      "tags": ["growth", "strategy"],
      "featured_image": "https://...",
      "published_at": "2026-01-15T00:00:00Z",
      "author": "Jane Doe",
      "reading_time": 5,
      "body": "<p>...</p>"
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 10,
    "total": 1
  }
}
```

### Get Single Post

```
GET /api/cms/posts/how-to-launch-your-book
```

### List Tutorials

```
GET /api/cms/tutorials?category=editor&limit=20
```

### Get Single Tutorial

```
GET /api/cms/tutorials/tiptap-editor-basics
```

### Get Prompt Library

```
GET /api/cms/prompts
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "prompt-1",
      "title": "Rewrite for Clarity",
      "slug": "rewrite-for-clarity",
      "body": "Take the following text and rewrite it for maximum clarity...",
      "category": "writing"
    }
  ],
  "total": 42
}
```

## Sanity Schema Setup

For Sanity CMS integration, create these document types:

```javascript
// schemas/post.js
export default {
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Title',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      type: 'slug',
      title: 'Slug',
      options: {
        source: 'title'
      }
    },
    {
      name: 'excerpt',
      type: 'text',
      title: 'Excerpt'
    },
    {
      name: 'body',
      type: 'array',
      of: [{ type: 'block' }],
      title: 'Body'
    },
    {
      name: 'category',
      type: 'string',
      title: 'Category'
    },
    {
      name: 'tags',
      type: 'array',
      of: [{ type: 'string' }],
      title: 'Tags'
    },
    {
      name: 'featureImage',
      type: 'image',
      title: 'Feature Image'
    },
    {
      name: 'publishedAt',
      type: 'datetime',
      title: 'Published At'
    },
    {
      name: 'author',
      type: 'object',
      title: 'Author',
      fields: [
        { name: 'name', type: 'string' },
        { name: 'bio', type: 'text' }
      ]
    }
  ]
}

// schemas/tutorial.js
export default {
  name: 'tutorial',
  title: 'Tutorial',
  type: 'document',
  fields: [
    // Same fields as post, plus:
    {
      name: 'difficulty',
      type: 'string',
      options: {
        list: ['beginner', 'intermediate', 'advanced']
      }
    },
    {
      name: 'duration',
      type: 'number',
      title: 'Duration (minutes)'
    }
  ]
}

// schemas/prompt.js
export default {
  name: 'prompt',
  title: 'Writing Prompt',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    {
      name: 'body',
      type: 'text',
      title: 'Prompt Text'
    },
    { name: 'category', type: 'string' }
  ]
}
```

## In-App Help Center

Use CMS content in the app's help center:

```typescript
// app/(app)/help/[slug]/page.tsx
import { getCMSClient } from '@/lib/cms/client'

export default async function HelpPage({
  params
}: {
  params: { slug: string }
}) {
  const cms = getCMSClient()
  const content = await cms.getTutorial(params.slug)

  if (!content) return <NotFound />

  return (
    <article>
      <h1>{content.title}</h1>
      <p className="text-muted-foreground">
        {content.reading_time} min read
      </p>
      <div dangerouslySetInnerHTML={{ __html: content.body }} />
    </article>
  )
}
```

## Frontend Components

### Blog Post List

```typescript
// components/cms/BlogPostList.tsx
import { getCMSClient } from '@/lib/cms/client'

export async function BlogPostList() {
  const cms = getCMSClient()
  const posts = await cms.getPosts({
    featured: true,
    limit: 5
  })

  return (
    <div className="grid gap-4">
      {posts.map(post => (
        <article key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
          <a href={`/blog/${post.slug}`}>
            Read more →
          </a>
        </article>
      ))}
    </div>
  )
}
```

## Performance Considerations

1. **Caching**: 5-minute default TTL for reduced API calls
2. **Static Generation**: Pre-render common pages at build time
3. **ISR**: Use Incremental Static Regeneration for blog posts
4. **API Deduplication**: Multiple requests for same content use cache

## Environment Variables

```env
# CMS Configuration
CMS_PROVIDER=sanity
SANITY_PROJECT_ID=
SANITY_DATASET=production
SANITY_API_KEY=
```

## Future Enhancements

- Contentful provider implementation
- MDX file-based content support
- Webhook support for on-demand ISR
- Full-text search integration
- Content versioning and scheduling
- Multilingual content support

## Related Features

- **BS-204**: Book Dashboard - Display tips from CMS
- **BS-702**: Lifecycle Emails - Reference CMS content
- **BS-802**: Marketing Hub - Curated CMS content for users
