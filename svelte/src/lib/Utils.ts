
/**
 * Rummages around the given querystring, if its empty
 * it goes looking in the window location search for stuffs
 */
export function getSearchParams(queryString: string): URLSearchParams {
  console.log('homepage server url params');
  let queryStr = queryString;
  if (queryStr === "") {
    queryStr = window.location.search;
    console.log("using window params: " + queryStr);
  }
  const searchParams = new URLSearchParams(queryStr);
  console.log(searchParams.toString());
  let searchString = '';
  if (searchParams.size > 0) {
    console.log('enough params to send');
    searchString += '?' + searchParams;
  }
  return searchParams;
}