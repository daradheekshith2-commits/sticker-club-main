import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export interface StorageDriver {
  save(buffer: Buffer, filename: string, mimeType: string, isPublic?: boolean): Promise<string>;
  read(filename: string, isPublic?: boolean): Promise<Buffer>;
  readStream(filename: string, isPublic?: boolean): Promise<NodeJS.ReadableStream>;
  delete(filename: string, isPublic?: boolean): Promise<void>;
  exists(filename: string, isPublic?: boolean): Promise<boolean>;
  getUrl(filename: string, isPublic?: boolean, expiresInSeconds?: number): Promise<string>;
}

export class LocalStorageDriver implements StorageDriver {
  private artworkDir: string;
  private productsDir: string;

  constructor(customArtworkDir?: string, customProductsDir?: string) {
    const defaultBase = fs.existsSync(path.resolve(process.cwd(), 'backend', 'uploads'))
      ? path.resolve(process.cwd(), 'backend', 'uploads')
      : path.resolve(process.cwd(), 'uploads');
    this.artworkDir = customArtworkDir
      ? path.resolve(customArtworkDir)
      : path.resolve(defaultBase, 'artwork');
    this.productsDir = customProductsDir
      ? path.resolve(customProductsDir)
      : path.resolve(defaultBase, 'products');

    if (!fs.existsSync(this.artworkDir)) {
      fs.mkdirSync(this.artworkDir, { recursive: true });
    }
    if (!fs.existsSync(this.productsDir)) {
      fs.mkdirSync(this.productsDir, { recursive: true });
    }
  }

  private resolveSafePath(filename: string, isPublic = false): string {
    if (filename.includes('..') || path.isAbsolute(filename)) {
      throw new Error('Path traversal attempt detected');
    }
    const safeName = path.basename(filename);
    const targetDir = isPublic ? this.productsDir : this.artworkDir;
    const resolved = path.resolve(targetDir, safeName);
    if (!resolved.startsWith(targetDir)) {
      throw new Error('Path traversal attempt detected');
    }
    return resolved;
  }

  async save(buffer: Buffer, filename: string, _mimeType: string, isPublic = false): Promise<string> {
    const fullPath = this.resolveSafePath(filename, isPublic);
    await fs.promises.writeFile(fullPath, buffer);
    return filename;
  }

  async read(filename: string, isPublic = false): Promise<Buffer> {
    const fullPath = this.resolveSafePath(filename, isPublic);
    return fs.promises.readFile(fullPath);
  }

  async readStream(filename: string, isPublic = false): Promise<NodeJS.ReadableStream> {
    const fullPath = this.resolveSafePath(filename, isPublic);
    return fs.createReadStream(fullPath);
  }

  async delete(filename: string, isPublic = false): Promise<void> {
    const fullPath = this.resolveSafePath(filename, isPublic);
    try {
      await fs.promises.unlink(fullPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  async exists(filename: string, isPublic = false): Promise<boolean> {
    const fullPath = this.resolveSafePath(filename, isPublic);
    try {
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async getUrl(filename: string, isPublic = false): Promise<string> {
    const safeName = encodeURIComponent(path.basename(filename));
    if (isPublic) {
      return `/api/uploads/products/${safeName}`;
    }
    return `/api/uploads/artwork/${safeName}/file`;
  }
}

export class S3StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl?: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'stickerclub-artwork';
    const region = process.env.S3_REGION || 'auto';
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
    this.publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('S3 credentials are not configured in environment (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)');
    }

    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle,
    });
  }

  private getKey(filename: string, isPublic = false): string {
    const safeName = path.basename(filename);
    return isPublic ? `products/${safeName}` : `artwork/${safeName}`;
  }

  async save(buffer: Buffer, filename: string, mimeType: string, isPublic = false): Promise<string> {
    const key = this.getKey(filename, isPublic);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return filename;
  }

