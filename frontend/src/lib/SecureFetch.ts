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

/**
 * Upload progress callback
 */
export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

/**
 * Upload a file with progress tracking. Uses XMLHttpRequest since fetch doesn't support upload progress.
 */
export function uploadVideo(
  url: string,
  formData: FormData,
  onProgress: (progress: UploadProgress) => void
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener('load', () => {
      const response = new Response(xhr.responseText, {
        status: xhr.status,
        headers: {
          'Content-Type': xhr.getResponseHeader('Content-Type') || 'application/json',
        },
      });
      resolve(response);
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', url);
    // Add auth token header
    xhr.setRequestHeader('x-cflr-token', userState.token);
    // Don't set Content-Type - let the browser set it with the boundary for multipart
    xhr.send(formData);
  });
}