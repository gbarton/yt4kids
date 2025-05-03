<script lang="ts">
    import { admin, loggedIn, userState } from '$lib/ClientStore.svelte';
	import '../app.css';
	
	let { children } = $props();
</script>

<nav class="bg-gray-800 text-white p-4 flex justify-between items-center">
	<div class="flex space-x-4 items-center">
		<a href="/" class="text-lg font-bold">Home</a>
		<a href="/login" class="text-sm">Login</a>
		<a href="/register" class="text-sm">Register</a>
		{#if admin()}
			<a href="/manage" class="text-sm">Manage</a>
		{/if}
		
	</div>
	<div class="flex items-center">
		<input type="text" placeholder="Search..." class="p-2 rounded border-none bg-gray-700 text-white mr-4"/>
		{#if loggedIn()}
		<span>Welcome {userState.displayName} </span>
		<button class="p-2 ml-1 rounded border-none bg-gray-700 text-white hover:bg-gray-600" aria-label="User Profile">
			<i class="fas fa-user"></i>
		</button>
		{/if}
	</div>
</nav>

{@render children()}

<!-- <style>
  @import 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css';
</style> -->