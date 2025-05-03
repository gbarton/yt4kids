<script lang="ts">
  import { goto } from "$app/navigation";

  let displayName = '';
  let email = '';
  let password = '';
  let verifyPassword = '';


  const submit = async (event: Event ) => {
    event.preventDefault();
    if (password !== verifyPassword) {
      // createErrorMessage("Passwords do not match")
      console.log('password mismatch');
      return;
    }

    const resp = await fetch('api/user/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        displayName,
        email,
        password,
        verifyPassword
      })
    });
    if (resp.ok) {
      console.log('pushing to /login');
      goto('/login');
    } else {
      console.log('error registering ' + resp?.body)
      const text = await resp.text();
      // createErrorMessage(text || "error registering, try again")
    }
  }

  const handleClear = () => {
    displayName = '';
    email = '';
    password = '';
    verifyPassword = '';
  };

</script>

<main class="flex justify-center items-center h-screen bg-gray-100">
  <form on:submit={submit} class="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
    <h2 class="text-2xl font-bold mb-6 text-center">Register</h2>
    
    <div class="mb-4">
      <label for="displayName" class="block text-sm font-medium text-gray-700">Display Name</label>
      <input type="text" id="displayName" bind:value={displayName} required class="mt-1 p-2 block w-full border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
    </div>

    <div class="mb-4">
      <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
      <input type="email" id="email" bind:value={email} required class="mt-1 p-2 block w-full border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
    </div>

    <div class="mb-4">
      <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
      <input type="password" id="password" bind:value={password} required class="mt-1 p-2 block w-full border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
    </div>

    <div class="mb-6">
      <label for="verifyPassword" class="block text-sm font-medium text-gray-700">Verify Password</label>
      <input type="password" id="verifyPassword" bind:value={verifyPassword} required class="mt-1 p-2 block w-full border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
    </div>

    <button type="submit" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">Register</button>
    
    <button type="button" on:click={handleClear} class="mt-4 w-full bg-gray-300 text-black py-2 px-4 rounded-md hover:bg-gray-400">Clear</button>

    <p class="text-center mt-4">
      Already have an account? 
      <a href="/login" class="text-indigo-600 hover:underline">Login</a>
    </p>
  </form>
</main>