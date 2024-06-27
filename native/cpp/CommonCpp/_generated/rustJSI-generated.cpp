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
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->registerPasswordUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt), args[4].asString(rt), args[5].asString(rt), args[6].asString(rt), args[7].asString(rt), args[8].asObject(rt).asArray(rt), args[9].asObject(rt).asArray(rt), args[10].asString(rt), args[11].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_registerReservedPasswordUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->registerReservedPasswordUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt), args[4].asString(rt), args[5].asString(rt), args[6].asString(rt), args[7].asString(rt), args[8].asObject(rt).asArray(rt), args[9].asObject(rt).asArray(rt), args[10].asString(rt), args[11].asString(rt), args[12].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_logInPasswordUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->logInPasswordUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt), args[4].asString(rt), args[5].asString(rt), args[6].asString(rt), args[7].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_registerWalletUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->registerWalletUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt), args[4].asString(rt), args[5].asString(rt), args[6].asString(rt), args[7].asString(rt), args[8].asObject(rt).asArray(rt), args[9].asObject(rt).asArray(rt), args[10].asString(rt), args[11].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_logInWalletUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->logInWalletUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt), args[4].asString(rt), args[5].asString(rt), args[6].asString(rt), args[7].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_updatePassword(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->updatePassword(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt), args[4].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_deletePasswordUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->deletePasswordUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_deleteWalletUser(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->deleteWalletUser(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_logOut(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->logOut(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_logOutPrimaryDevice(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->logOutPrimaryDevice(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_logOutSecondaryDevice(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->logOutSecondaryDevice(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt));
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
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_getDeviceListsForUsers(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->getDeviceListsForUsers(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asObject(rt).asArray(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_updateDeviceList(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->updateDeviceList(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_syncPlatformDetails(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->syncPlatformDetails(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_uploadSecondaryDeviceKeysAndLogIn(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->uploadSecondaryDeviceKeysAndLogIn(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt), args[4].asString(rt), args[5].asString(rt), args[6].asString(rt), args[7].asString(rt), args[8].asString(rt), args[9].asObject(rt).asArray(rt), args[10].asObject(rt).asArray(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_logInExistingDevice(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->logInExistingDevice(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_findUserIDForWalletAddress(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->findUserIDForWalletAddress(rt, args[0].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_findUserIDForUsername(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->findUserIDForUsername(rt, args[0].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_getFarcasterUsers(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->getFarcasterUsers(rt, args[0].asObject(rt).asArray(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_linkFarcasterAccount(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->linkFarcasterAccount(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_unlinkFarcasterAccount(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->unlinkFarcasterAccount(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt));
}
static jsi::Value __hostFunction_CommRustModuleSchemaCxxSpecJSI_findUserIdentities(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
  return static_cast<CommRustModuleSchemaCxxSpecJSI *>(&turboModule)->findUserIdentities(rt, args[0].asString(rt), args[1].asString(rt), args[2].asString(rt), args[3].asObject(rt).asArray(rt));
}

CommRustModuleSchemaCxxSpecJSI::CommRustModuleSchemaCxxSpecJSI(std::shared_ptr<CallInvoker> jsInvoker)
  : TurboModule("CommRustTurboModule", jsInvoker) {
  methodMap_["generateNonce"] = MethodMetadata {0, __hostFunction_CommRustModuleSchemaCxxSpecJSI_generateNonce};
  methodMap_["registerPasswordUser"] = MethodMetadata {12, __hostFunction_CommRustModuleSchemaCxxSpecJSI_registerPasswordUser};
  methodMap_["registerReservedPasswordUser"] = MethodMetadata {13, __hostFunction_CommRustModuleSchemaCxxSpecJSI_registerReservedPasswordUser};
  methodMap_["logInPasswordUser"] = MethodMetadata {8, __hostFunction_CommRustModuleSchemaCxxSpecJSI_logInPasswordUser};
  methodMap_["registerWalletUser"] = MethodMetadata {12, __hostFunction_CommRustModuleSchemaCxxSpecJSI_registerWalletUser};
  methodMap_["logInWalletUser"] = MethodMetadata {8, __hostFunction_CommRustModuleSchemaCxxSpecJSI_logInWalletUser};
  methodMap_["updatePassword"] = MethodMetadata {5, __hostFunction_CommRustModuleSchemaCxxSpecJSI_updatePassword};
  methodMap_["deletePasswordUser"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_deletePasswordUser};
  methodMap_["deleteWalletUser"] = MethodMetadata {3, __hostFunction_CommRustModuleSchemaCxxSpecJSI_deleteWalletUser};
  methodMap_["logOut"] = MethodMetadata {3, __hostFunction_CommRustModuleSchemaCxxSpecJSI_logOut};
  methodMap_["logOutPrimaryDevice"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_logOutPrimaryDevice};
  methodMap_["logOutSecondaryDevice"] = MethodMetadata {3, __hostFunction_CommRustModuleSchemaCxxSpecJSI_logOutSecondaryDevice};
  methodMap_["getOutboundKeysForUser"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_getOutboundKeysForUser};
  methodMap_["getInboundKeysForUser"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_getInboundKeysForUser};
  methodMap_["versionSupported"] = MethodMetadata {0, __hostFunction_CommRustModuleSchemaCxxSpecJSI_versionSupported};
  methodMap_["uploadOneTimeKeys"] = MethodMetadata {5, __hostFunction_CommRustModuleSchemaCxxSpecJSI_uploadOneTimeKeys};
  methodMap_["getKeyserverKeys"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_getKeyserverKeys};
  methodMap_["getDeviceListForUser"] = MethodMetadata {5, __hostFunction_CommRustModuleSchemaCxxSpecJSI_getDeviceListForUser};
  methodMap_["getDeviceListsForUsers"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_getDeviceListsForUsers};
  methodMap_["updateDeviceList"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_updateDeviceList};
  methodMap_["syncPlatformDetails"] = MethodMetadata {3, __hostFunction_CommRustModuleSchemaCxxSpecJSI_syncPlatformDetails};
  methodMap_["uploadSecondaryDeviceKeysAndLogIn"] = MethodMetadata {11, __hostFunction_CommRustModuleSchemaCxxSpecJSI_uploadSecondaryDeviceKeysAndLogIn};
  methodMap_["logInExistingDevice"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_logInExistingDevice};
  methodMap_["findUserIDForWalletAddress"] = MethodMetadata {1, __hostFunction_CommRustModuleSchemaCxxSpecJSI_findUserIDForWalletAddress};
  methodMap_["findUserIDForUsername"] = MethodMetadata {1, __hostFunction_CommRustModuleSchemaCxxSpecJSI_findUserIDForUsername};
  methodMap_["getFarcasterUsers"] = MethodMetadata {1, __hostFunction_CommRustModuleSchemaCxxSpecJSI_getFarcasterUsers};
  methodMap_["linkFarcasterAccount"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_linkFarcasterAccount};
  methodMap_["unlinkFarcasterAccount"] = MethodMetadata {3, __hostFunction_CommRustModuleSchemaCxxSpecJSI_unlinkFarcasterAccount};
  methodMap_["findUserIdentities"] = MethodMetadata {4, __hostFunction_CommRustModuleSchemaCxxSpecJSI_findUserIdentities};
}


} // namespace react
} // namespace facebook
