// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

import {
  scrollBlockingChatModalsClosedSelector,
  overlayModalClosingSelector,
} from './nav-selectors';
import {
  ScrollViewModalContext,
  type ScrollViewModalStatus,
} from './scroll-view-modal-state';
import { connectNav, type NavContextType } from './navigation-context';

type Props = {|
  children: React.Node,
  // Redux state
  scrollBlockingModalsClosed: boolean,
  scrollBlockingModalsGone: boolean,
|};
type State = {|
  modalState: ScrollViewModalStatus,
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
      modalState: props.scrollBlockingModalsClosed ? 'closed' : 'open',
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.state.modalState !== 'closed' &&
      this.props.scrollBlockingModalsGone &&
      !prevProps.scrollBlockingModalsGone
    ) {
      this.setModalState('closed');
    } else if (
      this.state.modalState !== 'open' &&
      !this.props.scrollBlockingModalsClosed &&
      prevProps.scrollBlockingModalsClosed
    ) {
      this.setModalState('open');
    } else if (
      this.state.modalState === 'open' &&
      this.props.scrollBlockingModalsClosed &&
      !prevProps.scrollBlockingModalsClosed
    ) {
      this.setModalState('closing');
    }
  }

  setModalState = (modalState: ScrollViewModalStatus) => {
    this.setState({ modalState });
  };

  render() {
    const scrollViewModalState = {
      modalState: this.state.modalState,
      setModalState: this.setModalState,
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
      scrollBlockingModalsClosed && !overlayModalClosingSelector(context),
  };
})(ScrollViewModalStateContainer);
