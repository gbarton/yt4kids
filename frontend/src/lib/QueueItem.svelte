<script lang="ts">
  import type { Queue } from "@backend/db/schema";
  import { secureFetch } from "./SecureFetch";

  // wierd way to typesafe passed in component props
  let { update, item } : { update: () => Promise<void>, item : Queue} = $props();
  
  // export let item: Queue;
  let isExpanded = $state(false); //false;

  const toggleExpand = () => {
    isExpanded = !isExpanded;
  };


  async function toggleSkip(queueItem: Queue) {
    const res = await secureFetch(`api/queue/${queueItem.id}/skip`, {
      method: "PUT",
      body: JSON.stringify(queueItem),
      headers: {
				'content-type': 'application/json',
			}
    });
    update();
  }

</script>

<div>
  <div class="flex flex-row justify-between">
    <button class="hover:text-blue-500 cursor-pointer"
      onclick={toggleExpand} aria-label="expand">
      {item.title}
  </button>
    <div class="flex items-start">
      {#if item.complete}
        <i class="far fa-check-circle text-green-700 pt-1"></i>
      {:else if item.skip}
        <i class="far fa-times-circle text-black-700 pt-1"></i>
      {/if}
    </div>
  </div>
  {#if isExpanded}
    <div class="mt-2 flex space-x-4 items-center text-sm pb-1">
      <span>{new Date(item.requestedDate).toLocaleString()}</span>
      <span>{item.attempts}</span>
      <button 
        class="p-1 border rounded-md bg-blue-500 hover:bg-blue-700 text-white cursor-pointer" 
        onclick={() => toggleSkip(item)}>
        {item.skip ? 'Skipped' : 'Skip'}
      </button>
    </div>
  {/if}
</div>