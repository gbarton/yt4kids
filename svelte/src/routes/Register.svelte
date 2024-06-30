<script type="ts">
  import { push } from 'svelte-spa-router'
  import { Button, Checkbox, Label, Input } from 'flowbite-svelte';

  let displayName = '', email = '', password = ''

  const submit = async () => {
      const resp = await fetch('/api/user', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            displayName,
            email,
            password
          })
      });
      if (resp.ok) {
        push("/login");
      } else {
        console.log('error registering ' + resp?.body)
      }
  }
</script>
<div class="container">
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
        <Input type="password" id="confirm_password" placeholder="•••••••••" required />
      </div>
    </div>
    <Checkbox class="mb-6 space-x-1 rtl:space-x-reverse">
      This user is an admin.
    </Checkbox>
    <Button type="submit">Submit</Button>
  </form>
</div>