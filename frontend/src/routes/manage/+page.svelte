<script lang="ts">
import { goto } from "$app/navigation";
import { admin, loggedIn } from "$lib/ClientStore.svelte";
import QueueItem from "$lib/QueueItem.svelte";
import UploadModal from "$lib/UploadModal.svelte";
import { secureFetch } from "$lib/SecureFetch";
import type { Queue } from "@backend/db/schema";
import type { YTExtVideo } from "@backend/lib/db/Types";
import { onMount } from "svelte";

let queue: Queue[] = $state([]);//[];

let searchQuery = $state(''); //'';
let pageNumber = 0;

async function updateQueue() {
  console.log('queue was modified, trigger reload');
  queue = await getQueue();
}

let videos: YTExtVideo[] = $state([]);//[];

async function getQueue() : Promise<Queue[]> {
  const resp = await fetch('api/queue');
  if (!resp.ok) {
    return [];
  }

  const data = await resp.json();
  return data as Queue[];
}


async function saveAuthor(video: YTExtVideo) {
  console.log('requesting saving author');
  const resp = await secureFetch('api/ext/author', {
    method: 'POST',
    body: JSON.stringify(video),
    headers: {
      'content-type': 'application/json',
    }
  });
  if(!resp.ok) {
    console.log('something went wrong saving author');
  }
}

async function queueVideo(videoId: string, authorId: string, title: string) {
  console.log("add a video", videoId, authorId);
  const resp = await secureFetch('api/queue', {
    method: 'POST',
    body: JSON.stringify({id: videoId, authorId, title}),
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
  // createInfoMessage(message);
  console.log('queue response', data);
  queue = await getQueue();
}

async function handleQueue(video: YTExtVideo) {
  await saveAuthor(video);
  await queueVideo(video.id, video.authorId, video.title);
}

// Upload modal state
let showUploadModal = $state(false);
let uploadVideoTarget: YTExtVideo | null = $state(null);

function openUploadModal(video: YTExtVideo) {
  uploadVideoTarget = video;
  showUploadModal = true;
}

function closeUploadModal() {
  showUploadModal = false;
  uploadVideoTarget = null;
}

async function onUploadComplete() {
  showUploadModal = false;
  uploadVideoTarget = null;
  // Re-run search to show the video as downloaded
  await submit(new Event('submit'));
}

const submit = async (event: Event ) => {
  console.log('search');

  const params: string[][] = [['page', `${pageNumber}`]];
  if (searchQuery) {
    params.push(['search', searchQuery.toString()]);
  }

  const encodedParams = new URLSearchParams(params).toString();

  const res = await secureFetch('api/ext/search?' + encodedParams, {});
  // searching = false;
  if (!res.ok) {
    console.log("error searching");
    videos = [];
    // createErrorMessage("Error searching, please try again");
    return;
  }

  const json = await res.json();
  console.log(json);
  // reset
  if (pageNumber == 0) {
    videos = [];
  }

  // add new data
  const sr = json as YTExtVideo[];
  videos = [...videos, ...sr];
}

onMount(async () => {
  if( !loggedIn()) {
    goto('/login');
  }
  if (!admin()) {
    goto('/');
  }
  queue = await getQueue();
});

</script>

<div class="flex w-screen">
  <!-- Left Pane Queue -->
  <div class="w-1/4 flex-none bg-gray-200 p-2">
    <div class="w-full flex flex-row justify-between">
      <span class="p-2 font-semibold">Queue</span>
      <button class="p-2 rounded-md hover:bg-gray-300 cursor-pointer"
        onclick="{() => updateQueue()}"
        aria-label="refresh queue">
        <i class="fas fa-sync"></i>
      </button>
    </div>
    <div class="w-full">
      {#if queue.length == 0}
      nothing in queue
      {:else}
      {#each queue as item (item.id)}
      <div class="w-full border-b">
        <QueueItem item={item} update={updateQueue}/>
      </div>
      {/each}
      {/if}
    </div>
  </div>

  <!-- Right Pane -->
  <div class="grow">
    <form onsubmit={submit} class="flex gap-x-2 p-8 bg-white rounded-lg w-full"> 
      <input 
        type="text" 
        bind:value={searchQuery} 
        placeholder="Search videos..." 
        class="p-2 w-full border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      />
      <button type="submit" class="p-2 rounded-md hover:bg-gray-300 cursor-pointer">Search</button>
    </form>

    {#if videos?.length > 0}
    <div class="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-8 bg-white rounded-lg w-full">
      {#each videos as video, index (video.id)}
        <div class="flex flex-col bg-gray-100 shadow-md rounded-lg overflow-hidden hover:bg-gray-200 transition duration-300 relative">

          <!-- Downloaded badge -->
          {#if video.downloaded}
            <div class="absolute top-2 left-2 z-10 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-md shadow flex items-center gap-1">
              <i class="fas fa-check"></i> Downloaded
            </div>
          {/if}

          <img src={video.thumbnails[0].url} alt={video.title} class="w-full h-auto" />

          <div class="p-4 flex-grow">
            <h3 class="text-md font-medium">{video.title}</h3>
            <div class="flex items-center mt-2">
              <img src={video.authorThumbnails[0].url} alt="avatar" class="w-10 h-10 rounded-full mr-2" />
              <p class="text-gray-700">{video.authorName}</p>
            </div>
          </div>
          <div class="flex justify-end space-x-2 p-2 ">
            <button onclick={() => handleQueue(video)} class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded cursor-pointer" title="Queue" aria-label="queue">
              <i class="fas fa-tasks"></i>
            </button>
            <button class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded cursor-pointer" title="Download" aria-label="download">
              <i class="fas fa-download"></i>
            </button>
            <button onclick={() => openUploadModal(video)} class="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded cursor-pointer" title="Upload Video" aria-label="upload">
              <i class="fas fa-upload"></i>
            </button>
            <button class="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded cursor-pointer" title="Details" aria-label="details">
              <i class="fas fa-info-circle"></i>
            </button>
            <button class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded cursor-pointer" title="Thumbnails" aria-label="thumbnails">
              <i class="fas fa-images"></i>
            </button>
          </div>
        </div>
      {/each}
    </div>
    {:else}
      <div class="flex items-center justify-center p-8 bg-white rounded-lg w-full">
        search youtube for something..
      </div>
    {/if}   
  </div>
</div>

{#if showUploadModal && uploadVideoTarget}
  <UploadModal
    videoId={uploadVideoTarget.id}
    authorId={uploadVideoTarget.authorId}
    authorThumbnails={uploadVideoTarget.authorThumbnails}
    title={uploadVideoTarget.title}
    onClose={closeUploadModal}
    onUploadComplete={onUploadComplete}
  />
{/if}

<style>
</style>