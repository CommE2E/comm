// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

import {
  scrollBlockingChatModalsClosedSelector,
  overlayTransitioningSelector,
} from './nav-selectors';
import { ScrollViewModalContext } from './scroll-view-modal-state';
import { connectNav, type NavContextType } from './navigation-context';

type Props = {|
  children: React.Node,
  // Redux state
  scrollBlockingModalsClosed: boolean,
  scrollBlockingModalsGone: boolean,
|};
type State = {|
  scrollDisabled: boolean,
|};
class ScrollViewModalStateContainer extends React.PureComponent<Props, State> {
  static propTypes = {
    children: PropTypes.node.isRequired,
    scrollBlockingModalsClosed: PropTypes.bool.isRequired,
    scrollBlockingModalsGone: PropTypes.bool.isRequired,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      scrollDisabled: !props.scrollBlockingModalsClosed,
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.state.scrollDisabled &&
      this.props.scrollBlockingModalsGone &&
      !prevProps.scrollBlockingModalsGone
    ) {
      this.setScrollDisabled(false);
    } else if (
      !this.state.scrollDisabled &&
      !this.props.scrollBlockingModalsClosed &&
      prevProps.scrollBlockingModalsClosed
    ) {
      this.setScrollDisabled(true);
    }
  }

  setScrollDisabled = (scrollDisabled: boolean) => {
    this.setState({ scrollDisabled });
  };

  render() {
    const scrollViewModalState = {
      scrollDisabled: this.state.scrollDisabled,
      setScrollDisabled: this.setScrollDisabled,
    };
    return (
      <ScrollViewModalContext.Provider value={scrollViewModalState}>
        {this.props.children}
      </ScrollViewModalContext.Provider>
    );
  }
}

export default connectNav((context: ?NavContextType) => {
  const scrollBlockingModalsClosed = scrollBlockingChatModalsClosedSelector(
    context,
  );
  return {
    scrollBlockingModalsClosed,
    scrollBlockingModalsGone:
      scrollBlockingModalsClosed && !overlayTransitioningSelector(context),
  };
})(ScrollViewModalStateContainer);
