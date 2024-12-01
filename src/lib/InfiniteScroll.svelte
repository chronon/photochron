<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';

	interface Props {
		threshold?: number;
		hasMore?: boolean;
	}

	let { threshold = 100, hasMore = true }: Props = $props();
	const dispatch = createEventDispatcher();

	let scrollElement: HTMLDivElement | null = $state(null);

	onMount(() => {
		let observer = new IntersectionObserver(observerCallback);
		observer.observe(scrollElement!);

		function observerCallback(entries: IntersectionObserverEntry[]) {
			entries.forEach((entry) => {
				if (entry.isIntersecting && hasMore) {
					dispatch('loadMore');
				}
			});
		}
		return () => observer.unobserve(scrollElement!);
	});
</script>

<div bind:this={scrollElement} style="width:0px; position: relative; top: -{threshold}px;"></div>
