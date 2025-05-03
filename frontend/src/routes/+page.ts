import type { PageLoad } from "./$types";

import { type YTSearchResponse } from "@backend/lib/db/Types";

export const load: PageLoad = async ({fetch}) => {
  
  const res = await fetch('api/videos/search');
  if (res.status !== 200) {
    console.log("error");
    return {};
  }
   console.log(`fetch returned`);
  const items = await res.json();
  return {
    searchResponse: items as YTSearchResponse,
  };
};