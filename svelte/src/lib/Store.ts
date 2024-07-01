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

/**
 * log the user out right now
 */
export function logout() {
  refreshToken.set("");
  accessToken.set("");
  loggedIn.set(false);
  createInfoMessage("logged out!");
}

export type MessageType = "error" | "newVideo" | "loggedIn" | "info";
export type Message = {
  id: number,
  type: MessageType,
  msg: string,
  dismissible: boolean,
  timeout: number,
}

export const message = writable<Message>();

export const messages = writable<Message[]>([]);

export const dismissMessage = (id: number) => {
  messages.update((all) => all.filter((t) => t.id !== id));
};

const addMessage = (type: MessageType, msg: string) => {
  // Create a unique ID so we can easily find/remove it
  // if it is dismissible/has a timeout.
  const id = Math.floor(Math.random() * 10000);
  const newMsg: Message = {
    id,
    type,
    msg,
    dismissible: true,
    timeout: 15000
  }

  // Push the toast to the top of the list of toasts
  messages.update((all) => [newMsg, ...all]);

  // If msg Toast is dismissible, dismiss it after "timeout" amount of time.
  if (newMsg.timeout) {
    setTimeout(() => dismissMessage(id),
    newMsg.timeout);
  }
};

export function createErrorMessage(msg:string) {
  console.log('created error message ' + msg);
  addMessage("error", msg);
}

export function createLoginMessage(msg: string) {
  addMessage("loggedIn", msg);
}

export function createInfoMessage(msg: string) {
  addMessage("info", msg);
}
