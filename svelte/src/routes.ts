import About from './routes/About.svelte'
import Home from './routes/Home.svelte'
import Admin from './routes/Admin.svelte'
import Watch from './routes/Watch.svelte'
import Register from './routes/Register.svelte'
import Login from './routes/Login.svelte'

export default {
  // Exact path
  '/': Home,
  '/login': Login,
  '/register': Register,
  '/search*': Home,
  '/about': About,
  '/admin': Admin,
  '/watch/:videoID' : Watch,

  // // Using named parameters, with last being optional
  // '/author/:first/:last?': Author,

  // // Wildcard parameter
  // '/book/*': Book,

  // // Catch-all
  // // This is optional, but if present it must be the last
  // '*': NotFound,
}