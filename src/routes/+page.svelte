<script>
  import images from "$lib/images.json";
  import InfiniteScroll from "$lib/InfiniteScroll.svelte";

  import {
    PUBLIC_IMG_BASE,
    PUBLIC_IMG_VARIANT,
    PUBLIC_USER_NAME,
    PUBLIC_USER_AVATAR,
  } from "$env/static/public";

  let increment = 2;
  let count = increment;
  const loadMore = () => (count += increment);
</script>

{#each images.slice(0, count) as image}
  <div class="mb-10 max-w-5xl rounded-lg mx-auto">
    <div class="p-2 flex items-center">
      <img
        loading="lazy"
        src={PUBLIC_USER_AVATAR}
        alt={PUBLIC_USER_NAME}
        class="inline-block rounded-full w-8 h-8 mr-2"
      />
      <p class="font-semibold">{PUBLIC_USER_NAME}</p>
    </div>
    <img
      loading="lazy"
      src="{PUBLIC_IMG_BASE}/{image.id}/{PUBLIC_IMG_VARIANT}"
      alt={image.caption}
      class="mx-auto"
    />
    <div class="p-2">
      {#if image.caption}
        <p class="leading-tight mb-2">{image.caption}</p>
      {/if}
      <p class="text-sm text-gray-400">
        Posted {new Date(image.uploaded).toLocaleString()}
      </p>
    </div>
  </div>
{/each}

<InfiniteScroll
  hasMore={count < images.length}
  threshold={200}
  on:loadMore={loadMore}
/>
