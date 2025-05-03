export const prerender = true;
// dont want server side stuffs at all
export const ssr = false;
// might need this
// export const trailingSlash = 'always';

// import { type App } from '@backend';
// import { treaty } from '@elysiajs/eden';

// import { env } from '$env/dynamic/public';

// console.log(`URLENDPOINT ${env.PUBLIC_API_URL}`);

// //@ts-expect-error eden is being wierd
// const client = treaty<App>(env.PUBLIC_API_URL);
// console.log(await client.api.get());