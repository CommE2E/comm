module.exports = {
  presets: ['@babel/preset-react', '@babel/preset-flow'],
  plugins: [
    '@babel/plugin-transform-flow-strip-types',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    'babel-plugin-syntax-hermes-parser',
    ['@babel/plugin-transform-runtime', { useESModules: true }],
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
          },
        ],
      ],
    },
  },
  babelrcRoots: ['.', 'keyserver', 'web', 'native', 'desktop', 'landing'],
};
