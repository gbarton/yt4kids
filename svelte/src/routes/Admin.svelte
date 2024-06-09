<script lang="ts">
  import { Select, Search, Button, Card } from 'flowbite-svelte';
  import { ArrowRightOutline, DownloadOutline, SearchOutline } from 'flowbite-svelte-icons';
  
	import type { YTSearchResponse, YTThumbnail } from '../lib/Types';

  import {VideoCards} from '../lib/components';
	
	export let data: YTSearchResponse;

  const categories = [
    {
      name: 'All categories',
      value: 'all',
    },
    {
      name: 'Videos',
      value: 'video',
    },
    {
      name: 'Channels',
      value: 'channel',
    },
    {
      name: 'Playlists',
      value: 'playlist',
    }
  ]

  let selectCategory = 'all'
  let searchString = '';

  function getBestThumbnail(thumbnails: YTThumbnail[]): string {
    // console.log(thumbnails);
    return thumbnails.find((t) => t.size === 'small')?.url
      || thumbnails.find((t) => t.size === 'tiny')?.url 
      || "";
  }

  async function queueVideo(videoID: string, authorID: string) {
    console.log("add a video", videoID, authorID);
    const resp = await fetch('/api/yt/video/queue', {
      method: 'POST',
      body: JSON.stringify({videoID, authorID}),
      headers: {
				'content-type': 'application/json',
			},
    });

    const data = await resp.json();
    if (data.error) {
      // mark it broke?
    }
    console.log('queue response', data);
  }  

  async function addVideo(videoID: string, authorID: string) {
    console.log("add a video", videoID, authorID);
    const resp = await fetch('/api/yt/video', {
      method: 'POST',
      body: JSON.stringify({videoID, authorID}),
      headers: {
				'content-type': 'application/json',
			},
    });

    const data = await resp.json();
    if (data.error) {
      // mark it broke?
    }
    console.log('dl response', data);
  }

  async function handleSubmit() {
    console.log(`submit called ${searchString} - ${selectCategory}`);

    const params: string[][] = [];
    if (searchString) {
      params.push(['query', searchString.toString()]);
    }
    if (selectCategory) {
      params.push(['type', selectCategory.toString()]);
    }
    const encodedParams = new URLSearchParams(params).toString();

    const res = await fetch('/api/yt/search?' + encodedParams);
    if (res.status !== 200) {
      console.log("error");
      data = {
        query: "",
        videos: [],
        channels: [],
        authors: {},
      };
      return;
    }

    const items = await res.json();
    console.log(items);
    data = items as YTSearchResponse;
  }

</script>


<div class="container">
  <h1>admin area</h1>

  <form class="flex" on:submit|preventDefault={handleSubmit}>
    <div class="relative">
      <Select name="type" class="rounded-e-none whitespace-nowrap border border-e-0 border-primary-700" items={categories} bind:value={selectCategory} />
    </div>
    <Search name="query" bind:value="{searchString}" size="md" class="rounded-none py-2.5" placeholder="Search Videos, Playlists, Channels..." />
    <Button class="!p-2.5 rounded-s-none" on:click="{handleSubmit}">
      <SearchOutline class="w-6 h-6" />
    </Button>
  </form>

</div>

{#if data?.channels?.length > 0}
<div class="container">
  <h4 class="text-2xl mb-2 font-bold">Channels</h4>
  <!-- <div class="grid grid-flow-col auto-cols-max"> -->
  <div class="grid grid-cols-3 gap-4">
    {#each data.channels as channel }
    <div>
      <Card img="{getBestThumbnail(data.authors[channel.authorID].thumbnails)}" horizontal size="lg">
        <h5 class="mb-2 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          {channel.name}
        </h5>
        <p class="mb-3 font-normal text-gray-700 dark:text-gray-400 leading-tight">
          {data.authors[channel.authorID].name}
        </p>
        <Button size="xs" class="w-fit" color="light">
          Follow <DownloadOutline class="w-4 h-4 ms-2 text-black" />
        </Button>

      </Card>
    </div>
    {/each}
  </div>
</div>
{/if}

{#if data?.videos?.length > 0}
<VideoCards {...data}>
  <svelte:fragment slot="buttons" let:video>
    <Button size="xs" class="w-fit" color="light" disabled={video.fileID !== undefined}
      on:click="{() => queueVideo(video.id, video.authorID)}">
      Queue <ArrowRightOutline class="w-6 h-6 ms-2 text-black" />
    </Button>
    <Button size="xs" class="w-fit" color="light" disabled={video.fileID !== undefined}
      on:click="{() => addVideo(video.id, video.authorID)}">
      Add <DownloadOutline class="w-6 h-6 ms-2 text-black" />
    </Button>
  </svelte:fragment>
</VideoCards>
{/if}
