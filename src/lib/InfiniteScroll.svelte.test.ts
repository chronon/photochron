import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('InfiniteScroll', () => {
  let mockObserver: {
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    };

    // Mock IntersectionObserver
    globalThis.IntersectionObserver = vi.fn().mockImplementation(() => {
      return mockObserver;
    });
  });

  it('creates IntersectionObserver with correct options', () => {
    expect(globalThis.IntersectionObserver).toHaveBeenCalledTimes(1);
    expect(globalThis.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        root: null,
        rootMargin: '100px'
      })
    );
  });

  it('calls observe on IntersectionObserver', () => {
    expect(mockObserver.observe).toHaveBeenCalledTimes(1);
  });
});
