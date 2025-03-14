<script lang="ts">
  import { Badge, Button } from 'flowbite-svelte';
  import { ArrowRightOutline, CloseCircleOutline, SearchOutline } from 'flowbite-svelte-icons';
  
  import { VideoCards } from '../lib/components';

  import { querystring, push } from 'svelte-spa-router';

  import { onMount } from 'svelte';
  import type { YTSearchResponse } from '../lib/Types';

  import { user } from '../lib/Store'
    import { getSearchParams } from '../lib/Utils';

  let admin = false;

  const limit = 20;
  let offset = 0;

  user.subscribe((u) => {
    if (u && u.admin) {
      admin = true;
    }
  });

  async function reDownloadThumbnails(videoID: string) {
    await fetch('api/ext/thumbnails', {
      method: 'POST',
      body: JSON.stringify({videoID}),
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  async function load(more: boolean = false) {
    const searchParams = getSearchParams($querystring || "");
    options = [];
    searchParams.forEach((val, k) => {
      options.push({ key : k, value: val});
    });
    
    let searchString = '?' + searchParams;

    // add in limit and offset
    if (!more) {
      offset = 0;
    }
    if (!searchString.endsWith('?')) {
      searchString += '&';
    }
    searchString += `limit=${limit}&offset=${offset}`;

    const res = await fetch('api/videos/search' + searchString);
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
    if(more) {
      console.log(`continuation load offset: ${offset} for ${limit} more`);
      // merge
      const newData = items as YTSearchResponse;
      // marging the videos together
      data.videos = [
        ...data.videos.filter(video => !newData.videos.some(newVideo => newVideo.id === video.id)),
        ...newData.videos
      ];
      // data.videos.push(...newData.videos);
      data.query = newData.query;
      data.authors = {...data.authors, ...newData.authors};
    } else {
      console.log('new search');
      data = items as YTSearchResponse;
    }
  }

  function loadMore(node: Element) {
    const obs = new IntersectionObserver((entries) => {
      // I think this only fires once because we are just tied to the window
      entries.forEach((entry) => {
        console.log('here');
        console.log(entry);
        if (entry.isIntersecting) {
          console.log('intersection detected');
          offset += data?.videos?.length || 0;
          load(true);
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

  $: {
    console.log(`triggered from new params update: '${$querystring}'`);
    load();
  }
  
  type KV = {
    key: string,
    value: string,
  }

  let options : KV[] = [];

  let data : YTSearchResponse;
  console.log("home page log");

  // onMount(() => {
  //   load();
  // });

</script>

<div class="p-8">
  {#each options as opt}
    <Button color="alternative" on:click="{() => {push('/')}}">{opt.key}: {opt.value} <CloseCircleOutline class="w-5 h-5 ms-2"/></Button>
  {/each}
</div>

<div class="md:p-8">
  {#if data?.videos?.length > 0}
  <VideoCards videos={data.videos} authors={data.authors}>
    <svelte:fragment slot="buttons" let:video>
      <Button size="xs" slot="buttons" class="w-fit" color="light" href="#/watch/{video.id}">
        View <ArrowRightOutline class="w-4 h-4 ms-2 text-black" />
      </Button>
      {#if admin}
      <Button size="xs" slot="buttons" class="w-fit" color="light" href="#/admin?search={data?.authors[video.authorID].name}">
        Search <SearchOutline class="w-4 h-4 ms-2 text-black" />
      </Button>
      <Button size="xs" class="w-fit" color="light"
        on:click="{() =>reDownloadThumbnails(video.id)}">
        Thumbnails
      </Button>
      {/if}
    </svelte:fragment>
  </VideoCards>
  <div use:loadMore>
    ...loading more
  </div>
  {/if}

</div>

