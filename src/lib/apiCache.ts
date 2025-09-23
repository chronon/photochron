interface CacheEntry<T> {
	data: T;
	expires: number;
}

class APICache {
	private cache = new Map<string, CacheEntry<unknown>>();
	private readonly ttl = 60000; // 1 minute TTL

	async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
		const cached = this.cache.get(key);

		if (cached && cached.expires > Date.now()) {
			return cached.data as T;
		}

		const data = await fetcher();
		this.cache.set(key, {
			data,
			expires: Date.now() + this.ttl
		});

		return data;
	}

	clear(): void {
		this.cache.clear();
	}
}

export const apiCache = new APICache();
