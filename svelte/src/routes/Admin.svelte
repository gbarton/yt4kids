<script lang="ts">
  import { Select, Search, Button, Card, Modal } from 'flowbite-svelte';

  import { ArrowRightOutline, CheckCircleOutline, CloseOutline, DownloadOutline, InfoCircleOutline, RefreshOutline, SearchOutline } from 'flowbite-svelte-icons';
  
	import type { YTQueue, YTSearchResponse, YTThumbnail } from '../lib/Types';
  
  import {VideoCards} from '../lib/components';
  import { secureFetch } from '../lib/SecureFetch';
  import { createErrorMessage, createInfoMessage } from '../lib/Store';
  import { getSearchParams } from '../lib/Utils';
  import { onMount } from 'svelte';
  import { querystring } from 'svelte-spa-router';

  
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
  
  // data we are pulling
  export let data: YTSearchResponse = {
    query: "",
    videos: [],
    channels: [],
    authors: {},
  };
  // is a search going on right now
  let searching : boolean = false;

  let selectCategory = 'all'
  let prevSearchString = '-1';
  let searchString = '';

  function getBestThumbnail(thumbnails: YTThumbnail[]): string {
    // console.log(thumbnails);
    return thumbnails.find((t) => t.size === 'small')?.url
      || thumbnails.find((t) => t.size === 'tiny')?.url 
      || "";
  }

  let queue = getQueue();

  async function getQueue() : Promise<YTQueue[]> {
    const resp = await fetch('api/ext/queue');
    if (!resp.ok) {
      return [];
    }

    const data = await resp.json();
    return data as YTQueue[];
  }

  async function queueVideo(videoID: string, authorID: string, title: string) {
    console.log("add a video", videoID, authorID);
    const resp = await secureFetch('api/ext/queue', {
      method: 'POST',
      body: JSON.stringify({videoID, authorID, title}),
      headers: {
				'content-type': 'application/json',
			},
    });

    const data = await resp.json();
    if (data.error) {
      // mark it broke?
      return;
    }
    const message = `Video queued ${title.substring(0, 20)}...`;
    createInfoMessage(message);
    console.log('queue response', data);
    queue = getQueue();
  }  

  async function addVideo(videoID: string, authorID: string) {
    console.log("add a video", videoID, authorID);
    const resp = await secureFetch('api/ext/video', {
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

  let pageNumber = 1;

  function loadMore(node: Element) {
    const obs = new IntersectionObserver((entries) => {
      // I think this only fires once because we are just tied to the window
      entries.forEach((entry) => {
        console.log('here');
        console.log(entry);
        if (entry.isIntersecting) {
          console.log('intersection detected');
          handleSubmit();
        }
      });
    },
    {
      // threshold: 0.1 , // 10%
    });

    obs.observe(node);
    return {
      destroy: () => {
        console.log('destroyed obervable')
        obs.disconnect();
      }
    }
  }

  // called to pull data
  async function handleSubmit() {
    console.log(`submit called ${searchString} - ${selectCategory}`);
    if (searching) {
      console.log('already searching');
      return;
    }

    searching = true;

    // new search, reset
    if (searchString !== prevSearchString) {
      pageNumber == 0;
      data.videos = [];
      data.channels = [];
      prevSearchString = searchString;
    } else {
      pageNumber += 1;
    }

    const params: string[][] = [['page', `${pageNumber}`]];
    if (searchString) {
      params.push(['search', searchString.toString()]);
    }
    if (selectCategory) {
      params.push(['type', selectCategory.toString()]);
    }
    const encodedParams = new URLSearchParams(params).toString();

    const res = await secureFetch('api/ext/search?' + encodedParams, {});
    searching = false;
    if (!res.ok) {
      console.log("error");
      data = {
        query: "",
        videos: [],
        channels: [],
        authors: {},
      };
      createErrorMessage("Error searching, please try again");
      return;
    }

    const json = await res.json();
    console.log(json);
    // reset
    if (pageNumber == 0) {
      data = {
        query: "",
        videos: [],
        channels: [],
        authors: {},
      };
    }

    // add new data
    const sr = json as YTSearchResponse;
    data.videos = [...data.videos, ...sr.videos];
    data.channels = [...data.channels, ...sr.channels];
    console.log(sr.authors);
    for (let k in sr.authors) {
      console.log(`k: ${k}`);
      if (!data.authors[k]) {
        data.authors[k] = sr.authors[k];
      }
    }
  }

  onMount(() => {
    const searchParams = getSearchParams($querystring || "");
    if(searchParams.has('search')) {
      searchString = searchParams.get('search') || "";
      handleSubmit();
    }
  });

  // modal data
  let showModal = false;
  let modalData = "";

  async function getVideoDetails(videoID: string) {
    const res = await secureFetch('api/yt/video/' + encodeURIComponent(videoID), {});
    if (res.ok) {
      // we are converting it to json and back to pretty print it
      const data = await res.json();
      modalData = JSON.stringify(data, null, 2);
      showModal = true;
    }
  }

  let selectedQueueItem: string;

  async function deleteQueueRecord(queueItem: YTQueue) {
    const res = await secureFetch("api/ext/queue", {
      method: 'DELETE',
      body: JSON.stringify(queueItem),
      headers: {
				'content-type': 'application/json',
			}
    });
    queue = getQueue();
  }

  async function toggleSkip(queueItem: YTQueue) {
    const res = await secureFetch(`api/ext/queue/${queueItem.id}/skip`, {
      method: "POST",
      body: JSON.stringify(queueItem),
      headers: {
				'content-type': 'application/json',
			}
    });
    queue = getQueue();
  }

</script>


<h1>admin area</h1>


<div class="container">
  <!-- Modal for showing video details-->
   <Modal title="Video YT Details" bind:open={showModal}>
    <pre>
      {modalData}
    </pre>
   </Modal>

  <form class="flex" on:submit|preventDefault={handleSubmit}>
    <div class="relative">
      <Select name="type" class="rounded-e-none whitespace-nowrap border border-e-0 border-primary-700" items={categories} bind:value={selectCategory} />
    </div>
    <Search name="query" bind:value="{searchString}" size="md" class="rounded-none py-2.5" placeholder="Search Videos, Playlists, Channels..." />
    <Button class="!p-2.5 rounded-s-none" on:click="{handleSubmit}">
      <SearchOutline class="w-6 h-6" />
    </Button>
  </form>

  <div class="flex">
    <!-- queue bar -->
    <div class="flex-none w-1/4 rounded p-2 mr-2 mt-2 drop-shadow-md">
      <h4 class="text-2xl mb-2 font-bold">Queue</h4>
      
      {#await queue}
      ...Loading Queue
      {:then que}
      <ul class="divide-y divide-blue-800">
        {#each que as q (q.id)}
        <!-- each queue item -->
          <li class="flex flex-col text-sm pt-1 pb-1">
            <!-- title button -->
            <button class="hover:text-blue-800 hover:bg-blue-100" on:click="{() => selectedQueueItem == q.id ? selectedQueueItem = "" : selectedQueueItem = q.id}">
              <span class="flex flex-row justify-between">
                <p>{q.title}</p>
                {#if q.complete}
                  <CheckCircleOutline size="sm" color="green" class="ml-2"></CheckCircleOutline>
                {/if}
              </span>
            </button>
            <!-- expanded options -->
            {#if selectedQueueItem == q.id}
            <span class="flex p-2">
              DL tries: {q.attempts ? q.attempts : 0}
            </span>
            <span class="flex flex-row gap-2 p-2">
              <Button  size="xs" class="w-fit" color="red"
                on:click="{() => deleteQueueRecord(q)}">
                Delete <CloseOutline color="white" class="w-4 h-4 ms-2" />
              </Button>
              <Button size="xs" class="w-fit text-black" color="yellow"
                on:click="{() => addVideo(q.id, q.authorID)}">
                Force Reload <RefreshOutline class="w-4 h-4 ms-2 text-black" />
              </Button>
              <Button size="xs" class="w-fit" color="{q.skip ? 'dark' : 'light'}"
                on:click="{() => toggleSkip(q)}">
                {q.skip ? "Re-queue" : "Skip"}
              </Button>
            </span>
            {/if}
          </li>
        {/each}
      </ul>
      {/await}

    </div>
    <!-- content bar -->
    <div class="grow mt-2 p-2">
      <!-- no content -->
      {#if searching}
        <h4>Searching</h4>
      {/if}
      <!-- content showed up -->
      {#if !searching && (data?.channels?.length > 0 || data?.videos?.length > 0)}
        {#if data?.channels?.length > 0}
        <div class="container pb-2">
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
            {#if video.fileID === undefined}
            <Button size="xs" class="w-fit" color="light"
              on:click="{() => queueVideo(video.id, video.authorID, video.title)}">
              Queue <ArrowRightOutline class="w-4 h-4 ms-2 text-black" />
            </Button>
            {/if}
            {#if video.fileID !== undefined}
            <Button size="xs" class="w-fit" color="yellow"
              on:click="{() => addVideo(video.id, video.authorID)}">
              Reload <RefreshOutline class="w-4 h-4 ms-2 text-black red" />
            </Button>
            {/if}
            <Button size="xs" class="w-fit" color="light" disabled={video.fileID !== undefined}
              on:click="{() => addVideo(video.id, video.authorID)}">
              Add <DownloadOutline class="w-4 h-4 ms-2 text-black" />
            </Button>
            <Button size="xs" class="w-fit" color="light"
              on:click="{() => getVideoDetails(video.id)}">
              Details <InfoCircleOutline class="w-4 h-4 ms-2 text-black" />
            </Button>
          </svelte:fragment>
        </VideoCards>
        <div use:loadMore>
          ...loading more
        </div>
        {/if}
      {/if}
      <!-- results -->
    </div>
  </div>

</div>

