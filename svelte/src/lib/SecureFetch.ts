import { token } from "./Store";

let t: string;

token.subscribe((tok) => t = tok);


/**
 * Securely fetches a resource with an authentication token.
 *
 * @param url - The URL of the resource to fetch.
 * @param options - An object containing the request options.
 * @returns A promise that resolves to the response of the fetch request.
 */
export async function secureFetch(url: string, options: RequestInit) {
  if (options.headers) {
    options.headers = { ... options.headers, ...{'x-cflr-token': t}}
    console.log('token added');
  } else {
    options.headers = {'x-cflr-token': t};
    console.log('token added');
  }

  return fetch(url, options);
}

// import { authenticate, logout, accessToken, refreshToken, createErrorMessage } from "./Store";

// let a : string;
// let r : string;

// accessToken.subscribe((t) => a = t);
// refreshToken.subscribe((t) => r = t);

/**
 * Performs an authenticated http call using the users
 * tokens, will automatically attempt to refresh a token
 * on call failure, before trying one more time.
 * @param url secure url to hit
 * @param options normal fetch options
 * @returns response object
 */
// export async function secureFetch(url: string, options : RequestInit) {
//   // TODO: bail/redirect/fail if a is empty?
//   if (options.headers) {
//     options.headers = {...options.headers, ...{ 'Authorization': 'Bearer ' + a}};
//   } else {
//     options.headers = { 'Authorization': 'Bearer ' + a};
//   }
//   let resp = await fetch(url, options);
//   // unauthorized, attempt refresh
//   if (!resp.ok && resp.status === 403) {
//     const refresh = await fetch('/api/refreshToken', {
//       method: 'POST',
//       headers: {'Content-Type': 'application/json'},
//       body: JSON.stringify({ refreshToken: r })
//     });
//     if (!refresh.ok) {
//       logout();
//       const err = await refresh.text();
//       createErrorMessage(err || "Error talking to server");
//       return refresh;
//     }
//     const data = await refresh.json();
//     authenticate(data.user, data.accessToken, data.refreshToken);
//     // try again, but need to use the tokens we just got as the store async event
//     // updating would need to make us wait and subscribe
//     if (options.headers) {
//       options.headers = {...options.headers, ...{ 'Authorization': 'Bearer ' + data.accessToken}};
//     } else {
//       options.headers = { 'Authorization': 'Bearer ' + data.accessToken};
//     }
//     return fetch(url, options);
//   }

//   return resp;
// }