import { getPluginsList } from "./build/plugins";
import { include, exclude } from "./build/optimize";
import { type UserConfigExport, type ConfigEnv, loadEnv } from "vite";
import {
  root,
  alias,
  wrapperEnv,
  pathResolve,
  __APP_INFO__
} from "./build/utils";

export default ({ mode }: ConfigEnv): UserConfigExport => {
  const {
    VITE_CDN,
    VITE_PORT,
    VITE_COMPRESSION,
    VITE_PUBLIC_PATH,
    VITE_API_TARGET,
    VITE_USE_MOCK
  } = wrapperEnv(loadEnv(mode, root));

  /** 与 eladmin application.yml server.port 对齐，见 .env.development */
  const apiTarget = VITE_API_TARGET || "http://localhost:8004";
  const proxyToBackend = {
    target: apiTarget,
    changeOrigin: true
  };

  return {
    base: VITE_PUBLIC_PATH,
    root,
    resolve: {
      alias
    },
    // 服务端渲染
    server: {
      // 端口号
      port: VITE_PORT,
      host: "0.0.0.0",
      // 本地跨域代理 https://cn.vitejs.dev/config/server-options.html#server-proxy
      proxy: {
        "/api": proxyToBackend,
        "/auth": proxyToBackend,
        // 报警模块（根路径与 /api 前缀后端均支持）
        "/alarm-rule-save": proxyToBackend,
        "/alarm-rule-list": proxyToBackend,
        "/alarm-rule-delete": proxyToBackend,
        "/alarm-rule-detail": proxyToBackend,
        "/alarm-event-query": proxyToBackend,
        "/alarm-event-clear-all": proxyToBackend
      },
      // 预热文件以提前转换和缓存结果，降低启动期间的初始页面加载时长并防止转换瀑布
      warmup: {
        clientFiles: ["./index.html", "./src/{views,components}/*"]
      }
    },
    plugins: getPluginsList(VITE_CDN, VITE_COMPRESSION, VITE_USE_MOCK),
    // https://cn.vitejs.dev/config/dep-optimization-options.html#dep-optimization-options
    optimizeDeps: {
      include,
      exclude
    },
    build: {
      // https://cn.vitejs.dev/guide/build.html#browser-compatibility
      target: "es2015",
      sourcemap: false,
      // 消除打包大小超过500kb警告
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        input: {
          index: pathResolve("./index.html", import.meta.url)
        },
        // 静态资源分类打包
        output: {
          chunkFileNames: "static/js/[name]-[hash].js",
          entryFileNames: "static/js/[name]-[hash].js",
          assetFileNames: "static/[ext]/[name]-[hash].[ext]"
        }
      }
    },
    define: {
      __INTLIFY_PROD_DEVTOOLS__: false,
      __APP_INFO__: JSON.stringify(__APP_INFO__)
    }
  };
};
