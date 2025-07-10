module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    'transform-remove-strict-mode',
    // react-native-reanimated must be last
    [
      'react-native-reanimated/plugin',
      {
        extraPresets: ['@babel/preset-flow'],
      },
    ],
  ],
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
};
