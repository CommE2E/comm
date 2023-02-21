// @flow

import { faCheckCircle } from '@fortawesome/free-regular-svg-icons';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import {
  disableAppActionType,
  enableAppActionType,
} from 'lib/reducers/enabled-apps-reducer.js';
import type { SupportedApps } from 'lib/types/enabled-apps.js';

import css from './apps.css';
import Button from '../../components/button.react.js';

type Props = {
  +id: SupportedApps | 'chat',
  +readOnly: boolean,
  +enabled: boolean,
  +name: string,
  +icon: 'message-square' | 'calendar',
  +copy: string,
};

function AppListing(props: Props): React.Node {
  const { id, readOnly, enabled, name, icon, copy } = props;
  const dispatch = useDispatch();

  const switchAppState = React.useCallback(
    () =>
      dispatch({
        type: enabled ? disableAppActionType : enableAppActionType,
        payload: id,
      }),
    [dispatch, enabled, id],
  );

  const actionButton = React.useMemo(() => {
    const switchIcon = enabled ? faCheckCircle : faPlusCircle;
    if (readOnly) {
      const readOnlyIconClasses = classnames(
        css.appListingIcon,
        css.appListingIconState,
        css.iconReadOnly,
      );
      return (
        <div className={readOnlyIconClasses}>
          <FontAwesomeIcon icon={switchIcon} />
        </div>
      );
    }
    const iconClasses = classnames({
      [css.appListingIconState]: true,
      [css.iconEnabled]: enabled,
      [css.iconDisabled]: !enabled,
    });
    return (
      <Button className={iconClasses} onClick={switchAppState}>
        <FontAwesomeIcon icon={enabled ? faCheckCircle : faPlusCircle} />
      </Button>
    );
  }, [enabled, readOnly, switchAppState]);
  return (
    <div className={css.appListingContainer}>
      <div className={css.appListingIcon}>
        <SWMansionIcon icon={icon} size={20} />
      </div>
      <div className={css.appListingTextContainer}>
        <h5 className={css.appName}>{name}</h5>
        <small className={css.appCopy}>{copy}</small>
      </div>
      {actionButton}
    </div>
  );
}

export default AppListing;
