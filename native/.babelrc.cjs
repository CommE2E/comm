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
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
};
