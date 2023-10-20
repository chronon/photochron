<script>
  import InfiniteScroll from "$lib/InfiniteScroll.svelte";
  import images from "$lib/images.json";
  const base = "https://imagedelivery.net/DvVl0mheSGO8iloS0s-G0g";
  const variant = "default";

  let increment = 2;
  let count = increment;
  const loadMore = () => (count += increment);
</script>

<div class="flex flex-col items-center">
  {#each images.slice(0, count) as image}
    <div class="flex justify-center w-full mt-8 md:p-8 rounded-lg bg-gray-50">
      <img
        loading="lazy"
        src="{base}/{image.id}/{variant}"
        alt={image.caption}
      />
    </div>
  {/each}
  <InfiniteScroll
    hasMore={count < images.length}
    threshold={200}
    on:loadMore={loadMore}
  />
</div>
