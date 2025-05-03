<script lang="ts">
  import type { PageProps } from './$types';
  import Videos from '$lib/Videos.svelte';

  let {data}: PageProps = $props();
  
</script>

{#if data.searchResponse && data.searchResponse.videos.length > 0}
  <Videos videos={data.searchResponse.videos} authors={data.searchResponse.authors} />
{:else}
  no videos
{/if}
