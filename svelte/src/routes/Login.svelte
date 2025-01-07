<script type="ts">
  import { push } from 'svelte-spa-router'
  import { Button, Checkbox, Label, Input } from 'flowbite-svelte';
  import { authenticated, createErrorMessage, createLoginMessage, loggedIn } from '../lib/Store';
  import { onDestroy } from 'svelte';

  const unsubLoggedIn = loggedIn.subscribe((yup) => {
    console.log(`caught loggedIn event, redirecting value: ${yup}`);
    // can fire for empty event apparently
    if (yup) {
      push("/");
    }
  });

  onDestroy(() => {
    console.log("login destroyed");
    unsubLoggedIn();
  })

  let email = '', password = ''

  const submit = async () => {
      const resp = await fetch('api/user/login', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            email,
            password
          })
      });
      // if we got a valid response back, save our user object and tokens
      if (resp.ok) {
        console.log("logged in");
        const data = await resp.json();
        console.log('user data is');
        console.log(data);
        const csrfToken = resp.headers.get('x-cflr-token');
        // will update the loggedIn event we wait for
        if (csrfToken) {
          authenticated(data.profile, csrfToken);
          createLoginMessage("welcome " + data.profile.displayName);
        } else {
          createErrorMessage('login didnt send all the right bits! Try again');
        }
      } else {
        console.log('error logging in ' + resp?.body);
        createErrorMessage("Unable to login, try again");
      }
  }

</script>

<div class="flex justify-center items-center min-h-screen">
  <form on:submit|preventDefault={submit} class="p-8 bg-white shadow-lg rounded-md w-full max-w-md">
    <h1 class="text-2xl font-bold mb-6">Sign in</h1>
    
    <Label class="space-y-2">
      <span>Email</span>
      <Input bind:value={email} type="email" id="email" placeholder="john.doe@company.com" required />
    </Label>
    <Label class="space-y-2">
      <span>Your password</span>
      <Input bind:value={password} type="password" name="password" placeholder="•••••" required />
    </Label>
    <div class="flex items-start">
      <Checkbox>Remember me</Checkbox>
      <!-- <a href="/" class="ms-auto text-sm text-primary-700 hover:underline dark:text-primary-500"> Lost password? </a> -->
    </div>
    <Button type="submit" class="w-full bg-primary-600 hover:bg-primary-700 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">Login to your account</Button>
    <div class="text-sm font-medium text-gray-500 dark:text-gray-300">
      Not registered? <a href="#/register" class="text-primary-700 hover:underline dark:text-primary-500"> Create account </a>
    </div>
  </form>
</div>