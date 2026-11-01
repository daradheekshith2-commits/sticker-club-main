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

export async function validateImageBuffer(
  buffer: Buffer,
  originalName: string,
  declaredMimeType: string,
  allowSvg = false
): Promise<{ width?: number; height?: number; mimeType: string; fileName: string }> {
  if (!buffer || buffer.length === 0) {
    throw Object.assign(new Error('Uploaded file is empty'), { status: 400 });
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw Object.assign(
      new Error(`File size (${Math.round(buffer.length / 1024 / 1024)}MB) exceeds limit of 15MB`),
      { status: 400 }
    );
  }

  const cleanName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  let ext = path.extname(cleanName).toLowerCase();
  if (!ext || ext === '.') {
    if (declaredMimeType === 'image/png') ext = '.png';
    else if (declaredMimeType === 'image/jpeg') ext = '.jpg';
    else if (declaredMimeType === 'image/webp') ext = '.webp';
    else if (declaredMimeType === 'image/svg+xml') ext = '.svg';
    else ext = '.png';
  }

  const safeFileName = `${crypto.randomUUID()}${ext}`;

  if (declaredMimeType === 'image/svg+xml' || ext === '.svg') {
    if (!allowSvg) {
      throw Object.assign(new Error('Vector SVG uploads are not allowed for custom artwork. Please upload PNG, JPG, or WebP.'), { status: 400 });
    }
    const text = buffer.toString('utf8');
    if (!text.includes('<svg') && !text.includes('<?xml')) {
      throw Object.assign(new Error('Invalid SVG content'), { status: 400 });
    }
    // Extract SVG dimensions if present
    const widthMatch = text.match(/width=["'](\d+)/);
    const heightMatch = text.match(/height=["'](\d+)/);
    return {
      width: widthMatch ? parseInt(widthMatch[1], 10) : undefined,
      height: heightMatch ? parseInt(heightMatch[1], 10) : undefined,
      mimeType: 'image/svg+xml',
      fileName: safeFileName,
    };
  }

  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.format || !meta.width || !meta.height) {
      throw new Error('Unsupported image content');
    }
    const mime = meta.format === 'png' ? 'image/png' : meta.format === 'jpeg' ? 'image/jpeg' : meta.format === 'webp' ? 'image/webp' : declaredMimeType;
    return {
      width: meta.width,
      height: meta.height,
      mimeType: mime,
      fileName: safeFileName,
    };
  } catch (err) {
    throw Object.assign(new Error('Invalid or corrupted image format. Allowed: PNG, JPEG, WebP, SVG.'), { status: 400 });
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
