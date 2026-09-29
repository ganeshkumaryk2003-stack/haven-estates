import "server-only";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { StorageDriver, StoredFile } from "@/lib/storage/index";

interface S3Options {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
}

// Works with AWS S3 and S3-compatible services (MinIO, Cloudflare R2, DigitalOcean Spaces).
export class S3StorageDriver implements StorageDriver {
  private readonly client: S3Client;

  constructor(private readonly options: S3Options) {
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: Boolean(options.endpoint),
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    });
  }

  urlFor(key: string) {
    if (this.options.publicUrl) return `${this.options.publicUrl.replace(/\/$/, "")}/${key}`;
    if (this.options.endpoint) return `${this.options.endpoint.replace(/\/$/, "")}/${this.options.bucket}/${key}`;
    return `https://${this.options.bucket}.s3.${this.options.region}.amazonaws.com/${key}`;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredFile> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { key, url: this.urlFor(key), size: body.byteLength, contentType };
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }));
  }
}
