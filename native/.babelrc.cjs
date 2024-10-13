module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    'transform-remove-strict-mode',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    ['@babel/plugin-transform-private-methods', { loose: true }],
    '@babel/plugin-transform-numeric-separator',
    'babel-plugin-transform-bigint',
    // react-native-reanimated must be last
    'react-native-reanimated/plugin',
  ],
  test: [
    '.',
    '../',
    '../node_modules/react-native',
    '../node_modules/@react-native/polyfills',
    '../node_modules/ethers',
    '../node_modules/viem',
    '../node_modules/@ensdomains/ensjs',
    '../node_modules/@ensdomains/address-encoder',
    '../node_modules/@ensdomains/content-hash/node_modules/@ensdomains/address-encoder',
  ],
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
};
