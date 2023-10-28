<script lang="ts">
  import type { PageServerData } from "./$types";
  import InfiniteScroll from "$lib/InfiniteScroll.svelte";

  import {
    PUBLIC_IMG_BASE,
    PUBLIC_IMG_VARIANT,
    PUBLIC_USER_NAME,
    PUBLIC_USER_AVATAR,
  } from "$env/static/public";

  export let data: PageServerData;

  let increment = 2;
  let count = increment;
  const loadMore = () => (count += increment);
</script>

{#each data.images.slice(0, count) as image}
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
    <div
      class="bg-gray-50 rounded-lg h-0 pt-[75%] relative bg-[url('/loading.gif')] bg-no-repeat bg-center bg-[size:100px]"
    >
      <img
        loading="lazy"
        src="{PUBLIC_IMG_BASE}/{image.id}/{PUBLIC_IMG_VARIANT}"
        alt={image.caption}
        class="absolute top-0 left-[50%] translate-x-[-50%]"
      />
    </div>
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
  hasMore={count < data.images.length}
  threshold={200}
  on:loadMore={loadMore}
/>
