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

  user.subscribe((u) => {
    if (u && u.admin) {
      admin = true;
    }
  });

  async function load() {
    const searchParams = getSearchParams($querystring || "");
    options = [];
    searchParams.forEach((val, k) => {
      options.push({ key : k, value: val});
    });

    const searchString = '?' + searchParams;

    const res = await fetch('/api/videos/search' + searchString);
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

  onMount(() => {
    load();
  });

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
      <Button size="xs" slot="buttons" class="w-fit" color="light" href="/#/watch/{video.id}">
        View <ArrowRightOutline class="w-4 h-4 ms-2 text-black" />
      </Button>
      {#if admin}
      <Button size="xs" slot="buttons" class="w-fit" color="light" href="/#/admin?search={data?.authors[video.authorID].name}">
        Search <SearchOutline class="w-4 h-4 ms-2 text-black" />
      </Button>
      {/if}
    </svelte:fragment>
  </VideoCards>
  {/if}

</div>

