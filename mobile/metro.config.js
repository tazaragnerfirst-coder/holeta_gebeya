const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase ships both CJS and ESM builds. With package "exports" on, Metro
// bundled two copies of @firebase/app (one via firebase/app, one via
// @firebase/auth), so auth failed at startup with "Component auth has not
// been registered yet". Resolve only the firebase packages without "exports"
// (react-native/main fields) so there is a single copy; everything else
// keeps the default resolution.
config.resolver.sourceExts.push('cjs');
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isFirebase = moduleName === 'firebase' || moduleName.startsWith('firebase/') || moduleName.startsWith('@firebase/');
  const ctx = isFirebase ? { ...context, unstable_enablePackageExports: false } : context;
  return (defaultResolve || ctx.resolveRequest)(ctx, moduleName, platform);
};

module.exports = config;
