import type { Author, Video } from "@backend/db/schema";
import type { PageLoad } from "./$types";

import type { YTSearchResponse } from "@backend/lib/db/Types";

let videos: Video[] = [];
let authors: Record<string, Author> = {};

export const load: PageLoad = async ({fetch, url}) => {
  
  let searchString = '';
  const offset: number = +(url.searchParams.get('offset') || 0);
  const limit: number = +(url.searchParams.get('limit') || 6);
  const search = url.searchParams.get('search') || '';
  const authorId = url.searchParams.get('authorId') || '';
  const sort = url.searchParams.get('sort') || 'latest';

  if (url.searchParams.size > 0) {
    console.log('enough params to send');
    searchString += '?' + url.searchParams;
  } else {
    searchString += `?limit=${limit}&offset=${offset}&sort=${sort}`; 
  }
  
  const [res, authorsRes] = await Promise.all([
    fetch('api/videos/search' + searchString),
    fetch('api/authors?limit=1000')
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
    more: searchResults?.videos.length > 0 ? true : false,
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