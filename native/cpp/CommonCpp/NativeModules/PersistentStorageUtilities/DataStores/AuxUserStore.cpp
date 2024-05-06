#include "AuxUserStore.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

OperationType AuxUserStore::REMOVE_OPERATION = "remove_aux_user_infos";
OperationType AuxUserStore::REMOVE_ALL_OPERATION = "remove_all_aux_user_infos";
OperationType AuxUserStore::REPLACE_OPERATION = "replace_aux_user_info";

AuxUserStore::AuxUserStore(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array AuxUserStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<AuxUserInfo>> auxUserInfosVectorPtr) const {

  size_t numAuxUserInfos = auxUserInfosVectorPtr->size();
  jsi::Array jsiAuxUserInfos = jsi::Array(rt, numAuxUserInfos);
  size_t writeIdx = 0;
  for (const AuxUserInfo &auxUserInfo : *auxUserInfosVectorPtr) {
    jsi::Object jsiAuxUserInfo = jsi::Object(rt);
    jsiAuxUserInfo.setProperty(rt, "id", auxUserInfo.id);
    jsiAuxUserInfo.setProperty(rt, "auxUserInfo", auxUserInfo.aux_user_info);
    jsiAuxUserInfos.setValueAtIndex(rt, writeIdx++, jsiAuxUserInfo);
  }
  return jsiAuxUserInfos;
}

std::vector<std::unique_ptr<DBOperationBase>> AuxUserStore::createOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) const {
  std::vector<std::unique_ptr<DBOperationBase>> auxUserStoreOps;

  for (size_t idx = 0; idx < operations.size(rt); idx++) {
    jsi::Object op = operations.getValueAtIndex(rt, idx).asObject(rt);
    std::string opType = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (opType == REMOVE_OPERATION) {
      std::vector<std::string> auxUserIDsToRemove;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array auxUserIDs =
          payloadObj.getProperty(rt, "ids").asObject(rt).asArray(rt);
      for (int auxUserInfoIdx = 0; auxUserInfoIdx < auxUserIDs.size(rt);
           auxUserInfoIdx++) {
        auxUserIDsToRemove.push_back(
            auxUserIDs.getValueAtIndex(rt, auxUserInfoIdx)
                .asString(rt)
                .utf8(rt));
      }
      auxUserStoreOps.push_back(std::make_unique<RemoveAuxUserInfosOperation>(
          std::move(auxUserIDsToRemove)));
    } else if (opType == REMOVE_ALL_OPERATION) {
      auxUserStoreOps.push_back(
          std::make_unique<RemoveAllAuxUserInfosOperation>());
    } else if (opType == REPLACE_OPERATION) {
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      std::string id = payloadObj.getProperty(rt, "id").asString(rt).utf8(rt);
      std::string aux_user_info =
          payloadObj.getProperty(rt, "auxUserInfo").asString(rt).utf8(rt);

      AuxUserInfo auxUserInfo{id, aux_user_info};

      auxUserStoreOps.push_back(std::make_unique<ReplaceAuxUserInfoOperation>(
          std::move(auxUserInfo)));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return auxUserStoreOps;
}

} // namespace comm
