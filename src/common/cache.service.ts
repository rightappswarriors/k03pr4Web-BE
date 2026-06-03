import { Injectable } from "@nestjs/common";

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

@Injectable()
export class CacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  async remember<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const cached = this.store.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const value = await loader();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  forget(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}
