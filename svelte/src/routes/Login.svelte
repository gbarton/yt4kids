<script type="ts">
  import { push } from 'svelte-spa-router'
  import { Button, Checkbox, Label, Input } from 'flowbite-svelte';
  import { authenticate, loggedIn, user } from '../lib/Store';
  import { onDestroy } from 'svelte';

  const unsubLoggedIn = loggedIn.subscribe((yup) => {
    console.log("caught loggedIn event, redirecting");
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
      const resp = await fetch('/api/login', {
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
        // will update the loggedIn event we wait for
        authenticate(data.user, data.accessToken, data.refreshToken);
      } else {
        console.log('error logging in ' + resp?.body)
      }
  }

</script>

<form class="flex flex-col space-y-6" on:submit|preventDefault={submit}>
  <h3 class="mb-4 text-xl font-medium text-gray-900 dark:text-white">Sign in to our platform</h3>
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
    <a href="/" class="ms-auto text-sm text-primary-700 hover:underline dark:text-primary-500"> Lost password? </a>
  </div>
  <Button type="submit" class="w-full1">Login to your account</Button>
  <div class="text-sm font-medium text-gray-500 dark:text-gray-300">
    Not registered? <a href="/" class="text-primary-700 hover:underline dark:text-primary-500"> Create account </a>
  </div>
</form>