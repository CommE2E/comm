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

  map: {
    "babel": "npm:babel-core@5.8.38",
    "babel-polyfill": "npm:babel-polyfill@6.16.0",
    "babel-preset-latest": "npm:babel-preset-latest@6.16.0",
    "babel-preset-react": "npm:babel-preset-react@6.16.0",
    "babel-runtime": "npm:babel-runtime@5.8.38",
    "core-js": "npm:core-js@1.2.7",
    "jquery": "npm:jquery@3.1.1",
    "jquery-dateformat": "npm:jquery-dateformat@1.0.3",
    "spectrum-colorpicker": "npm:spectrum-colorpicker@1.8.0",
    "timeago": "npm:timeago@1.5.3",
    "github:jspm/nodelibs-assert@0.1.0": {
      "assert": "npm:assert@1.4.1"
    },
    "github:jspm/nodelibs-buffer@0.1.0": {
      "buffer": "npm:buffer@3.6.0"
    },
    "github:jspm/nodelibs-events@0.1.1": {
      "events": "npm:events@1.0.2"
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
    "github:jspm/nodelibs-util@0.1.0": {
      "util": "npm:util@0.10.3"
    },
    "github:jspm/nodelibs-vm@0.1.0": {
      "vm-browserify": "npm:vm-browserify@0.0.4"
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
      "lodash": "npm:lodash@4.16.4"
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
      "lodash": "npm:lodash@4.16.4"
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
      "lodash": "npm:lodash@4.16.4"
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
      "lodash": "npm:lodash@4.16.4"
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
      "regenerator-runtime": "npm:regenerator-runtime@0.9.5"
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
      "regenerator-runtime": "npm:regenerator-runtime@0.9.5"
    },
    "npm:babel-template@6.16.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-traverse": "npm:babel-traverse@6.18.0",
      "babel-types": "npm:babel-types@6.18.0",
      "babylon": "npm:babylon@6.13.0",
      "lodash": "npm:lodash@4.16.4"
    },
    "npm:babel-traverse@6.18.0": {
      "babel-code-frame": "npm:babel-code-frame@6.16.0",
      "babel-messages": "npm:babel-messages@6.8.0",
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "babel-types": "npm:babel-types@6.18.0",
      "babylon": "npm:babylon@6.13.0",
      "debug": "npm:debug@2.2.0",
      "globals": "npm:globals@9.12.0",
      "invariant": "npm:invariant@2.2.1",
      "lodash": "npm:lodash@4.16.4",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:babel-types@6.18.0": {
      "babel-runtime": "npm:babel-runtime@6.18.0",
      "esutils": "npm:esutils@2.0.2",
      "lodash": "npm:lodash@4.16.4",
      "to-fast-properties": "npm:to-fast-properties@1.0.2"
    },
    "npm:babylon@6.13.0": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:buffer@3.6.0": {
      "base64-js": "npm:base64-js@0.0.8",
      "child_process": "github:jspm/nodelibs-child_process@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "ieee754": "npm:ieee754@1.1.8",
      "isarray": "npm:isarray@1.0.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:chalk@1.1.3": {
      "ansi-styles": "npm:ansi-styles@2.2.1",
      "escape-string-regexp": "npm:escape-string-regexp@1.0.5",
      "has-ansi": "npm:has-ansi@2.0.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "strip-ansi": "npm:strip-ansi@3.0.1",
      "supports-color": "npm:supports-color@2.0.0"
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
    "npm:debug@2.2.0": {
      "ms": "npm:ms@0.7.1"
    },
    "npm:globals@9.12.0": {
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:has-ansi@2.0.0": {
      "ansi-regex": "npm:ansi-regex@2.0.0"
    },
    "npm:inherits@2.0.1": {
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:invariant@2.2.1": {
      "loose-envify": "npm:loose-envify@1.2.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:loose-envify@1.2.0": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "js-tokens": "npm:js-tokens@1.0.3",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "stream": "github:jspm/nodelibs-stream@0.1.0",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:path-browserify@0.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:process@0.11.9": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "vm": "github:jspm/nodelibs-vm@0.1.0"
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
    "npm:regenerator-runtime@0.9.5": {
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
    "npm:supports-color@2.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:timeago@1.5.3": {
      "jquery": "npm:jquery@3.1.1"
    },
    "npm:util@0.10.3": {
      "inherits": "npm:inherits@2.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:vm-browserify@0.0.4": {
      "indexof": "npm:indexof@0.0.1"
    }
  }
});
