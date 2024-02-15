/**
 * This code was generated by [react-native-codegen](https://www.npmjs.com/package/react-native-codegen).
 *
 * Do not edit this file as changes may cause incorrect behavior and will be lost
 * once the code is regenerated.
 *
 * @generated by codegen project: GenerateModuleH.js
 */

#include "rustJSI.h"

namespace facebook {
namespace react {

static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_generateNonce(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->generateNonce(rt);
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_registerPasswordUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->registerPasswordUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt), args[4].asString(rt), args[5].asString(rt), args[6].asString(rt), args[7].asString(rt), args[8].asObject(rt).asArray(rt), args[9].asObject(rt).asArray(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_logInPasswordUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->logInPasswordUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt), args[4].asString(rt), args[5].asString(rt), args[6].asString(rt), args[7].asString(rt), args[8].asObject(rt).asArray(rt), args[9].asObject(rt).asArray(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_registerWalletUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->registerWalletUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt), args[4].asString(rt), args[5].asString(rt), args[6].asString(rt), args[7].asString(rt), args[8].asObject(rt).asArray(rt), args[9].asObject(rt).asArray(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_logInWalletUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->logInWalletUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt), args[4].asString(rt), args[5].asString(rt), args[6].asString(rt), args[7].asString(rt), args[8].asObject(rt).asArray(rt), args[9].asObject(rt).asArray(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_updatePassword(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->updatePassword(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_deleteUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->deleteUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_getOutboundKeysForUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->getOutboundKeysForUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_getInboundKeysForUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->getInboundKeysForUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_versionSupported(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->versionSupported(rt);
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_uploadOneTimeKeys(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->uploadOneTimeKeys(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asObject(rt).asArray(rt), args[4].asObject(rt).asArray(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_getKeyserverKeys(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->getKeyserverKeys(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_getDeviceListForUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->getDeviceListForUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt), args[4].isNull() || args[4].isUndefined() ? std::nullopt : std::make_optional(args[4].asNumber()));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_updateDeviceList(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->updateDeviceList(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_findUserIDForWalletAddress(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->findUserIDForWalletAddress(rt, args[0].asString(rt));
}

CommRustModuleSchemaCxxSpecJSI::CommRustModuleSchemaCxxSpecJSI(std::shared_ptr<CallInvoker> jsInvoker)
  : TurboModule("CommRustTurboModule", jsInvoker) {
  methodMap_["generateNonce"] = MethodMetadata {0, __hostFunction_CommRustModuleSchemaCxxSpecJSI_generateNonce};
  methodMap_["registerPasswordUser"] = MethodMetadata {10, __hostFunction_CommRustModuleSchemaCxxSpecJSI_registerPasswordUser};
  methodMap_["logInPasswordUser"] = MethodMetadata {10, __hostFunction_CommRustModuleSchemaCxxSpecJSI_logInPasswordUser};
  methodMap_["registerWalletUser"] = MethodMetadata {10, __hostFunction_CommRustModuleSchemaCxxSpecJSI_registerWalletUser};
  methodMap_["logInWalletUser"] = MethodMetadata {10, __hostFunction_CommRustModuleSchemaCxxSpecJSI_logInWalletUser};
  methodMap_["updatePassword"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_updatePassword};
  methodMap_["deleteUser"] = MethodMetadata {3, __hostFunction_CommRustModuleSchemaCxxSpecJSI_deleteUser};
  methodMap_["getOutboundKeysForUser"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_getOutboundKeysForUser};
  methodMap_["getInboundKeysForUser"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_getInboundKeysForUser};
  methodMap_["versionSupported"] = MethodMetadata {0, __hostFunction_CommRustModuleSchemaCxxSpecJSI_versionSupported};
  methodMap_["uploadOneTimeKeys"] = MethodMetadata {5, __hostFunction_CommRustModuleSchemaCxxSpecJSI_uploadOneTimeKeys};
  methodMap_["getKeyserverKeys"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_getKeyserverKeys};
  methodMap_["getDeviceListForUser"] = MethodMetadata {5, __hostFunction_CommRustModuleSchemaCxxSpecJSI_getDeviceListForUser};
  methodMap_["updateDeviceList"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_updateDeviceList};
  methodMap_["findUserIDForWalletAddress"] = MethodMetadata {1, __hostFunction_CommRustModuleSchemaCxxSpecJSI_findUserIDForWalletAddress};
}


} // namespace react
} // namespace facebook
