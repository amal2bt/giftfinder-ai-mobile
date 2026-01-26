// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Fix for axios in React Native - exclude Node.js polyfills that cause issues
config.resolver = {
  ...config.resolver,
  // Block Node.js HTTP modules that don't work in React Native
  blockList: [
    /node_modules\/.*\/follow-redirects\/.*/,
    /node_modules\/.*\/http\.js$/,
    /node_modules\/.*\/https\.js$/,
  ],
  // Resolve Node.js modules to empty or React Native compatible alternatives
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    'http': false,
    'https': false,
    'stream': false,
    'url': false,
    'util': false,
    'zlib': false,
    'buffer': false,
    'events': false,
  },
};

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
