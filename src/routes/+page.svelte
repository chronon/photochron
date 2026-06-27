<script lang="ts">
  import type { PageServerData } from './$types';
  import InfiniteScroll from '$lib/InfiniteScroll.svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { onDestroy } from 'svelte';

  interface Props {
    data: PageServerData;
  }

  let { data }: Props = $props();

  const EAGER_COUNT = 3;

  let additionalImages = $state<typeof data.images>([]);
  let allImages = $derived([...data.images, ...additionalImages]);
  let hasMore = $state(false);
  let isLoading = $state(false);

  $effect(() => {
    additionalImages = [];
    hasMore = data.hasMore;
  });

  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    const cursor = allImages[allImages.length - 1];
    if (!cursor) return;

    isLoading = true;
    try {
      const params = new URLSearchParams({ before: cursor.captured, id: cursor.id });
      const response = await fetch(`/api/images?${params}`);
      const result = (await response.json()) as {
        images: typeof allImages;
        hasMore: boolean;
      };

      if (result.images && result.images.length > 0) {
        additionalImages = [...additionalImages, ...result.images];
      }
      hasMore = result.hasMore;
    } catch (error) {
      console.error('Failed to load more images:', error);
    } finally {
      isLoading = false;
    }
  };

  let loadedImages = new SvelteSet<string>();
  const handleImageLoad = (imageId: string) => {
    loadedImages.add(imageId);
  };

  let lqipLoaded = new SvelteSet<string>();
  const handleLqipLoad = (imageId: string) => {
    lqipLoaded.add(imageId);
  };

  let shouldLoad = new SvelteSet<string>();
  let imageObserver: IntersectionObserver | null = null;

  const ensureObserver = () => {
    if (!imageObserver) {
      imageObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const id = (entry.target as HTMLElement).dataset.imageId;
              if (id) shouldLoad.add(id);
              imageObserver?.unobserve(entry.target);
            }
          }
        },
        { rootMargin: '2000px 0px' }
      );
    }
    return imageObserver;
  };

  // Svelte action: observe each image container and flag it for loading when it
  // enters the prefetch window. Actions only run in the browser, so it is safe
  // to construct the observer here.
  const lazyLoad = (node: HTMLElement, imageId: string) => {
    node.dataset.imageId = imageId;
    ensureObserver().observe(node);
    return {
      destroy() {
        imageObserver?.unobserve(node);
      }
    };
  };

  onDestroy(() => imageObserver?.disconnect());
</script>

{#each allImages as image, i (image.id)}
  <div class="mx-auto mb-8 max-w-5xl rounded-lg contain-layout contain-style">
    <div class="flex items-center p-2">
      <div class="mr-2 h-8 w-8 shrink-0 rounded-full bg-gray-200">
        <img
          loading="lazy"
          src={data.config.userAvatar}
          alt={data.config.userName}
          class="h-full w-full rounded-full object-cover"
        />
      </div>
      <p class="font-semibold">{data.config.userName}</p>
    </div>
    <div
      use:lazyLoad={image.id}
      class="relative min-h-[250px] overflow-hidden bg-gray-100 sm:min-h-[350px] sm:rounded-lg lg:min-h-[450px]"
    >
      {#if !lqipLoaded.has(image.id)}
        <div class="absolute inset-0 animate-pulse bg-gray-200"></div>
      {/if}
      {#if i < EAGER_COUNT || shouldLoad.has(image.id)}
        <img
          aria-hidden="true"
          decoding="async"
          src="{data.config.imgBase}/{image.id}/width=32,quality=40,format=auto"
          alt=""
          class="block w-full scale-110 blur-lg transition-opacity duration-300"
          class:opacity-0={!lqipLoaded.has(image.id)}
          onload={() => handleLqipLoad(image.id)}
        />
        <img
          decoding="async"
          fetchpriority={i === 0 ? 'high' : undefined}
          src="{data.config.imgBase}/{image.id}/width=1024,quality=85,format=auto"
          srcset="{data.config.imgBase}/{image.id}/width=640,quality=85,format=auto 640w,
                  {data.config.imgBase}/{image.id}/width=1024,quality=85,format=auto 1024w,
                  {data.config.imgBase}/{image.id}/width=1536,quality=85,format=auto 1536w,
                  {data.config.imgBase}/{image.id}/width=2048,quality=85,format=auto 2048w"
          sizes="(max-width: 640px) 100vw, 1024px"
          alt={image.caption}
          class="absolute inset-0 h-full w-full object-contain transition-opacity duration-300"
          class:opacity-0={!loadedImages.has(image.id)}
          onload={() => handleImageLoad(image.id)}
        />
      {/if}
    </div>
    <div class="p-2">
      {#if image.caption}
        <p class="mb-2 leading-tight">{image.caption}</p>
      {/if}
      <p class="text-sm text-gray-400">
        {new Date(image.captured).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </p>
    </div>
  </div>
{/each}

<InfiniteScroll {hasMore} rootMargin="1500px 0px" on:loadMore={loadMore} />
