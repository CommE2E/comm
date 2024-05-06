#include "IntegrityStore.h"
#include "../../../DatabaseManagers/entities/IntegrityThreadHash.h"

#include "../../DBOperationBase.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

OperationType IntegrityStore::REMOVE_OPERATION =
    "remove_integrity_thread_hashes";
OperationType IntegrityStore::REMOVE_ALL_OPERATION =
    "remove_all_integrity_thread_hashes";
OperationType IntegrityStore::REPLACE_OPERATION =
    "replace_integrity_thread_hashes";

IntegrityStore::IntegrityStore(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array IntegrityStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<IntegrityThreadHash>>
        integrityThreadHashesVectorPtr) const {
  size_t numIntegrityThreadHashes = integrityThreadHashesVectorPtr->size();
  jsi::Array jsiIntegrityThreadHashes =
      jsi::Array(rt, numIntegrityThreadHashes);
  size_t writeIdx = 0;
  for (const IntegrityThreadHash &integrityThreadHash :
       *integrityThreadHashesVectorPtr) {
    jsi::Object jsiIntegrityThreadHash = jsi::Object(rt);
    jsiIntegrityThreadHash.setProperty(rt, "id", integrityThreadHash.id);
    jsiIntegrityThreadHash.setProperty(
        rt, "threadHash", integrityThreadHash.thread_hash);
    jsiIntegrityThreadHashes.setValueAtIndex(
        rt, writeIdx++, jsiIntegrityThreadHash);
  }
  return jsiIntegrityThreadHashes;
}

std::vector<std::unique_ptr<DBOperationBase>> IntegrityStore::createOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) const {
  std::vector<std::unique_ptr<DBOperationBase>> integrityStoreOps;

  for (size_t idx = 0; idx < operations.size(rt); idx++) {
    jsi::Object op = operations.getValueAtIndex(rt, idx).asObject(rt);
    std::string opType = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (opType == REMOVE_OPERATION) {
      std::vector<std::string> integrityThreadHashIDsToRemove;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array integrityThreadHashIDs =
          payloadObj.getProperty(rt, "ids").asObject(rt).asArray(rt);
      for (int integrityThreadHashIDIdx = 0;
           integrityThreadHashIDIdx < integrityThreadHashIDs.size(rt);
           integrityThreadHashIDIdx++) {
        integrityThreadHashIDsToRemove.push_back(
            integrityThreadHashIDs.getValueAtIndex(rt, integrityThreadHashIDIdx)
                .asString(rt)
                .utf8(rt));
      }
      integrityStoreOps.push_back(
          std::make_unique<RemoveIntegrityThreadHashesOperation>(
              std::move(integrityThreadHashIDsToRemove)));
    } else if (opType == REMOVE_ALL_OPERATION) {
      integrityStoreOps.push_back(
          std::make_unique<RemoveAllIntegrityThreadHashesOperation>());
    } else if (opType == REPLACE_OPERATION) {
      std::vector<IntegrityThreadHash> integrityThreadHashesToReplace;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array integrityThreadHashes =
          payloadObj.getProperty(rt, "threadHashes").asObject(rt).asArray(rt);

      for (int integrityThreadHashIdx = 0;
           integrityThreadHashIdx < integrityThreadHashes.size(rt);
           integrityThreadHashIdx++) {
        jsi::Object integrityThreadHashObj =
            integrityThreadHashes.getValueAtIndex(rt, integrityThreadHashIdx)
                .asObject(rt);

        std::string id =
            integrityThreadHashObj.getProperty(rt, "id").asString(rt).utf8(rt);
        std::string threadHash =
            integrityThreadHashObj.getProperty(rt, "threadHash")
                .asString(rt)
                .utf8(rt);

        IntegrityThreadHash integrityThreadHash{id, threadHash};

        integrityThreadHashesToReplace.push_back(integrityThreadHash);
      }
      integrityStoreOps.push_back(
          std::make_unique<ReplaceIntegrityThreadHashesOperation>(
              std::move(integrityThreadHashesToReplace)));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return integrityStoreOps;
}

} // namespace comm
