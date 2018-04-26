// @flow

import type { AppState, WindowDimensions } from '../redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import css from '../style.css';
import { updateWindowDimensions } from '../redux-setup';

type Props = {
  // Redux state
  windowDimensions: WindowDimensions,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
class IntroModal extends React.PureComponent<Props> {

  static maxDistanceFromTypeahead = 30;

  componentDidMount() {
    window.addEventListener("resize", this.onResize);
    this.onResize();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.onResize);
  }

  onResize = () => {
    this.props.dispatchActionPayload(
      updateWindowDimensions,
      { width: window.innerWidth, height: window.innerHeight },
    );
  }

  static calculateLeft(width: number) {
    let modalLeft = (width - 350) / 2;
    const rightEdge = modalLeft + 354;
    const typeaheadLeftEdge = width - 432;
    if (rightEdge > (typeaheadLeftEdge - IntroModal.maxDistanceFromTypeahead)) {
      modalLeft = typeaheadLeftEdge - IntroModal.maxDistanceFromTypeahead - 354;
    }
    if (modalLeft < 0) {
      modalLeft = 0;
    }
    return modalLeft;
  }

  render() {
    const dimensions = this.props.windowDimensions;
    if (dimensions.width < 786 || dimensions.height < 310) {
      return <div className={css['modal-overlay']} />;
    }
    const modalLeft = IntroModal.calculateLeft(dimensions.width);

    return (
      <div className={css['modal-overlay']}>
        <div className={css['intro-modal']} style={{ left: modalLeft }}>
          <p>
            You're home, but you're not in any threads, so there's nothing to
            show. You can create a new thread using the dialog at right.
          </p>
        </div>
      </div>
    );
  }

}

IntroModal.propTypes = {
  windowDimensions: PropTypes.shape({
    height: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
  }).isRequired,
};

export default connect(
  (state: AppState) => ({
    windowDimensions: state.windowDimensions,
    cookie: state.cookie,
  }),
  null,
  true,
)(IntroModal);
