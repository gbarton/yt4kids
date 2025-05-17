export interface User {
  email: string,
  admin: boolean,
  displayName: string,
  token: string,
}

export const userState: User = $state({
  displayName: '',
  admin: false,
  email: '',
  token: '',
});

// avoiding this error:
// Cannot export state from a module if it is reassigned.
// Either export a function returning the state value or only mutate the state value's properties
export function loginUser(t: string, u: User) {
  userState.token = t;
  userState.displayName = u.displayName;
  userState.admin = u.admin;
  userState.email = u.email;
  localStorage.setItem('token', t);
}

const isLoggedIn = $derived(userState.displayName.length > 0 && userState.token.length > 0);

export function loggedIn() {
  return isLoggedIn;
}

export function admin() {
  return userState.admin;
}

// see if we can pull a token from storage
const loadedToken = localStorage.getItem('token');
if(loadedToken && loadedToken.length > 0) {
  console.log('loaded token from localstorage');

  fetch('/api/user/profile', {
    headers: {'x-cflr-token': loadedToken}
  }).then((res) => {
    if(res.ok) {
      res.json().then((data) => {
        loginUser(loadedToken, data);
      })
    }
  }).catch(() => {
    console.log('error getting profile from token');
  });
  // if (res.ok) {
  //   const profile = await res.json();
  //   loginUser(loadedToken, profile);
  // }
} else {
  console.log('didnt see a token to load');
}