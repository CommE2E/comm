// @flow

import PropTypes from 'prop-types';
import * as React from 'react';

export type RootContextType = {|
  detectUnsupervisedBackground?: ?(alreadyClosed: boolean) => boolean,
  setNavStateInitialized: () => void,
|};

const RootContext = React.createContext<?RootContextType>(null);

const rootContextPropType = PropTypes.shape({
  detectUnsupervisedBackground: PropTypes.func,
  setNavStateInitialized: PropTypes.func.isRequired,
});

export { RootContext, rootContextPropType };
