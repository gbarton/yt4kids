import { userState } from "./ClientStore.svelte";

/**
 * Securely fetches a resource with an authentication token.
 *
 * @param url - The URL of the resource to fetch.
 * @param options - An object containing the request options.
 * @returns A promise that resolves to the response of the fetch request.
 */
export async function secureFetch(url: string, options: RequestInit) {
  if (options.headers) {
    options.headers = { ... options.headers, ...{'x-cflr-token': userState.token}}
    console.log('token added');
  } else {
    options.headers = {'x-cflr-token': userState.token};
    console.log('token added');
  }

  return fetch(url, options);
}