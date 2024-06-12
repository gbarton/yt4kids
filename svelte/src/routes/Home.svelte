<script lang="ts">
  import { Badge, Button } from 'flowbite-svelte';
  import { ArrowRightOutline, DownloadOutline, SearchOutline } from 'flowbite-svelte-icons';
  
  import { VideoCards } from '../lib/components';

  import { querystring } from 'svelte-spa-router';

  import { onMount } from 'svelte';
  import type { YTSearchResponse } from '../lib/Types';

  type KV = {
    key: string,
    value: string,
  }

  let options : KV[] = [];

  let data : YTSearchResponse;
  console.log("home page log");

  onMount(async () => {
    console.log('homepage server url params');
    console.log($querystring);
    console.log($querystring === "");
    let queryStr = $querystring;
    if (queryStr === "") {
      queryStr = window.location.search;
      console.log("using window params: " + queryStr);
    }
    const searchParams = new URLSearchParams(queryStr);
    console.log(searchParams.toString());
    let searchString = '';
    if (searchParams.size > 0) {
      console.log('enough params to send');
      searchString += '?' + searchParams;
      options = [];
      searchParams.forEach((val, k) => {
        options.push({ key : k, value: val});
      });
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
  {#each options as opt}
    <Badge color="dark">{opt.key}</Badge>
  {/each}
</div>

<div class="p-8">
  {#if data?.videos?.length > 0}
  <VideoCards videos={data.videos} authors={data.authors}>
    <Button size="xs" slot="buttons" let:video class="w-fit" color="light" href="#/watch/{video.id}">
      View <ArrowRightOutline class="w-4 h-4 ms-2 text-black" />
    </Button>
  </VideoCards>
  {/if}

</div>

