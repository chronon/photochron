<script lang="ts">
	import type { PageServerData } from './$types';
	import InfiniteScroll from '$lib/InfiniteScroll.svelte';

	import {
		PUBLIC_IMG_BASE,
		PUBLIC_IMG_VARIANT,
		PUBLIC_USER_NAME,
		PUBLIC_USER_AVATAR
	} from '$env/static/public';

	interface Props {
		data: PageServerData;
	}

	let { data }: Props = $props();

	let increment = 2;
	let count = $state(increment);
	const loadMore = () => (count += increment);
</script>

{#each data.images.slice(0, count) as image (image.id)}
	<div class="mx-auto mb-8 max-w-5xl rounded-lg">
		<div class="flex items-center p-2">
			<img
				loading="lazy"
				src={PUBLIC_USER_AVATAR}
				alt={PUBLIC_USER_NAME}
				class="mr-2 inline-block h-8 w-8 rounded-full"
			/>
			<p class="font-semibold">{PUBLIC_USER_NAME}</p>
		</div>
		<div
			class="rounded-lg bg-gray-50 bg-[url('/loading.gif')] bg-[size:50px] bg-center bg-no-repeat"
			style="min-height: 35vh"
		>
			<img
				loading="lazy"
				src="{PUBLIC_IMG_BASE}/{image.id}/{PUBLIC_IMG_VARIANT}"
				alt={image.caption}
				class="mx-auto"
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

<InfiniteScroll hasMore={count < data.images.length} threshold={200} on:loadMore={loadMore} />
