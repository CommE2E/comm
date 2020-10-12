// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

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
