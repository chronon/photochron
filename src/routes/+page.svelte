<script lang="ts">
  import type { PageServerData } from './$types';
  import InfiniteScroll from '$lib/InfiniteScroll.svelte';
  import { SvelteSet } from 'svelte/reactivity';

  interface Props {
    data: PageServerData;
  }

  let { data }: Props = $props();

  let allImages = $state([...data.images]);
  let hasMore = $state(data.hasMore);
  let isLoading = $state(false);

  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    isLoading = true;
    try {
      const response = await fetch(`/api/images?offset=${allImages.length}`);
      const result = (await response.json()) as {
        images: typeof allImages;
        hasMore: boolean;
      };

      if (result.images && result.images.length > 0) {
        allImages = [...allImages, ...result.images];
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
</script>

{#each allImages as image (image.id)}
  <div class="mx-auto mb-8 max-w-5xl rounded-lg contain-layout contain-style">
    <div class="flex items-center p-2">
      <div class="mr-2 h-8 w-8 flex-shrink-0 rounded-full bg-gray-200">
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
      class="relative min-h-[250px] overflow-hidden bg-gray-100 sm:min-h-[350px] sm:rounded-lg lg:min-h-[450px]"
    >
      {#if !loadedImages.has(image.id)}
        <div class="absolute inset-0 animate-pulse bg-gray-200"></div>
      {/if}
      <img
        loading="lazy"
        src="{data.config.imgBase}/{image.id}/{data.config.imgVariant}"
        alt={image.caption}
        class="w-full object-contain transition-opacity duration-300"
        class:opacity-0={!loadedImages.has(image.id)}
        onload={() => handleImageLoad(image.id)}
      />
    </div>
    <div class="p-2">
      {#if image.caption}
        <p class="mb-2 leading-tight">{image.caption}</p>
      {/if}
      <p class="text-sm text-gray-400">
        Posted {new Date(image.uploaded).toLocaleString()}
      </p>
    </div>
  </div>
{/each}

<InfiniteScroll {hasMore} threshold={200} on:loadMore={loadMore} />
