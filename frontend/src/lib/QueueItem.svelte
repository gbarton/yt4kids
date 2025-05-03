<script lang="ts">
  import type { Queue } from "@backend/db/schema";

  export let item: Queue;
</script>

<div class="p-2 border-b hover:bg-gray-100 cursor-pointer">
  
  {item.title}
</div>