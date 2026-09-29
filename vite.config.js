import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  // Địa chỉ Spring Boot khi chạy dev. Đổi trong file .env nếu backend chạy port khác.
  const backend = env.VITE_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      // Frontend gọi "/api/..." -> Vite chuyển tiếp sang Spring Boot.
      // Nhờ vậy dev không bị lỗi CORS và không phải cấu hình CORS phía backend.
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        // Ảnh đại diện do backend lưu/phục vụ (nếu trả về đường dẫn tương đối)
        '/uploads': { target: backend, changeOrigin: true },
      },
    },
  }
})
