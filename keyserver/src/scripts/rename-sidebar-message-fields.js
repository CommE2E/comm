// @flow

import { messageTypes } from 'lib/types/message-types';

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function renameSidebarSource() {
  const query = SQL`
    UPDATE messages
    SET content = JSON_REMOVE(
      JSON_SET(content, '$.sourceMessageID', 
        JSON_EXTRACT(content, '$.initialMessageID')
      ),
      '$.initialMessageID'
    )
    WHERE type = ${messageTypes.SIDEBAR_SOURCE}
  `;
  await dbQuery(query);
}

async function renameCreateSidebar() {
  const query = SQL`
    UPDATE messages
    SET content = JSON_REMOVE(
      JSON_SET(content, '$.sourceMessageAuthorID', 
        JSON_EXTRACT(content, '$.initialMessageAuthorID')
      ),
      '$.initialMessageAuthorID'
    )
    WHERE type = ${messageTypes.CREATE_SIDEBAR}
  `;
  await dbQuery(query);
}

main([renameSidebarSource, renameCreateSidebar]);
