<script lang="ts">
    import { goto } from '$app/navigation';
  import { type Video, type Author } from '@backend/db/schema';
  export let videos: Video[] = [];
  export let authors: Record<string, Author> = {};

  function getVideoThumbURL(v: Video) {
    return `api/videos/${v.id}/thumbnail`;
  }

  function getAuthorThumbURL(a: Author) {
    return `api/authors/${a.id}/thumbnail`;
  }

</script>

{#if videos?.length > 0}
<div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-8 bg-white rounded-lg w-full">
  {#each videos as video, index (video.id)}
  <a
    href={`watch/${video.id}`} 
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
