<script>
  import images from "$lib/images.json";
  let base = "https://imagedelivery.net/DvVl0mheSGO8iloS0s-G0g";
  let variant = "default";
</script>

<div class="flex flex-col items-center">
  {#each images as image}
    <div class="flex justify-center w-full mt-8 md:p-8 rounded-lg bg-gray-50">
      <img
        loading="lazy"
        src="{base}/{image.id}/{variant}"
        alt={image.caption}
      />
    </div>
  {/each}
</div>
