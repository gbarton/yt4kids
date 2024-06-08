<script lang="ts">
    import { Select, Search, Button, Card } from 'flowbite-svelte';

    import type { YTThumbnail, YTChannelInfo, YTAuthor } from '../Types';

    export let channels: YTChannelInfo[];
    export let authors: {[key: string] : YTAuthor};

    function getBestThumbnail(thumbnails: YTThumbnail[]): string {
    // console.log(thumbnails);
    return thumbnails.find((t) => t.size === 'small')?.url
      || thumbnails.find((t) => t.size === 'tiny')?.url 
      || "";
  }
</script>

{#if channels?.length > 0}
<div class="container">
  <h4 class="text-2xl mb-2 font-bold">Channels</h4>
  <!-- <div class="grid grid-flow-col auto-cols-max"> -->
  <div class="grid grid-cols-3 gap-4">
    {#each channels as channel }
    <div>
      <Card img="{getBestThumbnail(authors[channel.authorID].thumbnails)}" horizontal size="lg">
        <h5 class="mb-2 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          {channel.name}
        </h5>
        <p class="mb-3 font-normal text-gray-700 dark:text-gray-400 leading-tight">
          {authors[channel.authorID].name}
        </p>
        <slot></slot>
      </Card>
    </div>
    {/each}
  </div>
</div>
{/if}