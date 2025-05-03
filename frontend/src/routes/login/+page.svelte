<script lang="ts">
  import { goto } from '$app/navigation';
  import { loginUser } from '$lib/ClientStore.svelte';


  let email: string = '';
  let password: string = '';

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
        loginUser(csrfToken, data.profile);
        goto('/');
        // createLoginMessage("welcome " + data.profile.displayName);
      } else {
        // createErrorMessage('login didnt send all the right bits! Try again');
      }
    } else {
      console.log('error logging in ' + resp?.body);
      console.log(resp.body);
      // createErrorMessage("Unable to login, try again");
    }
}

</script>

<main class="flex items-center justify-center min-h-screen bg-gray-100">
  <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
    <h2 class="text-2xl font-bold mb-6 text-center">Login</h2>
    <form on:submit|preventDefault={submit}>
      <div class="mb-4">
        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
        <input id="email" bind:value={email} type="email" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
      </div>
      <div class="mb-6">
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <input id="password" bind:value={password} type="password" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
      </div>
      <button type="submit" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-150 ease-in-out">Login</button>
    </form>
    <p class="mt-4 text-center">
      Don't have an account? <a href="/register" class="text-indigo-600 hover:text-indigo-700 transition duration-150 ease-in-out">Register</a>
    </p>
  </div>
</main>
