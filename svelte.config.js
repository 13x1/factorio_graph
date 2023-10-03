import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.argv.includes('dev');

// noinspection JSValidateTypes
/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: [
        vitePreprocess(),
        preprocess({
            postcss: true,
            sass: false // no clue why, but sass doesn't work otherwise
        })
    ],

    kit: {
        adapter: adapter(),
        env: {
            privatePrefix: 'PRIVATE_',
            publicPrefix: 'PUBLIC_'
        },
        paths: {
            base: dev ? '' : process.env.BASE_PATH,
        }
    }
};

export default config;
