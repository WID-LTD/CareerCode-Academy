import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(process.cwd(), './src'),
            '@shared': path.resolve(process.cwd(), '../shared'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-framer': ['framer-motion'],
                    'vendor-editor': ['@monaco-editor/react'],
                    'vendor-charts': ['recharts'],
                    'vendor-icons': ['lucide-react'],
                    'vendor-forms': ['react-hook-form', '@hookform/resolvers'],
                    'vendor-radix': [
                        '@radix-ui/react-dialog',
                        '@radix-ui/react-dropdown-menu',
                        '@radix-ui/react-tabs',
                        '@radix-ui/react-toast',
                        '@radix-ui/react-tooltip',
                    ],
                },
            },
        },
        sourcemap: false,
        minify: 'esbuild',
        target: 'es2020',
    },
    server: {
        https: fs.existsSync(path.resolve(process.cwd(), 'cert/key.pem')) ? {
            key: fs.readFileSync(path.resolve(process.cwd(), 'cert/key.pem')),
            cert: fs.readFileSync(path.resolve(process.cwd(), 'cert/cert.pem')),
        } : undefined,
        port: 3000,
        host: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://127.0.0.1:5000',
                ws: true,
                changeOrigin: true,
            },
        },
    },
});
