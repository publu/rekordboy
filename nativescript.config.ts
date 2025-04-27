import { NativeScriptConfig } from "@nativescript/core";
import webpack from "@nativescript/webpack";

export default {
  id: "com.pengu.recordboy.app",
  appPath: "app",
  appResourcesPath: "../../tools/assets/App_Resources",
  android: {
    v8Flags: "--expose_gc",
    markingMode: "none"
  },
  webpackConfig: (env) => {
    // Initialize default NativeScript Webpack config
    webpack.init(env);

    // Chain additional Webpack tweaks
    webpack.chainWebpack((config) => {
      // Cast to 'any' to bypass TS checks on fallback
      (config.resolve as any).fallback = {
        ...((config.resolve as any).fallback || {}),
        zlib: (require as any).resolve("browserify-zlib"),
        stream: (require as any).resolve("stream-browserify"),
        './zlib_bindings': false, // Ignore zlib_bindings
      };
    });

    // Return the final config
    return webpack.resolveConfig();
  },
} as NativeScriptConfig;
