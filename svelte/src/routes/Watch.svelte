<script lang="ts">
  import { Video } from 'flowbite-svelte';
  import { onMount } from 'svelte';
    import type { YTVideoInfo } from '../lib/Types';

  type ParamTypes = {
    videoID?: string,
  }

  export let params: ParamTypes = {}
  let videoInfo : YTVideoInfo;

  onMount(async () => {
    console.log('watch server url params' + params.videoID);
    if (!params?.videoID) {
      return;
    }

    const res = await fetch('api/videos/info/' + params.videoID);
    if (!res.ok) {
      return;
    }
    videoInfo = await res.json() as YTVideoInfo;
  });
  console.log('watch page');
  console.log(params);

</script>

<div class="container">
{#if videoInfo}
  <h3>{videoInfo.title}</h3>
{/if}

{#if params?.videoID}
	<Video
		src="api/videos/chunk/{params.videoID}"
    preload="auto"
		controls
		crossorigin="anonymous"
		class="w-full max-w-full h-auto"
	></Video>
{/if}
</div>