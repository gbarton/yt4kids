<script type="ts">
  import { Toast } from "flowbite-svelte";
  import { blur } from "svelte/transition";
  import { ExclamationCircleOutline, UploadOutline, UserOutline } from "flowbite-svelte-icons";
  import { messages, dismissMessage } from "../Store";

</script>

{#if messages}
  <section>
  {#each $messages as message (message.id)}
    <Toast
      transition={blur}
      params={{ amount: 10 }}
      color="{message.type === 'error' ? 'red' : 'green'}"
      class="clicky shadow-md m-3"
      on:dismiss={() => dismissMessage(message.id)}>
      {#if message.type === 'error'}
        <ExclamationCircleOutline slot="icon"></ExclamationCircleOutline>
      {/if}
      {#if message.type === 'loggedIn'}
        <UserOutline slot="icon"></UserOutline>
      {/if}
      <span class="mb-1 text-sm font-semibold text-gray-900 dark:text-white">New Notification</span>
      <div class="mb-2 text-sm font-normal">{message.msg}</div>
    </Toast>
  {/each}
  </section>
{/if}

<style lang="postcss">
  section {
    pointer-events: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    display: flex;
    margin-top: 1rem;
    justify-content: center;
    flex-direction: column;
    z-index: 1000;
  }

  section :global(button) {
    pointer-events: auto;
  }

</style>