<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import { ArrowRightOutline, DownloadOutline, SearchOutline } from 'flowbite-svelte-icons';
  
  import { VideoCards } from '../lib/components';

  import { onMount } from 'svelte';
  import type { YTSearchResponse } from '../lib/Types';

  export let data : YTSearchResponse;
  console.log("home page log");

  onMount(async () => {
    console.log('homepage server url params');
    const searchParams = new URLSearchParams(window.location.search);
    console.log(searchParams.entries());
    let searchString = '';
    if (searchParams.size > 0) {
      searchString += '?' + searchParams;
    }

    const res = await fetch('/api/search' + searchString);
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
    // console.log(items.authors['UCK9X9/JACEsonjbqaewUtICA']);
    data = items as YTSearchResponse;
  });

</script>

<div class="p-8">
  {#if data?.videos?.length > 0}
  <VideoCards videos={data.videos} authors={data.authors}>
    <Button size="xs" slot="buttons" let:video class="w-fit" color="light" href="#/watch/{video.id}">
      View <ArrowRightOutline class="w-4 h-4 ms-2 text-black" />
    </Button>
  </VideoCards>
  {/if}

</div>

