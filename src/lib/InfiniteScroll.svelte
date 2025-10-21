<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';

  interface Props {
    threshold?: number;
    hasMore?: boolean;
  }

  let { threshold = 100, hasMore = true }: Props = $props();
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

    observer = new IntersectionObserver(handleEntries);
    observer.observe(scrollElement);

    return teardownObserver;
  });
</script>

<div bind:this={scrollElement} style="width:0px; position: relative; top: -{threshold}px;"></div>
