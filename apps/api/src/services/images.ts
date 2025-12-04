import sharp from 'sharp'
import { createReadStream, existsSync } from 'fs'
import { mkdir, stat, readFile, writeFile } from 'fs/promises'
import path from 'path'

// Cache directory for converted images
const CACHE_PATH = process.env.IMAGE_CACHE_PATH ?? './data/cache/images'

interface ImageOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
}

const DEFAULT_OPTIONS: Required<ImageOptions> = {
  width: 0, // 0 means no resize
  height: 0,
  quality: 80,
  format: 'webp',
}

/**
 * Get cache key for an image with specific options
 */
function getCacheKey(sourcePath: string, options: ImageOptions): string {
  const { width, height, quality, format } = { ...DEFAULT_OPTIONS, ...options }
  const basename = path.basename(sourcePath, path.extname(sourcePath))
  const dirname = path.dirname(sourcePath)
  const key = `${dirname}/${basename}_w${width}_h${height}_q${quality}.${format}`
  return key.replace(/\//g, '_')
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  if (!existsSync(CACHE_PATH)) {
    await mkdir(CACHE_PATH, { recursive: true })
  }
}

/**
 * Check if a cached version exists and is newer than source
 */
async function getCachedImage(
  sourcePath: string,
  options: ImageOptions,
): Promise<Buffer | null> {
  try {
    const cacheKey = getCacheKey(sourcePath, options)
    const cachePath = path.join(CACHE_PATH, cacheKey)

    if (!existsSync(cachePath)) {
      return null
    }

    // Check if cache is newer than source
    const [sourceStats, cacheStats] = await Promise.all([
      stat(sourcePath),
      stat(cachePath),
    ])

    if (cacheStats.mtimeMs < sourceStats.mtimeMs) {
      // Source is newer, cache is stale
      return null
    }

    return await readFile(cachePath)
  } catch {
    return null
  }
}

/**
 * Save image to cache
 */
async function cacheImage(
  sourcePath: string,
  options: ImageOptions,
  buffer: Buffer,
): Promise<void> {
  try {
    await ensureCacheDir()
    const cacheKey = getCacheKey(sourcePath, options)
    const cachePath = path.join(CACHE_PATH, cacheKey)
    await writeFile(cachePath, buffer)
  } catch (error) {
    // Cache write failures are non-critical, just log
    console.error('Failed to cache image:', error)
  }
}

/**
 * Convert and optionally resize an image
 * Returns optimized image buffer with content type
 */
export async function optimizeImage(
  sourcePath: string,
  options: ImageOptions = {},
): Promise<{ buffer: Buffer; contentType: string }> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Check cache first
  const cached = await getCachedImage(sourcePath, opts)
  if (cached) {
    return {
      buffer: cached,
      contentType: `image/${opts.format}`,
    }
  }

  // Read and process image
  let pipeline = sharp(sourcePath)

  // Resize if dimensions specified
  if (opts.width > 0 || opts.height > 0) {
    pipeline = pipeline.resize(
      opts.width > 0 ? opts.width : undefined,
      opts.height > 0 ? opts.height : undefined,
      { fit: 'inside', withoutEnlargement: true },
    )
  }

  // Convert to target format
  switch (opts.format) {
    case 'webp':
      pipeline = pipeline.webp({ quality: opts.quality })
      break
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: opts.quality })
      break
    case 'png':
      pipeline = pipeline.png({ quality: opts.quality })
      break
  }

  const buffer = await pipeline.toBuffer()

  // Cache the result (async, non-blocking)
  cacheImage(sourcePath, opts, buffer).catch(() => {})

  return {
    buffer,
    contentType: `image/${opts.format}`,
  }
}

/**
 * Stream an image with optional optimization
 * For large images or when streaming is preferred
 */
export function createOptimizedStream(
  sourcePath: string,
  options: ImageOptions = {},
): { stream: NodeJS.ReadableStream; contentType: string } {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  let pipeline = sharp()

  // Resize if dimensions specified
  if (opts.width > 0 || opts.height > 0) {
    pipeline = pipeline.resize(
      opts.width > 0 ? opts.width : undefined,
      opts.height > 0 ? opts.height : undefined,
      { fit: 'inside', withoutEnlargement: true },
    )
  }

  // Convert to target format
  switch (opts.format) {
    case 'webp':
      pipeline = pipeline.webp({ quality: opts.quality })
      break
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: opts.quality })
      break
    case 'png':
      pipeline = pipeline.png({ quality: opts.quality })
      break
  }

  // Pipe source through sharp
  const sourceStream = createReadStream(sourcePath)
  const outputStream = sourceStream.pipe(pipeline)

  return {
    stream: outputStream,
    contentType: `image/${opts.format}`,
  }
}

/**
 * Determine best image format based on Accept header
 */
export function getBestFormat(acceptHeader: string | undefined): 'webp' | 'jpeg' {
  if (!acceptHeader) {
    return 'jpeg'
  }

  // Check if client supports WebP
  if (acceptHeader.includes('image/webp')) {
    return 'webp'
  }

  return 'jpeg'
}