  async read(filename: string, isPublic = false): Promise<Buffer> {
    const key = this.getKey(filename, isPublic);
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
    if (!response.Body) {
      throw new Error(`S3 object ${key} returned empty body`);
    }
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async readStream(filename: string, isPublic = false): Promise<NodeJS.ReadableStream> {
    const pass = new Readable({ read() {} });
    const key = this.getKey(filename, isPublic);
    this.client
      .send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      .then((res) => {
        if (res.Body && typeof (res.Body as any).pipe === 'function') {
          (res.Body as any).pipe(pass);
        } else if (res.Body) {
          res.Body.transformToByteArray().then((bytes) => {
            pass.push(Buffer.from(bytes));
            pass.push(null);
          });
        }
      })
      .catch((err) => pass.destroy(err));
    return pass;
  }

  async delete(filename: string, isPublic = false): Promise<void> {
    const key = this.getKey(filename, isPublic);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async exists(filename: string, isPublic = false): Promise<boolean> {
    const key = this.getKey(filename, isPublic);
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  async getUrl(filename: string, isPublic = false, expiresInSeconds = 3600): Promise<string> {
    const key = this.getKey(filename, isPublic);
    if (isPublic && this.publicBaseUrl) {
      const base = this.publicBaseUrl.endsWith('/') ? this.publicBaseUrl.slice(0, -1) : this.publicBaseUrl;
      return `${base}/${key}`;
    }
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn: expiresInSeconds }
    );
  }
}

let activeDriver: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (!activeDriver) {
    const driverType = process.env.STORAGE_DRIVER?.toLowerCase();
    if (driverType === 's3') {
      try {
        activeDriver = new S3StorageDriver();
      } catch (err) {
        console.warn('Failed to initialize S3 storage driver, falling back to local driver:', err);
        activeDriver = new LocalStorageDriver(process.env.STORAGE_LOCAL_DIR);
      }
    } else {
      activeDriver = new LocalStorageDriver(process.env.STORAGE_LOCAL_DIR);
    }
  }
  return activeDriver!;
}

export function setStorageDriver(driver: StorageDriver | null): void {
  activeDriver = driver;
}

const MAX_DIMENSION_PIXELS = 8000;
const MAX_TOTAL_PIXELS = 40_000_000; // 40 Megapixels

