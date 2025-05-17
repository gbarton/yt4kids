<script lang="ts">
  import type { PageProps } from './$types';
  import Videos from '$lib/Videos.svelte';
  import type { Author, Video } from '@backend/db/schema';
  import { goto } from '$app/navigation';

  let {data}: PageProps = $props();
  let videos = $derived(data.videos);
  let authors = $derived(data.authors);
  let more = $derived(data.more);
    
  function loadMore(node: Element) {
    const obs = new IntersectionObserver((entries) => {
      // I think this only fires once because we are just tied to the window
      entries.forEach((entry) => {
        console.log('here');
        console.log(entry);
        if (entry.isIntersecting) {
          console.log('intersection detected');
          // guard against infinite queries
          if (more) {
            goto(`/?limit=${data.limit}&offset=${videos?.length || 0}`, {
              // replaceState: true,
              noScroll: true,
              keepFocus: true,
            });
          }
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

  
</script>
{#if videos && videos.length > 0 && authors}
  <Videos videos={videos} authors={authors} />
  {#if more}
  <div use:loadMore>
    ...loading more
  </div>
  {/if}
{:else if videos && videos.length == 0 && data.offset == 0}
<div class="flex flex-col justify-center items-center h-screen">
  <p class="text-lg text-gray-500">Please download some videos using an admin account!</p>
  <a href="/login" class="ml-2 text-blue-500 underline">Login</a>
</div>
{:else}
<div class="flex flex-col justify-center items-center h-screen">
  <p class="text-lg text-gray-500">No results found, please go back home and try again</p>
  <a href="/" class="ml-2 text-blue-500 underline">Home</a>
</div>

{/if}
