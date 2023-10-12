<script>
  import images from "$lib/images.json";
  let base = "https://imagedelivery.net/DvVl0mheSGO8iloS0s-G0g";
  let variant = "default";
</script>

<h1 class="text-4xl font-bold underline">chrononagram</h1>

<div>
  {#each images as image}
    <img loading="lazy" src="{base}/{image.id}/{variant}" alt={image.caption} />
  {/each}
</div>
