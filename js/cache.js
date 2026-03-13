// Simple caching utility for performance optimization
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.maxAge = 5 * 60 * 1000; // 5 minutes default
        this.maxSize = 100; // Maximum items in cache
    }

    set(key, value, maxAge = this.maxAge) {
        // Remove oldest items if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            maxAge
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // Check if item is expired
        if (Date.now() - item.timestamp > item.maxAge) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    // Clean up expired items
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.maxAge) {
                this.cache.delete(key);
            }
        }
    }
}

// Image cache for memory thumbnails
class ImageCache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 50; // Maximum cached images
    }

    async get(url) {
        const cached = this.cache.get(url);
        if (cached) {
            return cached;
        }

        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            
            // Store in cache
            if (this.cache.size >= this.maxSize) {
                const firstKey = this.cache.keys().next().value;
                URL.revokeObjectURL(this.cache.get(firstKey));
                this.cache.delete(firstKey);
            }
            
            this.cache.set(url, objectUrl);
            return objectUrl;
        } catch (error) {
            console.error('Failed to cache image:', error);
            return url; // Fallback to original URL
        }
    }

    clear() {
        for (const objectUrl of this.cache.values()) {
            URL.revokeObjectURL(objectUrl);
        }
        this.cache.clear();
    }
}

// Global cache instances
const dataCache = new CacheManager();
const imageCache = new ImageCache();

// Auto cleanup expired cache items every 5 minutes
setInterval(() => {
    dataCache.cleanup();
}, 5 * 60 * 1000);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dataCache, imageCache };
} else {
    window.CacheManager = { dataCache, imageCache };
}
