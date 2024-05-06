#include "CommunityStore.h"

#include "../../DBOperationBase.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

OperationType CommunityStore::REMOVE_OPERATION = "remove_communities";
OperationType CommunityStore::REMOVE_ALL_OPERATION = "remove_all_communities";
OperationType CommunityStore::REPLACE_OPERATION = "replace_community";

CommunityStore::CommunityStore(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array CommunityStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<CommunityInfo>> communitiesVectorPtr) const {
  size_t numCommunities = communitiesVectorPtr->size();
  jsi::Array jsiCommunities = jsi::Array(rt, numCommunities);
  size_t writeIdx = 0;
  for (const CommunityInfo &community : *communitiesVectorPtr) {
    jsi::Object jsiCommunity = jsi::Object(rt);
    jsiCommunity.setProperty(rt, "id", community.id);
    jsiCommunity.setProperty(rt, "communityInfo", community.community_info);
    jsiCommunities.setValueAtIndex(rt, writeIdx++, jsiCommunity);
  }
  return jsiCommunities;
}

std::vector<std::unique_ptr<DBOperationBase>> CommunityStore::createOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) const {
  std::vector<std::unique_ptr<DBOperationBase>> communityStoreOps;

  for (size_t idx = 0; idx < operations.size(rt); idx++) {
    jsi::Object op = operations.getValueAtIndex(rt, idx).asObject(rt);
    std::string opType = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (opType == REMOVE_OPERATION) {
      std::vector<std::string> communityIDsToRemove;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array communityIDs =
          payloadObj.getProperty(rt, "ids").asObject(rt).asArray(rt);
      for (int communityIdx = 0; communityIdx < communityIDs.size(rt);
           communityIdx++) {
        communityIDsToRemove.push_back(
            communityIDs.getValueAtIndex(rt, communityIdx)
                .asString(rt)
                .utf8(rt));
      }
      communityStoreOps.push_back(std::make_unique<RemoveCommunitiesOperation>(
          std::move(communityIDsToRemove)));
    } else if (opType == REMOVE_ALL_OPERATION) {
      communityStoreOps.push_back(
          std::make_unique<RemoveAllCommunitiesOperation>());
    } else if (opType == REPLACE_OPERATION) {
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      std::string id = payloadObj.getProperty(rt, "id").asString(rt).utf8(rt);
      std::string community_info =
          payloadObj.getProperty(rt, "communityInfo").asString(rt).utf8(rt);

      CommunityInfo community{id, community_info};

      communityStoreOps.push_back(
          std::make_unique<ReplaceCommunityOperation>(std::move(community)));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return communityStoreOps;
}

} // namespace comm
