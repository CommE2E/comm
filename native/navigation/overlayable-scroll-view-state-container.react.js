// @flow

import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import {
  scrollBlockingChatModalsClosedSelector,
  overlayTransitioningSelector,
} from './nav-selectors';
import { OverlayableScrollViewContext } from './overlayable-scroll-view-state';

type Props = {|
  children: React.Node,
  // Redux state
  scrollBlockingModalsClosed: boolean,
  scrollBlockingModalsGone: boolean,
|};
type State = {|
  scrollDisabled: boolean,
|};
class OverlayableScrollViewStateContainer extends React.PureComponent<
  Props,
  State,
> {
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
    const overlayableScrollViewState = {
      scrollDisabled: this.state.scrollDisabled,
      setScrollDisabled: this.setScrollDisabled,
    };
    return (
      <OverlayableScrollViewContext.Provider value={overlayableScrollViewState}>
        {this.props.children}
      </OverlayableScrollViewContext.Provider>
    );
  }
}

export default connect((state: AppState) => {
  const scrollBlockingModalsClosed = scrollBlockingChatModalsClosedSelector(
    state,
  );
  return {
    scrollBlockingModalsClosed,
    scrollBlockingModalsGone:
      scrollBlockingModalsClosed && !overlayTransitioningSelector(state),
  };
})(OverlayableScrollViewStateContainer);
