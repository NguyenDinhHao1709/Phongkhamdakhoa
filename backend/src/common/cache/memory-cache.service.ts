import { Injectable } from '@nestjs/common';

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
}

/**
 * High-Performance In-Memory TTL Cache + Singleflight Request Coalescing
 * - Gộp hàng ngàn request đồng thời trùng key thành 1 truy vấn CSDL duy nhất (Singleflight).
 * - Lưu đệm kết quả trong RAM với TTL ngắn hạn và tự động xóa khi dữ liệu thay đổi.
 */
@Injectable()
export class MemoryCacheService {
  private readonly store = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<any>>();

  constructor() {
    // Dọn dẹp định kỳ các key hết hạn mỗi 60 giây để tiết kiệm RAM
    setInterval(() => {
      const now = Date.now();
      for (const [k, entry] of this.store.entries()) {
        if (entry.expiresAt <= now) {
          this.store.delete(k);
        }
      }
    }, 60_000).unref();
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (this.store.size > 10_000) {
      // Xóa bớt key cũ nhất nếu vượt ngưỡng 10.000 entries
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Singleflight + TTL Cache:
   * Nếu có 1.000 người cùng gọi 1 API tại cùng 1 thời điểm khi cache vừa hết hạn,
   * chỉ có 1 truy vấn SQL duy nhất được chạy, 999 request còn lại dùng chung Promise kết quả.
   */
  async getOrSet<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const existingPromise = this.inFlight.get(key);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }

    const promise = factory()
      .then((res) => {
        this.set(key, res, ttlMs);
        this.inFlight.delete(key);
        return res;
      })
      .catch((err) => {
        this.inFlight.delete(key);
        throw err;
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clearAll(): void {
    this.store.clear();
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  del(key: string): void {
    this.store.delete(key);
  }
}

