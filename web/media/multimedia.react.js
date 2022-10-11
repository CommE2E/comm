// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  XCircle as XCircleIcon,
  AlertCircle as AlertCircleIcon,
} from 'react-feather';

import { useModalContext } from 'lib/components/modal-provider.react';

import Button from '../components/button.react';
import { type PendingMultimediaUpload } from '../input/input-state';
import css from './media.css';
import MultimediaModal from './multimedia-modal.react';

type BaseProps = {
  +uri: string,
  +pendingUpload?: ?PendingMultimediaUpload,
  +remove?: (uploadID: string) => void,
  +multimediaCSSClass: string,
  +multimediaImageCSSClass: string,
};
type Props = {
  ...BaseProps,
  +pushModal: (modal: React.Node) => void,
};

class Multimedia extends React.PureComponent<Props> {
  componentDidUpdate(prevProps: Props) {
    const { uri, pendingUpload } = this.props;
    if (uri === prevProps.uri) {
      return;
    }
    if (
      (!pendingUpload || pendingUpload.uriIsReal) &&
      (!prevProps.pendingUpload || !prevProps.pendingUpload.uriIsReal)
    ) {
      URL.revokeObjectURL(prevProps.uri);
    }
  }

  render(): React.Node {
    let progressIndicator, errorIndicator, removeButton;

    const { pendingUpload, remove } = this.props;
    if (pendingUpload) {
      const { progressPercent, failed } = pendingUpload;

      if (progressPercent !== 0 && progressPercent !== 1) {
        const outOfHundred = Math.floor(progressPercent * 100);
        const text = `${outOfHundred}%`;
        progressIndicator = (
          <CircularProgressbar
            value={outOfHundred}
            text={text}
            background
            backgroundPadding={6}
            className={css.progressIndicator}
          />
        );
      }

      if (failed) {
        errorIndicator = (
          <AlertCircleIcon className={css.uploadError} size={36} />
        );
      }

      if (remove) {
        removeButton = (
          <Button onClick={this.remove}>
            <XCircleIcon className={css.removeUpload} />
          </Button>
        );
      }
    }

    const imageContainerClasses = [
      css.multimediaImage,
      this.props.multimediaImageCSSClass,
    ];
    imageContainerClasses.push(css.clickable);

    const containerClasses = [css.multimedia, this.props.multimediaCSSClass];
    return (
      <span className={classNames(containerClasses)}>
        <Button
          className={classNames(imageContainerClasses)}
          onClick={this.onClick}
        >
          <img src={this.props.uri} />
          {removeButton}
        </Button>
        {progressIndicator}
        {errorIndicator}
      </span>
    );
  }

  remove: (event: SyntheticEvent<HTMLElement>) => void = event => {
    event.stopPropagation();
    const { remove, pendingUpload } = this.props;
    invariant(
      remove && pendingUpload,
      'Multimedia cannot be removed as either remove or pendingUpload ' +
        'are unspecified',
    );
    remove(pendingUpload.localID);
  };

  onClick: () => void = () => {
    const { pushModal, uri } = this.props;
    pushModal(<MultimediaModal uri={uri} />);
  };
}

function ConnectedMultimediaContainer(props: BaseProps): React.Node {
  const modalContext = useModalContext();

  return <Multimedia {...props} pushModal={modalContext.pushModal} />;
}

export default ConnectedMultimediaContainer;
