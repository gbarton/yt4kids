<script type="ts">
  import { push } from 'svelte-spa-router'
  import { Button, Checkbox, Label, Input } from 'flowbite-svelte';
  import { createErrorMessage } from '../lib/Store';

  let displayName = '', email = '', password = '', verifyPassword = ''

  const submit = async () => {
    if (password !== verifyPassword) {
      createErrorMessage("Passwords do not match")
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
      push("/login");
    } else {
      console.log('error registering ' + resp?.body)
      const text = await resp.text();
      createErrorMessage(text || "error registering, try again")
    }
  }
</script>

<div class="flex justify-center items-center min-h-screen">
  <form on:submit|preventDefault={submit} class="p-8 bg-white shadow-lg rounded-md w-full max-w-md">
    <h1 class="text-2xl font-bold mb-6">Register</h1>

    <Label for="displayName" class="block text-sm font-medium text-gray-700">
      Display Name
    </Label>
    <Input id="displayName" type="text" bind:value={displayName} required class="mt-1 block w-full p-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />

    <Label for="email" class="block text-sm font-medium text-gray-700">
      Email
    </Label>
    <Input id="email" type="email" bind:value={email} required class="mt-1 block w-full p-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />

    <Label for="password" class="block text-sm font-medium text-gray-700">
      Password
    </Label>
    <Input id="password" type="password" bind:value={password} required class="mt-1 block w-full p-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />

    <Label for="verifyPassword" class="block text-sm font-medium text-gray-700">
      Verify Password
    </Label>
    <Input id="verifyPassword" type="password" bind:value={verifyPassword} required class="mt-1 block w-full p-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />

    <Button type="submit" class="w-full mt-6 bg-primary-600 hover:bg-primary-700 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">
      Register
    </Button>
  </form>
</div>
<!-- <div class="container">
  <form on:submit|preventDefault={submit}>
    <h1 class="h3 mb-3 fw-normal">Please register</h1>
    <div class="grid gap-6 mb-6 md:grid-cols-2">
      <div>
        <Label for="displayName" class="mb-2">Last name</Label>
        <Input bind:value={displayName} type="text" id="displayName" placeholder="displayname..." required />
      </div>
      <div class="mb-6">
        <Label for="email" class="mb-2">Email address</Label>
        <Input bind:value={email} type="email" id="email" placeholder="john.doe@company.com" required />
      </div>
      <div class="mb-6">
        <Label for="password" class="mb-2">Password</Label>
        <Input bind:value={password} type="password" id="password" placeholder="•••••••••" required />
      </div>
      <div class="mb-6">
        <Label for="confirm_password" class="mb-2">Confirm password</Label>
        <Input bind:value={verifyPassword} type="password" id="confirm_password" placeholder="•••••••••" required />
      </div>
    </div>
    <Checkbox class="mb-6 space-x-1 rtl:space-x-reverse">
      This user is an admin.
    </Checkbox>
    <Button type="submit">Submit</Button>
  </form>
</div> -->