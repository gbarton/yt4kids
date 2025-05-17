import type { PageLoad } from "./$types";
import type { Video } from '@backend/db/schema';

export const load: PageLoad = async ({fetch, params}) => {
  console.log('retrieving video info for video ' + params.videoId );
  const res = await fetch(`../api/videos/${params.videoId}`);
  if (res.status !== 200) {
    console.log("error");
    return {};
  }
  console.log(`fetch returned`);
  const items = await res.json();
  // console.log(items);
  return {
    video: items as Video,
  };
};