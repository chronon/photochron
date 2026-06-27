<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';

  interface Props {
    rootMargin?: string;
    hasMore?: boolean;
  }

  let { rootMargin = '1500px 0px', hasMore = true }: Props = $props();
  const dispatch = createEventDispatcher();

  let scrollElement: HTMLDivElement | null = $state(null);
  let observer: IntersectionObserver | null = null;

  const handleEntries = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && hasMore) {
        dispatch('loadMore');
      }
    });
  };

  const teardownObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  onMount(() => {
    if (!scrollElement) {
      return () => {};
    }

    observer = new IntersectionObserver(handleEntries, { rootMargin });
    observer.observe(scrollElement);

    return teardownObserver;
  });
</script>

<div bind:this={scrollElement} style="width:0px;"></div>
