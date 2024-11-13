module.exports = {
  presets: [
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-flow'
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-transform-private-methods',
    '@babel/plugin-proposal-nullish-coalescing-operator',
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
      plugins: [
        // Replace the import.meta object in the Jest testing environment.
        // This allows Jest to understand import.meta.url in rust-node-addon.
        [
          'babel-plugin-transform-import-meta',
          {
            replaceWith: '({ url: __filename })',
          },
        ],
      ],
    },
  },
};
