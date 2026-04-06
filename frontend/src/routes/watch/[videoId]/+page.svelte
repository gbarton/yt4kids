<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

</script>

<style lang="postcss">
  .video-container {
    width: 100%;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .video-player {
    width: 100%;
    height: 100%;
  }
</style>

{#if data.video}
<div class="video-container flex flex-col">
  <video controls class="video-player" src={`/api/videos/${data.video.id}/chunk`}>
    <track kind="captions" srclang="en" label="English Captions"/>
  </video>
  <h3 class="text-2xl font-bold"> {data.video.title} </h3>
</div>
{:else}
Loading video info
{/if}
