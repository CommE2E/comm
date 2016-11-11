System.config({
  baseURL: "js",
  defaultJSExtensions: true,
  transpiler: "babel",
  babelOptions: {
    "optional": [
      "runtime",
      "optimisation.modules.system"
    ]
  },
  paths: {
    "github:*": "jspm_packages/github/*",
    "npm:*": "jspm_packages/npm/*"
  },

  meta: {
    "*.js": {
      "babelOptions": {
        "plugins": [
          "babel-plugin-transform-class-properties"
        ]
      }
    }
  },

  map: {
    "babel": "npm:babel-core@5.8.38",
    "babel-plugin-transform-class-properties": "npm:babel-plugin-transform-class-properties@6.18.0",
    "babel-polyfill": "npm:babel-polyfill@6.16.0",
    "babel-preset-latest": "npm:babel-preset-latest@6.16.0",
    "babel-preset-react": "npm:babel-preset-react@6.16.0",
    "babel-runtime": "npm:babel-runtime@5.8.38",
    "classnames": "npm:classnames@2.2.5",
    "core-js": "npm:core-js@1.2.7",
    "dateformat": "npm:dateformat@1.0.12",
    "fetch": "github:github/fetch@1.0.0",
    "immutability-helper": "npm:immutability-helper@2.0.0",
    "invariant": "npm:invariant@2.2.1",
    "jquery": "npm:jquery@3.1.1",
    "lodash": "npm:lodash@4.16.6",
    "react": "npm:react@15.3.2",
    "react-dom": "npm:react-dom@15.3.2",
    "react-redux": "npm:react-redux@4.4.5",
    "react-text-truncate": "npm:react-text-truncate@0.8.3",
    "redux": "npm:redux@3.6.0",
    "spectrum-colorpicker": "npm:spectrum-colorpicker@1.8.0",
    "timeago": "npm:timeago@1.5.3",
    "tokenize-text": "npm:tokenize-text@1.1.3",
    "url": "github:jspm/nodelibs-url@0.1.0",
    "github:jspm/nodelibs-assert@0.1.0": {
      "assert": "npm:assert@1.4.1"
    },
    "github:jspm/nodelibs-buffer@0.1.0": {
      "buffer": "npm:buffer@3.6.0"
    },
    "github:jspm/nodelibs-constants@0.1.0": {
      "constants-browserify": "npm:constants-browserify@0.0.1"
    },
    "github:jspm/nodelibs-domain@0.1.0": {
      "domain-browser": "npm:domain-browser@1.1.7"
    },
    "github:jspm/nodelibs-events@0.1.1": {
      "events": "npm:events@1.0.2"
    },
    "github:jspm/nodelibs-http@1.7.1": {
      "Base64": "npm:Base64@0.2.1",
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "stream": "github:jspm/nodelibs-stream@0.1.0",
      "url": "github:jspm/nodelibs-url@0.1.0",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "github:jspm/nodelibs-https@0.1.0": {
      "https-browserify": "npm:https-browserify@0.0.0"
    },
    "github:jspm/nodelibs-path@0.1.0": {
      "path-browserify": "npm:path-browserify@0.0.0"
    },
    "github:jspm/nodelibs-process@0.1.2": {
      "process": "npm:process@0.11.9"
    },
    "github:jspm/nodelibs-stream@0.1.0": {
      "stream-browserify": "npm:stream-browserify@1.0.0"
    },
    "github:jspm/nodelibs-string_decoder@0.1.0": {
      "string_decoder": "npm:string_decoder@0.10.31"
    },
    "github:jspm/nodelibs-url@0.1.0": {
      "url": "npm:url@0.10.3"
    },
    "github:jspm/nodelibs-util@0.1.0": {
      "util": "npm:util@0.10.3"
    },
    "github:jspm/nodelibs-vm@0.1.0": {
      "vm-browserify": "npm:vm-browserify@0.0.4"
    },
    "github:jspm/nodelibs-zlib@0.1.0": {
      "browserify-zlib": "npm:browserify-zlib@0.1.4"
    },
    "npm:asap@2.0.5": {
      "domain": "github:jspm/nodelibs-domain@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:assert@1.4.1": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "util": "npm:util@0.10.3"
    },
    "npm:babel-code-frame@6.16.0": {
      "chalk": "npm:chalk@1.1.3",
      "esutils": "npm:esutils@2.0.2",
      "js-tokens": "npm:js-tokens@2.0.0"
    },
    "npm:babel-helper-builder-binary-assignment-operator-visitor@6.18.0": {
      "babel-helper-explode-assignable-expression": "npm:babel-helper-explode-assignable-expression@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-helper-builder-react-jsx@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0",
      "esutils": "npm:esutils@2.0.2",
      "lodash": "npm:lodash@4.16.6"
    },
    "npm:babel-helper-call-delegate@6.18.0": {
      "babel-helper-hoist-variables": "npm:babel-helper-hoist-variables@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-traverse": "npm:babel-traverse@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-helper-define-map@6.18.0": {
      "babel-helper-function-name": "npm:babel-helper-function-name@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0",
      "lodash": "npm:lodash@4.16.6"
    },
    "npm:babel-helper-explode-assignable-expression@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-traverse": "npm:babel-traverse@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-helper-function-name@6.18.0": {
      "babel-helper-get-function-arity": "npm:babel-helper-get-function-arity@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-template": "npm:babel-template@6.16.0",
      "babel-traverse": "npm:babel-traverse@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-helper-get-function-arity@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-helper-hoist-variables@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-helper-optimise-call-expression@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-helper-regex@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0",
      "lodash": "npm:lodash@4.16.6"
    },
    "npm:babel-helper-remap-async-to-generator@6.18.0": {
      "babel-helper-function-name": "npm:babel-helper-function-name@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-template": "npm:babel-template@6.16.0",
      "babel-traverse": "npm:babel-traverse@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-helper-replace-supers@6.18.0": {
      "babel-helper-optimise-call-expression": "npm:babel-helper-optimise-call-expression@6.18.0",
      "babel-messages": "npm:babel-messages@6.8.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-template": "npm:babel-template@6.16.0",
      "babel-traverse": "npm:babel-traverse@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-messages@6.8.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:babel-plugin-check-es2015-constants@6.8.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-async-to-generator@6.16.0": {
      "babel-helper-remap-async-to-generator": "npm:babel-helper-remap-async-to-generator@6.18.0",
      "babel-plugin-syntax-async-functions": "npm:babel-plugin-syntax-async-functions@6.13.0",
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-class-properties@6.18.0": {
      "babel-helper-function-name": "npm:babel-helper-function-name@6.18.0",
      "babel-plugin-syntax-class-properties": "npm:babel-plugin-syntax-class-properties@6.13.0",
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-arrow-functions@6.8.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-block-scoped-functions@6.8.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-block-scoping@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-template": "npm:babel-template@6.16.0",
      "babel-traverse": "npm:babel-traverse@6.18.0",
      "babel-types": "npm:babel-types@6.18.0",
      "lodash": "npm:lodash@4.16.6"
    },
    "npm:babel-plugin-transform-es2015-classes@6.18.0": {
      "babel-helper-define-map": "npm:babel-helper-define-map@6.18.0",
      "babel-helper-function-name": "npm:babel-helper-function-name@6.18.0",
      "babel-helper-optimise-call-expression": "npm:babel-helper-optimise-call-expression@6.18.0",
      "babel-helper-replace-supers": "npm:babel-helper-replace-supers@6.18.0",
      "babel-messages": "npm:babel-messages@6.8.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-template": "npm:babel-template@6.16.0",
      "babel-traverse": "npm:babel-traverse@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-computed-properties@6.8.0": {
      "babel-helper-define-map": "npm:babel-helper-define-map@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-template": "npm:babel-template@6.16.0"
    },
    "npm:babel-plugin-transform-es2015-destructuring@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-duplicate-keys@6.8.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-for-of@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-function-name@6.9.0": {
      "babel-helper-function-name": "npm:babel-helper-function-name@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-literals@6.8.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-modules-amd@6.18.0": {
      "babel-plugin-transform-es2015-modules-commonjs": "npm:babel-plugin-transform-es2015-modules-commonjs@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-template": "npm:babel-template@6.16.0"
    },
    "npm:babel-plugin-transform-es2015-modules-commonjs@6.18.0": {
      "babel-plugin-transform-strict-mode": "npm:babel-plugin-transform-strict-mode@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-template": "npm:babel-template@6.16.0",
      "babel-types": "npm:babel-types@6.18.0",
      "path": "github:jspm/nodelibs-path@0.1.0"
    },
    "npm:babel-plugin-transform-es2015-modules-systemjs@6.18.0": {
      "babel-helper-hoist-variables": "npm:babel-helper-hoist-variables@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-template": "npm:babel-template@6.16.0"
    },
    "npm:babel-plugin-transform-es2015-modules-umd@6.18.0": {
      "babel-plugin-transform-es2015-modules-amd": "npm:babel-plugin-transform-es2015-modules-amd@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-template": "npm:babel-template@6.16.0",
      "path": "github:jspm/nodelibs-path@0.1.0"
    },
    "npm:babel-plugin-transform-es2015-object-super@6.8.0": {
      "babel-helper-replace-supers": "npm:babel-helper-replace-supers@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-parameters@6.18.0": {
      "babel-helper-call-delegate": "npm:babel-helper-call-delegate@6.18.0",
      "babel-helper-get-function-arity": "npm:babel-helper-get-function-arity@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-template": "npm:babel-template@6.16.0",
      "babel-traverse": "npm:babel-traverse@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-shorthand-properties@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-spread@6.8.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-sticky-regex@6.8.0": {
      "babel-helper-regex": "npm:babel-helper-regex@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-template-literals@6.8.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-typeof-symbol@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-es2015-unicode-regex@6.11.0": {
      "babel-helper-regex": "npm:babel-helper-regex@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "regexpu-core": "npm:regexpu-core@2.0.0"
    },
    "npm:babel-plugin-transform-exponentiation-operator@6.8.0": {
      "babel-helper-builder-binary-assignment-operator-visitor": "npm:babel-helper-builder-binary-assignment-operator-visitor@6.18.0",
      "babel-plugin-syntax-exponentiation-operator": "npm:babel-plugin-syntax-exponentiation-operator@6.13.0",
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-flow-strip-types@6.18.0": {
      "babel-plugin-syntax-flow": "npm:babel-plugin-syntax-flow@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-react-display-name@6.8.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "path": "github:jspm/nodelibs-path@0.1.0"
    },
    "npm:babel-plugin-transform-react-jsx-self@6.11.0": {
      "babel-plugin-syntax-jsx": "npm:babel-plugin-syntax-jsx@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-react-jsx-source@6.9.0": {
      "babel-plugin-syntax-jsx": "npm:babel-plugin-syntax-jsx@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-react-jsx@6.8.0": {
      "babel-helper-builder-react-jsx": "npm:babel-helper-builder-react-jsx@6.18.0",
      "babel-plugin-syntax-jsx": "npm:babel-plugin-syntax-jsx@6.18.0",
      "babel-runtime": "npm:babel-runtime@6.18.0"
    },
    "npm:babel-plugin-transform-regenerator@6.16.1": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0",
      "private": "npm:private@0.1.6",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:babel-plugin-transform-strict-mode@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0"
    },
    "npm:babel-polyfill@6.16.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "core-js": "npm:core-js@2.4.1",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "regenerator-runtime": "npm:regenerator-runtime@0.9.6"
    },
    "npm:babel-preset-es2015@6.18.0": {
      "babel-plugin-check-es2015-constants": "npm:babel-plugin-check-es2015-constants@6.8.0",
      "babel-plugin-transform-es2015-arrow-functions": "npm:babel-plugin-transform-es2015-arrow-functions@6.8.0",
      "babel-plugin-transform-es2015-block-scoped-functions": "npm:babel-plugin-transform-es2015-block-scoped-functions@6.8.0",
      "babel-plugin-transform-es2015-block-scoping": "npm:babel-plugin-transform-es2015-block-scoping@6.18.0",
      "babel-plugin-transform-es2015-classes": "npm:babel-plugin-transform-es2015-classes@6.18.0",
      "babel-plugin-transform-es2015-computed-properties": "npm:babel-plugin-transform-es2015-computed-properties@6.8.0",
      "babel-plugin-transform-es2015-destructuring": "npm:babel-plugin-transform-es2015-destructuring@6.18.0",
      "babel-plugin-transform-es2015-duplicate-keys": "npm:babel-plugin-transform-es2015-duplicate-keys@6.8.0",
      "babel-plugin-transform-es2015-for-of": "npm:babel-plugin-transform-es2015-for-of@6.18.0",
      "babel-plugin-transform-es2015-function-name": "npm:babel-plugin-transform-es2015-function-name@6.9.0",
      "babel-plugin-transform-es2015-literals": "npm:babel-plugin-transform-es2015-literals@6.8.0",
      "babel-plugin-transform-es2015-modules-amd": "npm:babel-plugin-transform-es2015-modules-amd@6.18.0",
      "babel-plugin-transform-es2015-modules-commonjs": "npm:babel-plugin-transform-es2015-modules-commonjs@6.18.0",
      "babel-plugin-transform-es2015-modules-systemjs": "npm:babel-plugin-transform-es2015-modules-systemjs@6.18.0",
      "babel-plugin-transform-es2015-modules-umd": "npm:babel-plugin-transform-es2015-modules-umd@6.18.0",
      "babel-plugin-transform-es2015-object-super": "npm:babel-plugin-transform-es2015-object-super@6.8.0",
      "babel-plugin-transform-es2015-parameters": "npm:babel-plugin-transform-es2015-parameters@6.18.0",
      "babel-plugin-transform-es2015-shorthand-properties": "npm:babel-plugin-transform-es2015-shorthand-properties@6.18.0",
      "babel-plugin-transform-es2015-spread": "npm:babel-plugin-transform-es2015-spread@6.8.0",
      "babel-plugin-transform-es2015-sticky-regex": "npm:babel-plugin-transform-es2015-sticky-regex@6.8.0",
      "babel-plugin-transform-es2015-template-literals": "npm:babel-plugin-transform-es2015-template-literals@6.8.0",
      "babel-plugin-transform-es2015-typeof-symbol": "npm:babel-plugin-transform-es2015-typeof-symbol@6.18.0",
      "babel-plugin-transform-es2015-unicode-regex": "npm:babel-plugin-transform-es2015-unicode-regex@6.11.0",
      "babel-plugin-transform-regenerator": "npm:babel-plugin-transform-regenerator@6.16.1"
    },
    "npm:babel-preset-es2016@6.16.0": {
      "babel-plugin-transform-exponentiation-operator": "npm:babel-plugin-transform-exponentiation-operator@6.8.0"
    },
    "npm:babel-preset-es2017@6.16.0": {
      "babel-plugin-syntax-trailing-function-commas": "npm:babel-plugin-syntax-trailing-function-commas@6.13.0",
      "babel-plugin-transform-async-to-generator": "npm:babel-plugin-transform-async-to-generator@6.16.0"
    },
    "npm:babel-preset-latest@6.16.0": {
      "babel-preset-es2015": "npm:babel-preset-es2015@6.18.0",
      "babel-preset-es2016": "npm:babel-preset-es2016@6.16.0",
      "babel-preset-es2017": "npm:babel-preset-es2017@6.16.0"
    },
    "npm:babel-preset-react@6.16.0": {
      "babel-plugin-syntax-flow": "npm:babel-plugin-syntax-flow@6.18.0",
      "babel-plugin-syntax-jsx": "npm:babel-plugin-syntax-jsx@6.18.0",
      "babel-plugin-transform-flow-strip-types": "npm:babel-plugin-transform-flow-strip-types@6.18.0",
      "babel-plugin-transform-react-display-name": "npm:babel-plugin-transform-react-display-name@6.8.0",
      "babel-plugin-transform-react-jsx": "npm:babel-plugin-transform-react-jsx@6.8.0",
      "babel-plugin-transform-react-jsx-self": "npm:babel-plugin-transform-react-jsx-self@6.11.0",
      "babel-plugin-transform-react-jsx-source": "npm:babel-plugin-transform-react-jsx-source@6.9.0"
    },
    "npm:babel-runtime@5.8.38": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:babel-runtime@6.18.0": {
      "core-js": "npm:core-js@2.4.1",
      "regenerator-runtime": "npm:regenerator-runtime@0.9.6"
    },
    "npm:babel-template@6.16.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-traverse": "npm:babel-traverse@6.18.0",
      "babel-types": "npm:babel-types@6.18.0",
      "babylon": "npm:babylon@6.13.1",
      "lodash": "npm:lodash@4.16.6"
    },
    "npm:babel-traverse@6.18.0": {
      "babel-code-frame": "npm:babel-code-frame@6.16.0",
      "babel-messages": "npm:babel-messages@6.8.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0",
      "babylon": "npm:babylon@6.13.1",
      "debug": "npm:debug@2.2.0",
      "globals": "npm:globals@9.12.0",
      "invariant": "npm:invariant@2.2.1",
      "lodash": "npm:lodash@4.16.6",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:babel-types@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "esutils": "npm:esutils@2.0.2",
      "lodash": "npm:lodash@4.16.6",
      "to-fast-properties": "npm:to-fast-properties@1.0.2"
    },
    "npm:babylon@6.13.1": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:browserify-zlib@0.1.4": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "pako": "npm:pako@0.2.9",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "readable-stream": "npm:readable-stream@2.2.1",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:buffer-shims@1.0.0": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0"
    },
    "npm:buffer@3.6.0": {
      "base64-js": "npm:base64-js@0.0.8",
      "child_process": "github:jspm/nodelibs-child_process@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "ieee754": "npm:ieee754@1.1.8",
      "isarray": "npm:isarray@1.0.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:builtin-modules@1.1.1": {
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:camelcase-keys@2.1.0": {
      "camelcase": "npm:camelcase@2.1.1",
      "map-obj": "npm:map-obj@1.0.1"
    },
    "npm:chalk@1.1.3": {
      "ansi-styles": "npm:ansi-styles@2.2.1",
      "escape-string-regexp": "npm:escape-string-regexp@1.0.5",
      "has-ansi": "npm:has-ansi@2.0.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "strip-ansi": "npm:strip-ansi@3.0.1",
      "supports-color": "npm:supports-color@2.0.0"
    },
    "npm:constants-browserify@0.0.1": {
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:core-js@1.2.7": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:core-js@2.4.1": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:core-util-is@1.0.2": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0"
    },
    "npm:currently-unhandled@0.4.1": {
      "array-find-index": "npm:array-find-index@1.0.2",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:dateformat@1.0.12": {
      "get-stdin": "npm:get-stdin@4.0.1",
      "meow": "npm:meow@3.7.0"
    },
    "npm:debug@2.2.0": {
      "ms": "npm:ms@0.7.1"
    },
    "npm:domain-browser@1.1.7": {
      "events": "github:jspm/nodelibs-events@0.1.1",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:encoding@0.1.12": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "iconv-lite": "npm:iconv-lite@0.4.13"
    },
    "npm:error-ex@1.3.0": {
      "is-arrayish": "npm:is-arrayish@0.2.1",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:fbjs@0.8.5": {
      "core-js": "npm:core-js@1.2.7",
      "immutable": "npm:immutable@3.8.1",
      "isomorphic-fetch": "npm:isomorphic-fetch@2.2.1",
      "loose-envify": "npm:loose-envify@1.3.0",
      "object-assign": "npm:object-assign@4.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "promise": "npm:promise@7.1.1",
      "ua-parser-js": "npm:ua-parser-js@0.7.11"
    },
    "npm:find-up@1.1.2": {
      "path": "github:jspm/nodelibs-path@0.1.0",
      "path-exists": "npm:path-exists@2.1.0",
      "pinkie-promise": "npm:pinkie-promise@2.0.1"
    },
    "npm:get-stdin@4.0.1": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:globals@9.12.0": {
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:graceful-fs@4.1.10": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "constants": "github:jspm/nodelibs-constants@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "stream": "github:jspm/nodelibs-stream@0.1.0",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:has-ansi@2.0.0": {
      "ansi-regex": "npm:ansi-regex@2.0.0"
    },
    "npm:hosted-git-info@2.1.5": {
      "url": "github:jspm/nodelibs-url@0.1.0"
    },
    "npm:https-browserify@0.0.0": {
      "http": "github:jspm/nodelibs-http@1.7.1"
    },
    "npm:iconv-lite@0.4.13": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "stream": "github:jspm/nodelibs-stream@0.1.0",
      "string_decoder": "github:jspm/nodelibs-string_decoder@0.1.0",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:immutability-helper@2.0.0": {
      "invariant": "npm:invariant@2.2.1"
    },
    "npm:immutable@3.8.1": {
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:indent-string@2.1.0": {
      "repeating": "npm:repeating@2.0.1"
    },
    "npm:inherits@2.0.1": {
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:invariant@2.2.1": {
      "loose-envify": "npm:loose-envify@1.3.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:is-builtin-module@1.0.0": {
      "builtin-modules": "npm:builtin-modules@1.1.1"
    },
    "npm:is-finite@1.0.2": {
      "number-is-nan": "npm:number-is-nan@1.0.1"
    },
    "npm:isarray@1.0.0": {
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:isomorphic-fetch@2.2.1": {
      "node-fetch": "npm:node-fetch@1.6.3",
      "whatwg-fetch": "npm:whatwg-fetch@1.0.0"
    },
    "npm:load-json-file@1.1.0": {
      "graceful-fs": "npm:graceful-fs@4.1.10",
      "parse-json": "npm:parse-json@2.2.0",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "pify": "npm:pify@2.3.0",
      "pinkie-promise": "npm:pinkie-promise@2.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "strip-bom": "npm:strip-bom@2.0.0"
    },
    "npm:lodash@3.10.1": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:loose-envify@1.3.0": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "js-tokens": "npm:js-tokens@2.0.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "stream": "github:jspm/nodelibs-stream@0.1.0",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:loud-rejection@1.6.0": {
      "currently-unhandled": "npm:currently-unhandled@0.4.1",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "signal-exit": "npm:signal-exit@3.0.1",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:meow@3.7.0": {
      "camelcase-keys": "npm:camelcase-keys@2.1.0",
      "decamelize": "npm:decamelize@1.2.0",
      "loud-rejection": "npm:loud-rejection@1.6.0",
      "map-obj": "npm:map-obj@1.0.1",
      "minimist": "npm:minimist@1.2.0",
      "normalize-package-data": "npm:normalize-package-data@2.3.5",
      "object-assign": "npm:object-assign@4.1.0",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "read-pkg-up": "npm:read-pkg-up@1.0.1",
      "redent": "npm:redent@1.0.0",
      "trim-newlines": "npm:trim-newlines@1.0.0"
    },
    "npm:node-fetch@1.6.3": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "encoding": "npm:encoding@0.1.12",
      "http": "github:jspm/nodelibs-http@1.7.1",
      "https": "github:jspm/nodelibs-https@0.1.0",
      "is-stream": "npm:is-stream@1.1.0",
      "stream": "github:jspm/nodelibs-stream@0.1.0",
      "url": "github:jspm/nodelibs-url@0.1.0",
      "util": "github:jspm/nodelibs-util@0.1.0",
      "zlib": "github:jspm/nodelibs-zlib@0.1.0"
    },
    "npm:normalize-package-data@2.3.5": {
      "hosted-git-info": "npm:hosted-git-info@2.1.5",
      "is-builtin-module": "npm:is-builtin-module@1.0.0",
      "semver": "npm:semver@5.3.0",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2",
      "url": "github:jspm/nodelibs-url@0.1.0",
      "util": "github:jspm/nodelibs-util@0.1.0",
      "validate-npm-package-license": "npm:validate-npm-package-license@3.0.1"
    },
    "npm:pako@0.2.9": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:parse-json@2.2.0": {
      "error-ex": "npm:error-ex@1.3.0"
    },
    "npm:path-browserify@0.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:path-exists@2.1.0": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "pinkie-promise": "npm:pinkie-promise@2.0.1"
    },
    "npm:path-type@1.1.0": {
      "graceful-fs": "npm:graceful-fs@4.1.10",
      "pify": "npm:pify@2.3.0",
      "pinkie-promise": "npm:pinkie-promise@2.0.1"
    },
    "npm:pify@2.3.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:pinkie-promise@2.0.1": {
      "pinkie": "npm:pinkie@2.0.4"
    },
    "npm:process-nextick-args@1.0.7": {
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:process@0.11.9": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "vm": "github:jspm/nodelibs-vm@0.1.0"
    },
    "npm:promise@7.1.1": {
      "asap": "npm:asap@2.0.5",
      "fs": "github:jspm/nodelibs-fs@0.1.2"
    },
    "npm:punycode@1.3.2": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:react-dom@15.3.2": {
      "react": "npm:react@15.3.2"
    },
    "npm:react-redux@4.4.5": {
      "hoist-non-react-statics": "npm:hoist-non-react-statics@1.2.0",
      "invariant": "npm:invariant@2.2.1",
      "lodash": "npm:lodash@4.16.6",
      "loose-envify": "npm:loose-envify@1.3.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "react": "npm:react@15.3.2",
      "redux": "npm:redux@3.6.0"
    },
    "npm:react-text-truncate@0.8.3": {
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "react": "npm:react@15.3.2",
      "react-dom": "npm:react-dom@15.3.2"
    },
    "npm:react@15.3.2": {
      "fbjs": "npm:fbjs@0.8.5",
      "loose-envify": "npm:loose-envify@1.3.0",
      "object-assign": "npm:object-assign@4.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:read-pkg-up@1.0.1": {
      "find-up": "npm:find-up@1.1.2",
      "read-pkg": "npm:read-pkg@1.1.0"
    },
    "npm:read-pkg@1.1.0": {
      "load-json-file": "npm:load-json-file@1.1.0",
      "normalize-package-data": "npm:normalize-package-data@2.3.5",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "path-type": "npm:path-type@1.1.0"
    },
    "npm:readable-stream@1.1.14": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "core-util-is": "npm:core-util-is@1.0.2",
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "isarray": "npm:isarray@0.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "stream-browserify": "npm:stream-browserify@1.0.0",
      "string_decoder": "npm:string_decoder@0.10.31"
    },
    "npm:readable-stream@2.2.1": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "buffer-shims": "npm:buffer-shims@1.0.0",
      "core-util-is": "npm:core-util-is@1.0.2",
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "isarray": "npm:isarray@1.0.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "process-nextick-args": "npm:process-nextick-args@1.0.7",
      "string_decoder": "npm:string_decoder@0.10.31",
      "util-deprecate": "npm:util-deprecate@1.0.2"
    },
    "npm:redent@1.0.0": {
      "indent-string": "npm:indent-string@2.1.0",
      "strip-indent": "npm:strip-indent@1.0.1"
    },
    "npm:redux@3.6.0": {
      "lodash": "npm:lodash@4.16.6",
      "lodash-es": "npm:lodash-es@4.16.6",
      "loose-envify": "npm:loose-envify@1.3.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "symbol-observable": "npm:symbol-observable@1.0.4"
    },
    "npm:regenerator-runtime@0.9.6": {
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:regexpu-core@2.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2",
      "regenerate": "npm:regenerate@1.3.1",
      "regjsgen": "npm:regjsgen@0.2.0",
      "regjsparser": "npm:regjsparser@0.1.5",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:regjsparser@0.1.5": {
      "jsesc": "npm:jsesc@0.5.0"
    },
    "npm:repeating@2.0.1": {
      "is-finite": "npm:is-finite@1.0.2"
    },
    "npm:semver@5.3.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:signal-exit@3.0.1": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "events": "github:jspm/nodelibs-events@0.1.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:spdx-correct@1.0.2": {
      "spdx-license-ids": "npm:spdx-license-ids@1.2.2"
    },
    "npm:spdx-expression-parse@1.0.4": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:spdx-license-ids@1.2.2": {
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:spectrum-colorpicker@1.8.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:stream-browserify@1.0.0": {
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "readable-stream": "npm:readable-stream@1.1.14"
    },
    "npm:string_decoder@0.10.31": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0"
    },
    "npm:strip-ansi@3.0.1": {
      "ansi-regex": "npm:ansi-regex@2.0.0"
    },
    "npm:strip-bom@2.0.0": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "is-utf8": "npm:is-utf8@0.2.1"
    },
    "npm:strip-indent@1.0.1": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "get-stdin": "npm:get-stdin@4.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:supports-color@2.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:timeago@1.5.3": {
      "jquery": "npm:jquery@3.1.1"
    },
    "npm:tokenize-text@1.1.3": {
      "lodash": "npm:lodash@3.10.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:ua-parser-js@0.7.11": {
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:url@0.10.3": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "punycode": "npm:punycode@1.3.2",
      "querystring": "npm:querystring@0.2.0",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:util-deprecate@1.0.2": {
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:util@0.10.3": {
      "inherits": "npm:inherits@2.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:validate-npm-package-license@3.0.1": {
      "spdx-correct": "npm:spdx-correct@1.0.2",
      "spdx-expression-parse": "npm:spdx-expression-parse@1.0.4"
    },
    "npm:vm-browserify@0.0.4": {
      "indexof": "npm:indexof@0.0.1"
    }
  }
});
