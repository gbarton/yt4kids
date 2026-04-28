import type { Author, Video } from "@backend/db/schema";
import type { PageLoad } from "./$types";

import type { YTSearchResponse } from "@backend/lib/db/Types";

let videos: Video[] = [];
let authors: Record<string, Author> = {};
export const load: PageLoad = async ({fetch, url}) => {

  const params = new URLSearchParams(url.searchParams);
  const offset = +(params.get('offset') || 0);
  const limit = +(params.get('limit') || 9);
  const sort = params.get('sort') || 'latest';
  const authorId = params.get('authorId') || '';
  const search = params.get('search') || '';

  // Ensure defaults are present in the search string sent to the API
  if (!params.has('limit')) params.set('limit', limit.toString());
  if (!params.has('offset')) params.set('offset', offset.toString());
  if (!params.has('sort')) params.set('sort', sort);

  const searchString = '?' + params.toString();

  const [res, authorsRes] = await Promise.all([
    fetch('api/videos/search' + searchString),
    fetch('api/authors?limit=1000&withVideosOnly=true')
  ]);

  if (res.status !== 200) {
    console.log("error");
    return {};
  }
   console.log(`fetch returned`);
  const items = await res.json();
  const searchResults = items as YTSearchResponse;

  let allAuthors: Author[] = [];
  if (authorsRes.ok) {
    const authorsData = await authorsRes.json();
    allAuthors = authorsData.authors;
  }

  // new data
  if (offset == 0) {
    console.log('new search');
    videos = searchResults.videos;
    authors = searchResults.authors;
  } else {
    console.log('merge search');
    videos  = [...videos, ...(searchResults?.videos.filter(video => !videos.some(v => v.id === video.id)) || [])];
    authors  = {...authors, ...(searchResults?.authors || {})};
  }

  return {
    more: searchResults?.videos.length === limit,
    offset,
    limit,
    authorId,
    search,
    sort,
    videos,
    authors,
    allAuthors,
  };
};