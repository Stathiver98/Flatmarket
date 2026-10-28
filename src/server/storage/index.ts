import "server-only";
import { mkdir, readFile, rm, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env, isS3Configured } from "@/server/env";

// Private object storage. Nothing here is publicly reachable: every file is
// served through route handlers that check permissions (or publication state).
// Keys look like: listings/<listingId>/photos/<photoId>/original.jpg

export interface Storage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  deletePrefix(prefix: string): Promise<void>;
}

function assertSafeKey(key: string) {
  if (!/^[A-Za-z0-9/_.-]+$/.test(key) || key.includes("..") || key.startsWith("/")) {
    throw new Error("Invalid storage key");
  }
}

class LocalStorage implements Storage {
  constructor(private root: string) {}

  private resolve(key: string) {
    assertSafeKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data, { mode: 0o600 });
  }

  async get(key: string) {
    try {
      return await readFile(this.resolve(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async deletePrefix(prefix: string) {
    assertSafeKey(prefix);
    const full = path.resolve(this.root, prefix);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid storage key");
    try {
      await stat(full);
    } catch {
      return;
    }
    await rm(full, { recursive: true, force: true });
  }
}

class S3Storage implements Storage {
  private client: S3Client;
  private bucket: string;

  constructor() {
    if (!isS3Configured()) throw new Error("S3 storage selected but S3_* variables are incomplete.");
    this.bucket = env.s3.bucket!;
    this.client = new S3Client({
      region: env.s3.region,
      endpoint: env.s3.endpoint,
      forcePathStyle: env.s3.forcePathStyle,
      credentials: { accessKeyId: env.s3.accessKeyId!, secretAccessKey: env.s3.secretAccessKey! },
    });
  }

  async put(key: string, data: Buffer, contentType: string) {
    assertSafeKey(key);
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }),
    );
  }

  async get(key: string) {
    assertSafeKey(key);
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return Buffer.from(await res.Body.transformToByteArray());
    } catch (e) {
      const name = (e as { name?: string }).name;
      if (name === "NoSuchKey" || name === "NotFound") return null;
      throw e;
    }
  }

  async deletePrefix(prefix: string) {
    assertSafeKey(prefix);
    let token: string | undefined;
    do {
      const list = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix.endsWith("/") ? prefix : prefix + "/", ContinuationToken: token }),
      );
      const keys = (list.Contents ?? []).map((o) => ({ Key: o.Key! }));
      if (keys.length) {
        await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys } }));
      }
      token = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (token);
  }
}

let instance: Storage | null = null;

export function storage(): Storage {
  if (!instance) {
    instance = env.storageDriver === "s3" ? new S3Storage() : new LocalStorage(path.resolve(env.storageLocalDir));
  }
  return instance;
}

export const storageKeys = {
  listing: (listingId: string) => `listings/${listingId}`,
  photo: (listingId: string, photoId: string) => `listings/${listingId}/photos/${photoId}`,
  variant: (listingId: string, photoId: string, variantId: string) => `listings/${listingId}/photos/${photoId}/variants/${variantId}`,
  floorPlan: (listingId: string, planId: string) => `listings/${listingId}/floorplans/${planId}`,
  logo: (workspaceId: string) => `workspaces/${workspaceId}/logo`,
};
