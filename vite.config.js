import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        demo: new URL('./demo-view.html', import.meta.url).pathname,
      },
    },
  },
})
