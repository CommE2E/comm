// flow-typed signature: 29231f6b72f5876f5692b592dce3c754
// flow-typed version: <<STUB>>/focus-trap-react_v10.1.4/flow_v0.182.0

/**
 * This is an autogenerated libdef stub for:
 *
 *   'focus-trap-react'
 *
 * Fill this stub out by replacing all the `any` types.
 *
 * Once filled out, we encourage you to share your work with the
 * community by sending a pull request to:
 * https://github.com/flowtype/flow-typed
 */

declare module 'focus-trap-react' {
  import type { Element, Node } from 'react';

  declare type FocusTrapOptions = {
  }

  declare type FocusTrapProps = {
    +children?: Element<any>,
    +active?: boolean,
    +paused?: boolean,
    +focusTrapOptions?: FocusTrapOptions,
    +containerElements?: $ReadOnlyArray<HTMLElement>,
  };

  declare module.exports: FocusTrapProps => Node;
}
