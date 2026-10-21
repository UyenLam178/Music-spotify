import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  // Địa chỉ máy chủ khi chạy dev. Đổi trong file .env nếu chạy port khác.
  const backend = env.VITE_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      // Các request "/api/..." được Vite chuyển tiếp sang máy chủ (tránh lỗi CORS khi dev).
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        // Ảnh / video tải lên (đường dẫn tương đối)
        '/uploads': { target: backend, changeOrigin: true },
      },
    },
  }
})
