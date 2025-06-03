// @flow

import * as React from 'react';

import { logTypes, useDebugLogs } from 'lib/components/debug-logs-context.js';
import type { LogType } from 'lib/components/debug-logs-context.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { values } from 'lib/utils/objects.js';

import css from './debug-logs-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';
import EnumSettingsOption from '../components/enum-settings-option.react.js';
import Modal from '../modals/modal.react.js';

function DebugLogsModal(): React.Node {
  const { logs, clearLogs, logsFilter, setFilter } = useDebugLogs();
  const { popModal } = useModalContext();

  const messageList = React.useMemo(
    () =>
      logs.map((item, index) => {
        const date = new Date(item.timestamp);
        const timestampString = date.toISOString();
        return (
          <div key={index} className={css.item}>
            <div className={css.timestamp}>{timestampString}</div>
            <div className={css.title}>{item.title}</div>
            <div className={css.message}>{item.message}</div>
          </div>
        );
      }),
    [logs],
  );

  const copyLogs = React.useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
  }, [logs]);

  const toggleLogsFilter = React.useCallback(
    (logType: LogType) => setFilter(logType, !logsFilter.has(logType)),
    [logsFilter, setFilter],
  );

  const logTypesList = React.useMemo(
    () =>
      values(logTypes).map(logType => (
        <EnumSettingsOption
          key={logType}
          selected={!!logsFilter.has(logType)}
          onSelect={() => toggleLogsFilter(logType)}
          icon={null}
          title={logType}
          type="checkbox"
          statements={[{ statement: logType }]}
        />
      )),
    [logsFilter, toggleLogsFilter],
  );

  return (
    <Modal name="Debug Logs" onClose={popModal} size="large">
      <div className={css.container}>
        <div> {logTypesList}</div>
        <div className={css.logsList}>{messageList}</div>
        <div className={css.buttons}>
          <Button variant="filled" className={css.button} onClick={copyLogs}>
            Copy filtered logs
          </Button>
          <Button
            variant="filled"
            buttonColor={buttonThemes.danger}
            className={css.button}
            onClick={clearLogs}
          >
            Clear filtered logs
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DebugLogsModal;
