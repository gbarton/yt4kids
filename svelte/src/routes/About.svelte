<script lang="ts">
  import { secureFetch } from "../lib/SecureFetch";
  import { Button } from "flowbite-svelte";
    import { createInfoMessage } from "../lib/Store";

  let authResults = ""

  async function testAuth() {
    authResults = "testing....";
    const res = await secureFetch('api/testValid', {
      method: 'GET',
    });
    if (res.ok) {
      authResults = "WORKED";
      createInfoMessage("test worked");
    } else {
      authResults = "Failed";
    }
  }

  console.log('about page log');
</script>

<p>ABOUT</p>

<Button on:click="{testAuth}">Test Auth</Button>

Results of the auth test are: {authResults}



