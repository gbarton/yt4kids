<script lang="ts">
    import { goto } from '$app/navigation';
  import type { Video, Author } from '@backend/src/db/schema';
  import { onMount } from 'svelte';
  export let videos: Video[] = [];
  export let authors: Record<string, Author> = {};

  function getVideoThumbURL(v: Video) {
    return `api/videos/${v.id}/thumbnail`;
  }

  function getAuthorThumbURL(a: Author) {
    return `api/authors/${a.id}/thumbnail`;
  }

  onMount(() => {
    console.log('videos display mounted');
  });

  // function loadMore(node: Element) {
  //   const obs = new IntersectionObserver((entries) => {
  //     // I think this only fires once because we are just tied to the window
  //     entries.forEach((entry) => {
  //       console.log('here');
  //       console.log(entry);
  //       if (entry.isIntersecting) {
  //         console.log('intersection detected');
  //         // offset += data?.videos?.length || 0;
  //         // load(true);
  //       }
  //     });
  //   },
  //   {
  //     // threshold: 0.1 , // 10%
  //   });

  //   obs.observe(node);
  //   return {
  //     destroy: () => {
  //       console.log('destroyed obervable')
  //       obs.disconnect();
  //     }
  //   }
  // }

</script>

{#if videos?.length > 0}
<div class="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-8 bg-white rounded-lg w-full">
  {#each videos as video, index (video.id)}
  <a
    href={`/watch/${video.id}`} 
    class="flex flex-col bg-gray-10z0 shadow-md rounded-lg overflow-hidden hover:bg-gray-200 transition duration-300 relative cursor-pointer">

    <img src={getVideoThumbURL(video)} alt={video.title} class="w-full h-auto" />
    <div class="p-4 flex-grow">
      <h3 class="text-md font-medium">{video.title}</h3>
      <div class="flex items-center mt-2">
        <img src="{getAuthorThumbURL(authors[video.authorId])}" alt="avatar" class="w-10 h-10 rounded-full mr-2" />
        <p class="text-gray-700">{authors[video.authorId].name}</p>
      </div>
    </div>
  </a>
  {/each}
</div>

{/if}
