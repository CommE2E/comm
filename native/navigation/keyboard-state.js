// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

export type KeyboardState = {|
  keyboardShowing: bool,
  dismissKeyboard: () => void,
  dismissKeyboardIfShowing: () => bool,
  systemKeyboardShowing: bool,
  imageGalleryOpen: bool,
  setImageGalleryOpen: (imageGalleryOpen: bool) => void,
|};

const keyboardStatePropType = PropTypes.shape({
  keyboardShowing: PropTypes.bool.isRequired,
  dismissKeyboard: PropTypes.func.isRequired,
  dismissKeyboardIfShowing: PropTypes.func.isRequired,
  systemKeyboardShowing: PropTypes.bool.isRequired,
  imageGalleryOpen: PropTypes.bool.isRequired,
  setImageGalleryOpen: PropTypes.func.isRequired,
});

const KeyboardContext = React.createContext<?KeyboardState>(null);

function withKeyboardState<
  AllProps: {},
  ComponentType: React.ComponentType<AllProps>,
>(Component: ComponentType): React.ComponentType<$Diff<
  React.ElementConfig<ComponentType>,
  { keyboardState: ?KeyboardState },
>> {
  class KeyboardStateHOC extends React.PureComponent<$Diff<
    React.ElementConfig<ComponentType>,
    { keyboardState: ?KeyboardState },
  >> {
    render() {
      return (
        <KeyboardContext.Consumer>
          {value => (
            <Component
              {...this.props}
              keyboardState={value}
            />
          )}
        </KeyboardContext.Consumer>
      );
    }
  }
  return KeyboardStateHOC;
}

export {
  keyboardStatePropType,
  KeyboardContext,
  withKeyboardState,
};
