import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    build: {
        rollupOptions: {
            // Externalize native modules that can't be bundled
            external: [
                'better-sqlite3',
            ],
        },
    },
    // Ensure native modules are resolved correctly
    resolve: {
        // Treat .node files as external
        conditions: ['node'],
    },
});

