import { authenticate, logout, accessToken, refreshToken } from "./Store";

let a : string;
let r : string;

accessToken.subscribe((t) => a = t);
refreshToken.subscribe((t) => r = t);

/**
 * Performs an authenticated http call using the users
 * tokens, will automatically attempt to refresh a token
 * on call failure, before trying one more time.
 * @param url secure url to hit
 * @param options normal fetch options
 * @returns response object
 */
export async function secureFetch(url: string, options : RequestInit) {
  // TODO: bail/redirect/fail if a is empty?
  if (options.headers) {
    options.headers = {...options.headers, ...{ 'Authorization': 'Bearer ' + a}};
  } else {
    options.headers = { 'Authorization': 'Bearer ' + a};
  }
  let resp = await fetch(url, options);
  // unauthorized, attempt refresh
  if (!resp.ok && resp.status === 401) {
    const refresh = await fetch('/api/refreshToken', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ refreshToken: r })
    });
    if (!refresh.ok) {
      logout();
      return refresh;
    }
    const data = await refresh.json();
    authenticate(data.user, data.accessToken, data.refreshToken);
    // try again, but need to use the tokens we just got as the store async event
    // updating would need to make us wait and subscribe
    if (options.headers) {
      options.headers = {...options.headers, ...{ 'Authorization': 'Bearer ' + data.accessToken}};
    } else {
      options.headers = { 'Authorization': 'Bearer ' + data.accessToken};
    }
    return fetch(url, options);
  }

  return resp;
}