<script>
  import "./app.css"
  import Router from 'svelte-spa-router'
  import routes from './routes'
  import { Navbar,Button, Input, NavBrand, NavLi, NavUl, NavHamburger } from 'flowbite-svelte';
  import { SearchOutline } from 'flowbite-svelte-icons';
</script>
  

<Navbar>
  <div class="flex md:order-2">
    <Button color="none" data-collapse-toggle="mobile-menu-3" aria-controls="mobile-menu-3" aria-expanded="false" class="md:hidden text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-2.5 me-1">
      <SearchOutline class="w-5 h-5"></SearchOutline>
    </Button>
    <div class="hidden relative md:block">
      <form method="GET" action="/">
        <div class="flex absolute inset-y-0 start-0 items-center ps-3 pointer-events-none">
          <SearchOutline class="w-4 h-4"></SearchOutline>
        </div>
        <Input name="search" id="search" class="ps-10" placeholder="Search..."></Input>
      </form>
    </div>
    <NavHamburger></NavHamburger>
  </div>

  <NavUl>
    <NavLi href="#/">Home</NavLi>
    <NavLi href="#/about">About</NavLi>
    <!-- <NavLi href="#/admin">Admin</NavLi> -->
  </NavUl>
</Navbar>

<Router {routes}></Router>
