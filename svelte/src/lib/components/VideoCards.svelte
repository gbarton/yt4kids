<script lang="ts">
  import { Select, Search, Button, Avatar, Card } from 'flowbite-svelte';

  import type { YTThumbnail, YTChannelInfo, YTAuthor, YTVideoInfo } from '../Types';

  export let videos: YTVideoInfo[];
  export let authors: {[key: string] : YTAuthor};

  function getBestThumbnail(thumbnails: YTThumbnail[]): string {
    // console.log(thumbnails);
    const id = thumbnails.find((t) => t.size === 'small')?.fileID
      || thumbnails.find((t) => t.size === 'tiny')?.fileID || "";

    if (id.length > 0) {
      return `/api/thumbnails/${id}`;
    }
    return thumbnails.find((t) => t.size === 'medium')?.url
      || thumbnails.find((t) => t.size === 'small')?.url
      || thumbnails.find((t) => t.size === 'tiny')?.url 
      || "";
  }

  function selectAuthor(authorID: string): void {

  }
</script>

{#if videos?.length > 0}
<div class="container">
  <h4 class="text-2xl mb-2 font-bold">Videos</h4>
  <!-- <div class="grid grid-flow-col auto-cols-max"> -->
  <div class="grid grid-cols-3 gap-4">
    {#each videos as video }
    <div>
      <Card img="{getBestThumbnail(video.thumbnails)}">
        <div class="flex">
          <div class="flex-none w-14">
            <a href="#/search?authorID={video.authorID}">
              <Avatar src="{getBestThumbnail(authors[video.authorID].thumbnails)}" />
            </a>
          </div>
          <div class="flex-auto w-64">
            <h5 class="mb-1 text-sm font-bold tracking-tight text-gray-900 dark:text-white">
              {video.title}
            </h5>
            <p class="mb-1 text-xs text-gray-700 dark:text-gray-400 leading-tight">
              {authors[video.authorID].name}
            </p>
            <slot name="buttons" {video}></slot>
          </div>
        </div>
      </Card>
    </div>
    {/each}
  </div>
</div>
{/if}