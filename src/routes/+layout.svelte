<script lang="ts">
	import type { LayoutServerData } from './$types';
	import { onMount } from 'svelte';

	interface Props {
		children?: import('svelte').Snippet;
		data: LayoutServerData;
	}

	let { children, data }: Props = $props();
	let loaded = $state(false);

	onMount(() => {
		loaded = true;
	});
</script>

<svelte:head>
	<title>{data.config.userName}</title>
</svelte:head>

<div class="app" class:loaded>
	<div class="mx-auto max-w-6xl sm:px-6 lg:px-8">
		<div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
			<div class="-mt-2 -ml-4 flex flex-wrap items-center justify-between sm:flex-nowrap">
				<div class="mt-2 ml-4">
					<h3 class="text-xl font-semibold text-sky-800 uppercase">
						{data.config.userName}
					</h3>
				</div>
				<div class="mt-2 ml-4 flex-shrink-0">
					<div class="mr-2 h-8 w-8 flex-shrink-0 rounded-full bg-gray-200">
						<img
							loading="lazy"
							src={data.config.userAvatar}
							alt={data.config.userName}
							class="h-full w-full rounded-full object-cover"
						/>
					</div>
				</div>
			</div>
		</div>
		{@render children?.()}
	</div>
</div>

<style>
	.app {
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.app.loaded {
		opacity: 1;
	}
</style>
