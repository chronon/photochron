<script>
  import { PUBLIC_USER_NAME, PUBLIC_USER_AVATAR } from "$env/static/public";
</script>

<div class="mx-auto max-w-6xl sm:px-6 lg:px-8">
  <div class="border-b border-gray-200 bg-white px-4 py-5 sm:px-6 sticky top-0">
    <div
      class="-ml-4 -mt-2 flex flex-wrap items-center justify-between sm:flex-nowrap"
    >
      <div class="ml-4 mt-2">
        <h3 class="text-xl font-semibold text-sky-800 uppercase">
          {PUBLIC_USER_NAME}
        </h3>
      </div>
      <div class="ml-4 mt-2 flex-shrink-0">
        <img
          loading="lazy"
          src={PUBLIC_USER_AVATAR}
          alt={PUBLIC_USER_NAME}
          class="inline-block rounded-full w-8 h-8 mr-2"
        />
      </div>
    </div>
  </div>
  <slot />
</div>
