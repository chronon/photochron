import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import InfiniteScroll from './InfiniteScroll.svelte';

describe('InfiniteScroll', () => {
  let mockObserver: {
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
  let IntersectionObserverCallback: IntersectionObserverCallback;

  beforeEach(() => {
    mockObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    };

    // Mock IntersectionObserver
    globalThis.IntersectionObserver = vi.fn().mockImplementation((callback) => {
      IntersectionObserverCallback = callback;
      return mockObserver;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders scroll element with correct styles', async () => {
    const { container } = render(InfiniteScroll);

    const scrollElement = container.querySelector('div');
    expect(scrollElement).toBeTruthy();
    expect(scrollElement!.style.width).toBe('0px');
    expect(scrollElement!.style.position).toBe('relative');
  });

  it('creates IntersectionObserver on mount', async () => {
    render(InfiniteScroll);

    expect(globalThis.IntersectionObserver).toHaveBeenCalledTimes(1);
    expect(mockObserver.observe).toHaveBeenCalledTimes(1);
  });

  it('uses custom threshold prop', async () => {
    const { container } = render(InfiniteScroll, { threshold: 200 });

    const scrollElement = container.querySelector('div');
    expect(scrollElement!.style.top).toBe('-200px');
  });

  it('calls intersection callback when intersecting', async () => {
    const { container } = render(InfiniteScroll, {
      hasMore: true
    });

    // Verify the callback was registered
    expect(globalThis.IntersectionObserver).toHaveBeenCalledWith(expect.any(Function));

    // Simulate intersection - just verify callback structure
    const entries: IntersectionObserverEntry[] = [
      {
        isIntersecting: true,
        target: container.querySelector('div')!,
        intersectionRatio: 1,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: {} as DOMRectReadOnly,
        time: Date.now()
      }
    ];

    // This tests that the callback can be called without throwing
    expect(() =>
      IntersectionObserverCallback(entries, mockObserver as unknown as IntersectionObserver)
    ).not.toThrow();
  });

  it('cleans up observer on unmount', async () => {
    const component = render(InfiniteScroll);

    // Unmount the component
    component.unmount();

    expect(mockObserver.unobserve).toHaveBeenCalledTimes(1);
  });

  it('handles multiple intersection entries correctly', async () => {
    const { container } = render(InfiniteScroll, {
      hasMore: true
    });

    // Simulate multiple entries with mixed intersection states
    const entries: IntersectionObserverEntry[] = [
      {
        isIntersecting: false,
        target: container.querySelector('div')!,
        intersectionRatio: 0,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: {} as DOMRectReadOnly,
        time: Date.now()
      },
      {
        isIntersecting: true,
        target: container.querySelector('div')!,
        intersectionRatio: 1,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: {} as DOMRectReadOnly,
        time: Date.now()
      }
    ];

    // Test that multiple entries can be processed without error
    expect(() =>
      IntersectionObserverCallback(entries, mockObserver as unknown as IntersectionObserver)
    ).not.toThrow();
  });
});
