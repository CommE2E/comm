module.exports = {
  presets: [
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-flow',
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-transform-private-methods',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    'babel-plugin-syntax-hermes-parser',
    ['@babel/plugin-transform-runtime', { useESModules: true }],
  ],
};
