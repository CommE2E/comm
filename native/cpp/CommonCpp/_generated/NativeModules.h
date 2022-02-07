/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated by codegen project: GenerateModuleH.js
 */

#pragma once

#include <ReactCommon/TurboModule.h>

namespace facebook {
namespace react {
class JSI_EXPORT CommCoreModuleSchemaCxxSpecJSI : public TurboModule {
protected:
  CommCoreModuleSchemaCxxSpecJSI(std::shared_ptr<CallInvoker> jsInvoker);

public:
virtual jsi::Value getDraft(jsi::Runtime &rt, const jsi::String &key) = 0;
virtual jsi::Value updateDraft(jsi::Runtime &rt, const jsi::Object &draft) = 0;
virtual jsi::Value moveDraft(jsi::Runtime &rt, const jsi::String &oldKey, const jsi::String &newKey) = 0;
virtual jsi::Value getAllDrafts(jsi::Runtime &rt) = 0;
virtual jsi::Value removeAllDrafts(jsi::Runtime &rt) = 0;
virtual jsi::Value getAllMessages(jsi::Runtime &rt) = 0;
virtual jsi::Array getAllMessagesSync(jsi::Runtime &rt) = 0;
virtual jsi::Value processMessageStoreOperations(jsi::Runtime &rt, const jsi::Array &operations) = 0;
virtual bool processMessageStoreOperationsSync(jsi::Runtime &rt, const jsi::Array &operations) = 0;
virtual jsi::Value getAllThreads(jsi::Runtime &rt) = 0;
virtual jsi::Array getAllThreadsSync(jsi::Runtime &rt) = 0;
virtual jsi::Value processThreadStoreOperations(jsi::Runtime &rt, const jsi::Array &operations) = 0;
virtual bool processThreadStoreOperationsSync(jsi::Runtime &rt, const jsi::Array &operations) = 0;
virtual jsi::Value initializeCryptoAccount(jsi::Runtime &rt, const jsi::String &userId) = 0;
virtual jsi::Value getUserPublicKey(jsi::Runtime &rt) = 0;
virtual jsi::Value getUserOneTimeKeys(jsi::Runtime &rt) = 0;
virtual jsi::Object openSocket(jsi::Runtime &rt) = 0;

};

} // namespace react
} // namespace facebook
