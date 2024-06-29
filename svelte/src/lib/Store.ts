import { writable } from 'svelte/store'

// remember to subscribe to these things, they are event driven
// for reactivity
// alternatively can reference them with $ notation, e.g. $authenticated

// is the user logged in
export const authenticated = writable(false);

export interface User {
  email: string,
  admin: boolean,
  displayName: string
}

/**
 * the user object
 */
export const user = writable<User>();

export const accessToken = writable<string>();
export const refreshToken = writable<string>();