export async function validateImageBuffer(
  buffer: Buffer,
  originalName: string,
  declaredMimeType: string,
  allowSvg = false
): Promise<{ width?: number; height?: number; mimeType: string; fileName: string; sanitizedBuffer: Buffer }> {
  if (!buffer || buffer.length === 0) {
    throw Object.assign(new Error('Uploaded file is empty'), { status: 400 });
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw Object.assign(
      new Error(`File size (${Math.round(buffer.length / 1024 / 1024)}MB) exceeds limit of 15MB`),
      { status: 400 }
    );
  }

  // Magic bytes check for raster formats:
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  // JPEG: FF D8 FF
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  // WebP: 'RIFF' .... 'WEBP'
  const isWebp =
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';

  const isRaster = isPng || isJpeg || isWebp;

  if (!allowSvg) {
    // Customer artwork MUST be raster PNG, JPEG, or WebP.
    // Reject SVG, HTML, or any non-raster payloads immediately before sharp parsing.
    if (!isRaster) {
      throw Object.assign(
        new Error('Vector SVG, HTML, or non-image uploads are not allowed for custom artwork. Please upload PNG, JPG, or WebP.'),
        { status: 400 }
      );
    }
  }

  // Handle trusted product SVG uploads (only allowed when allowSvg === true)
  if (allowSvg && !isRaster) {
    const text = buffer.toString('utf8', 0, Math.min(buffer.length, 4096)).trim();
    if (!text.includes('<svg') && !text.includes('<?xml')) {
      throw Object.assign(new Error('Invalid image format. Allowed: PNG, JPEG, WebP, SVG.'), { status: 400 });
    }
    // Strict SVG active-script checking to prevent stored XSS
    const fullText = buffer.toString('utf8').toLowerCase();
    if (
      fullText.includes('<script') ||
      fullText.includes('javascript:') ||
      fullText.includes('onload=') ||
      fullText.includes('onerror=') ||
      fullText.includes('onclick=') ||
      fullText.includes('<foreignobject')
    ) {
      throw Object.assign(new Error('SVG contains disallowed script or active content'), { status: 400 });
    }

    const widthMatch = fullText.match(/width=["'](\d+)/);
    const heightMatch = fullText.match(/height=["'](\d+)/);
    const safeFileName = `${crypto.randomUUID()}.svg`;

    return {
      width: widthMatch ? parseInt(widthMatch[1], 10) : undefined,
      height: heightMatch ? parseInt(heightMatch[1], 10) : undefined,
      mimeType: 'image/svg+xml',
      fileName: safeFileName,
      sanitizedBuffer: buffer,
    };
  }

  // Decode raster image with sharp and enforce pixel/format constraints
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.format || !meta.width || !meta.height) {
      throw new Error('Unsupported image content');
    }

    if (meta.width > MAX_DIMENSION_PIXELS || meta.height > MAX_DIMENSION_PIXELS) {
      throw Object.assign(
        new Error(`Image dimensions (${meta.width}x${meta.height}) exceed maximum allowed of 8000x8000`),
        { status: 400 }
      );
    }

    if (meta.width * meta.height > MAX_TOTAL_PIXELS) {
      throw Object.assign(
        new Error(`Total image resolution exceeds maximum allowed limit of 40 megapixels`),
        { status: 400 }
      );
    }

    let sanitizedBuffer: Buffer;
    let canonicalExt: string;
    let canonicalMime: string;

    if (meta.format === 'png') {
      canonicalExt = '.png';
      canonicalMime = 'image/png';
      sanitizedBuffer = await sharp(buffer).png({ compressionLevel: 9 }).toBuffer();
    } else if (meta.format === 'jpeg') {
      canonicalExt = '.jpg';
      canonicalMime = 'image/jpeg';
      sanitizedBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    } else if (meta.format === 'webp') {
      canonicalExt = '.webp';
      canonicalMime = 'image/webp';
      sanitizedBuffer = await sharp(buffer).webp({ quality: 90 }).toBuffer();
    } else {
      throw Object.assign(new Error('Invalid image format. Allowed: PNG, JPEG, WebP.'), { status: 400 });
    }

    const safeFileName = `${crypto.randomUUID()}${canonicalExt}`;

    return {
      width: meta.width,
      height: meta.height,
      mimeType: canonicalMime,
      fileName: safeFileName,
      sanitizedBuffer,
    };
  } catch (err: any) {
    if (err?.status) throw err;
    throw Object.assign(new Error('Invalid or corrupted image format. Allowed: PNG, JPEG, WebP.'), { status: 400 });
  }
}

export async function cleanupOrphanedUploads(
  db: any,
  maxAgeHours = 24
): Promise<{ deletedCount: number; deletedIds: string[] }> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  const storage = getStorageDriver();

  // Find uploads older than cutoff that have no CustomOrder or CustomOrderArtwork references
  const orphaned = await db.customArtwork.findMany({
    where: {
      createdAt: { lt: cutoff },
      customOrders: { none: {} },
      orderArtworks: { none: {} },
    },
  });

  const deletedIds: string[] = [];
  for (const art of orphaned) {
    let storageDeleted = false;
    try {
      await storage.delete(art.fileName);
      storageDeleted = true;
    } catch (err: any) {
      if (err.code === 'ENOENT' || err.name === 'NotFound') {
        storageDeleted = true;
      } else {
        console.error(`Failed to delete storage file ${art.fileName}:`, err);
      }
    }

    if (storageDeleted) {
      await db.customArtwork.delete({ where: { id: art.id } });
      deletedIds.push(art.id);
    }
  }

  return { deletedCount: deletedIds.length, deletedIds };
}
