<script lang="ts">
  import "./app.css"
  import Router, { push } from 'svelte-spa-router'
  import routes from './routes'
  import { Avatar, Navbar, Button, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Input, NavBrand, NavLi, NavUl, NavHamburger } from 'flowbite-svelte';
  import { SearchOutline } from 'flowbite-svelte-icons';
  import { loggedIn, logout, user, message } from './lib/Store';
  import Messages from './lib/components/Messages.svelte';

  console.log("APP IS ONLINE (should only see once)");

  let query = "";

  function search() {
    console.log('search requested');
    push(`/?search=${encodeURIComponent(query)}`);
  }

</script>

<Messages/>

<Navbar>
  <div class="flex md:order-2">
    <Button color="none" data-collapse-toggle="mobile-menu-3" aria-controls="mobile-menu-3" aria-expanded="false" class="md:hidden text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-2.5 me-1">
      <SearchOutline class="w-5 h-5"></SearchOutline>
    </Button>
    <div class="hidden relative md:block">
      <form method="GET" on:submit|preventDefault={search}>
        <div class="flex absolute inset-y-0 start-0 items-center ps-3 pointer-events-none">
          <SearchOutline class="w-4 h-4"></SearchOutline>
        </div>
        <Input bind:value={query} name="search" id="search" class="ps-10" placeholder="Search..."></Input>
      </form>
    </div>
    <div class="flex items-center md:order-2 ml-2">
      <Avatar id="avatar-menu" border class="{$loggedIn ? 'ring-green-400' : 'ring-red-400'}" />
      <NavHamburger class1="w-full md:flex md:w-auto md:order-1" />
    </div>
    <!-- <NavHamburger></NavHamburger> -->
  </div>
  <Dropdown placement="bottom" triggeredBy="#avatar-menu">
    {#if $loggedIn}
    <DropdownHeader>
      <span class="block text-sm">{$user.displayName}</span>
      <span class="block truncate text-sm font-medium">{$user.email}</span>
    </DropdownHeader>
      {#if $user.admin}
      <DropdownItem href="/#/admin">admin</DropdownItem>
      <DropdownDivider />
      {/if}
    <DropdownItem><Button on:click="{logout}">Sign Out</Button></DropdownItem>
    {:else}
    <DropdownItem href="/#/login">Login</DropdownItem>
    <DropdownItem href="/#/register">Register</DropdownItem>
    {/if}
  </Dropdown>
  <NavUl>
    <NavLi href="/#/">Home</NavLi>
    <NavLi href="/#/about">About</NavLi>
    <!-- <NavLi href="#/admin">Admin</NavLi> -->
  </NavUl>
</Navbar>

<Router {routes}></Router>
