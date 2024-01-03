module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    'transform-remove-strict-mode',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    // react-native-reanimated must be last
    'react-native-reanimated/plugin',
  ],
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
};
