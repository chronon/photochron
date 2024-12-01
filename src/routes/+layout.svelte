<script lang="ts">
	import { PUBLIC_USER_NAME, PUBLIC_USER_AVATAR } from '$env/static/public';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<svelte:head>
	<title>{PUBLIC_USER_NAME}</title>
</svelte:head>

<div class="mx-auto max-w-6xl sm:px-6 lg:px-8">
	<div class="sticky top-0 border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
		<div class="-ml-4 -mt-2 flex flex-wrap items-center justify-between sm:flex-nowrap">
			<div class="ml-4 mt-2">
				<h3 class="text-xl font-semibold uppercase text-sky-800">
					{PUBLIC_USER_NAME}
				</h3>
			</div>
			<div class="ml-4 mt-2 flex-shrink-0">
				<img
					loading="lazy"
					src={PUBLIC_USER_AVATAR}
					alt={PUBLIC_USER_NAME}
					class="mr-2 inline-block h-8 w-8 rounded-full"
				/>
			</div>
		</div>
	</div>
	{@render children?.()}
</div>
