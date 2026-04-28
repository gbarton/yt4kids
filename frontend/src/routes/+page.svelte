<script lang="ts">
  import type { PageProps } from './$types';
  import Videos from '$lib/Videos.svelte';
  import type { Author, Video } from '@backend/db/schema';
  import { goto } from '$app/navigation';

  let {data}: PageProps = $props();
  let videos = $derived(data.videos);
  let authors = $derived(data.authors);
  let more = $derived(data.more);
  let isCollapsed = $state(false);
  let isLoading = $state(false);

  let isIntersecting = $state(false);

  function loadMore(node: Element) {
    const obs = new IntersectionObserver((entries) => {
      isIntersecting = entries[0].isIntersecting;
    });

    obs.observe(node);
    return {
      destroy: () => obs.disconnect()
    }
  }

  $effect(() => {
    if (isIntersecting && more && !isLoading) {
      loadNextPage();
    }
  });

  async function loadNextPage() {
    isLoading = true;
    const params = new URLSearchParams(window.location.search);
    params.set('limit', (data.limit || 9).toString());
    params.set('offset', (videos?.length || 0).toString());
    await goto(`/?${params.toString()}`, {
      noScroll: true,
      keepFocus: true,
    });
    isLoading = false;
  }

  function clearFilter() {
    goto('/', {
      noScroll: true,
      keepFocus: true,
    });
  }

  function setSort(sort: string) {
    const params = new URLSearchParams(window.location.search);
    params.set('sort', sort);
    params.set('offset', '0');
    goto(`/?${params.toString()}`, {
      noScroll: true,
      keepFocus: true,
    });
  }

  function setAuthor(authorId: string) {
    const params = new URLSearchParams(window.location.search);
    params.set('authorId', authorId);
    params.set('offset', '0');
    goto(`/?${params.toString()}`, {
      noScroll: true,
      keepFocus: true,
    });
  }


</script>

<div class="flex min-h-screen">
  <!-- Sidebar -->
  <aside 
    class="border-r bg-white transition-all duration-300 ease-in-out hidden md:flex flex-col sticky top-0 h-screen {isCollapsed ? 'w-16' : 'w-64'}"
  >
    <div class="flex flex-col h-full overflow-y-auto overflow-x-hidden {isCollapsed ? 'items-center py-4' : 'p-4'}">
      <!-- Toggle Button -->
      <button 
        onclick={() => isCollapsed = !isCollapsed}
        class="mb-6 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors shrink-0 {isCollapsed ? '' : 'self-end'}"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <i class="fas {isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}"></i>
      </button>

      <div class="mb-8 w-full">
        {#if !isCollapsed}
          <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-3">Sort By</h2>
        {/if}
        <div class="flex flex-col gap-1 {isCollapsed ? 'items-center' : ''}">
          {#each ['latest', 'oldest', 'author', 'title'] as sortOption}
            <button 
              onclick={() => setSort(sortOption)} 
              class="flex items-center transition-colors hover:bg-gray-100 capitalize {isCollapsed ? 'justify-center w-10 h-10 rounded-full' : 'gap-3 px-3 py-2 rounded-lg w-full'} {data.sort === sortOption ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600'}"
              title={isCollapsed ? sortOption : ""}
            >
              <i class="fas fa-{sortOption === 'latest' ? 'clock' : sortOption === 'oldest' ? 'history' : sortOption === 'author' ? 'user' : 'font'} {isCollapsed ? 'text-lg' : 'w-5 text-center'} shrink-0"></i>
              {#if !isCollapsed}
                <span class="truncate">{sortOption}</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <div class="flex-1 w-full">
        {#if !isCollapsed}
          <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-3">Authors</h2>
        {/if}
        <div class="flex flex-col gap-1 {isCollapsed ? 'items-center' : ''}">
          <button 
            onclick={clearFilter} 
            class="flex items-center transition-colors hover:bg-gray-100 text-left {isCollapsed ? 'justify-center w-10 h-10 rounded-full' : 'gap-3 px-3 py-2 rounded-lg w-full'} {!data.authorId ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600'}"
            title={isCollapsed ? "All Authors" : ""}
          >
            <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs shrink-0">
              <i class="fas fa-users"></i>
            </div>
            {#if !isCollapsed}
              <span class="truncate">All Authors</span>
            {/if}
          </button>
          {#each data.allAuthors as author}
            <button 
              onclick={() => setAuthor(author.id)} 
              class="flex items-center transition-colors hover:bg-gray-100 text-left {isCollapsed ? 'justify-center w-10 h-10 rounded-full' : 'gap-3 px-3 py-2 rounded-lg w-full'} {data.authorId === author.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600'}"
              title={isCollapsed ? author.name : ""}
            >
              <img src={`api/authors/${author.id}/thumbnail`} alt={author.name} class="w-6 h-6 rounded-full object-cover shrink-0" />
              {#if !isCollapsed}
                <span class="truncate">{author.name}</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1">
    {#if videos && videos.length > 0 && authors}
      <!-- Active filter indicator -->
      {#if data.authorId && data.authorId in authors}
        <div class="flex items-center justify-between p-4 bg-indigo-50 border-b border-indigo-200">
          <div class="flex items-center gap-2">
            <img src={`api/authors/${authors[data.authorId].id}/thumbnail`} alt="avatar" class="w-8 h-8 rounded-full object-cover" />
            <span class="font-medium text-indigo-900">Filtered by: {authors[data.authorId].name}</span>
          </div>
          <button
            onclick={clearFilter}
            class="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            <i class="fas fa-times"></i> Clear filter
          </button>
        </div>
      {/if}
      <Videos videos={videos} authors={authors} />
      {#if more}
        <div use:loadMore class="p-8 text-center text-gray-400">
          <i class="fas fa-spinner fa-spin mr-2"></i> Loading more...
        </div>
      {/if}
    {:else if videos && videos.length == 0 && data.offset == 0}
    <div class="flex flex-col justify-center items-center h-full min-h-[50vh]">
      <p class="text-lg text-gray-500">Please download some videos using an admin account!</p>
      <a href="/login" class="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Login</a>
    </div>
    {:else}
    <div class="flex flex-col justify-center items-center h-full min-h-[50vh]">
      <p class="text-lg text-gray-500">No results found, please go back home and try again</p>
      <a href="/" class="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Home</a>
    </div>
    {/if}
  </main>
</div>
