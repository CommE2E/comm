module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { electron: 22 }, modules: 'commonjs' }],
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-transform-runtime',
  ],
};
