import { writable } from 'svelte/store'

//reference them with $ notation, e.g. $authenticated for proper cleanup & reactivity

// is the user logged in
export const loggedIn = writable(false);

export interface User {
  email: string,
  admin: boolean,
  displayName: string
}
// do we have a refresh token in local storage we can use?
// @see https://dev.to/danawoodman/svelte-quick-tip-connect-a-store-to-local-storage-4idi
const lsRFToken = localStorage.getItem("refreshToken");

/**
 * the user object
 */
export const user = writable<User>();

export const accessToken = writable<string>();
export const refreshToken = writable<string>(lsRFToken || undefined);

// if we set refresh token at any point, write it to storage
// TODO: make a checkbox on login for 'keep me logged in' and only store then
refreshToken.subscribe((token) => {
  if (token && token.length > 0) {
    localStorage.setItem("refreshToken", token);
  } else {
    localStorage.removeItem("refreshToken");
  }
});

export function authenticate(u: User, aToken: string, rToken: string) {
  console.log("authenticate function called");
  refreshToken.set(rToken);
  accessToken.set(aToken);
  user.set(u);
  loggedIn.set(true);
}

export function logout() {
  refreshToken.set("");
  accessToken.set("");
  loggedIn.set(false);

}