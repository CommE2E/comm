// @flow

type ScriptContext = {
  // Prevents all mutations from occuring,
  // eg. MySQL INSERT/DELETE/UPDATE, Redis publish, etc.
  dryRun?: boolean,
  // Multiple statements in a single SQL query
  allowMultiStatementSQLQueries?: boolean,
};

let scriptContext: ?ScriptContext = null;

function getScriptContext(): ?ScriptContext {
  return scriptContext;
}

function setScriptContext(newScriptContext: ?ScriptContext) {
  scriptContext = newScriptContext;
}

export { getScriptContext, setScriptContext };
