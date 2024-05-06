#include "UserStore.h"

#include "../../DBOperationBase.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

OperationType UserStore::REMOVE_OPERATION = "remove_users";
OperationType UserStore::REMOVE_ALL_OPERATION = "remove_all_users";
OperationType UserStore::REPLACE_OPERATION = "replace_user";

UserStore::UserStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array UserStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<UserInfo>> usersVectorPtr) const {
  size_t numUsers = usersVectorPtr->size();
  jsi::Array jsiUsers = jsi::Array(rt, numUsers);
  size_t writeIdx = 0;
  for (const UserInfo &user : *usersVectorPtr) {
    jsi::Object jsiUser = jsi::Object(rt);
    jsiUser.setProperty(rt, "id", user.id);
    jsiUser.setProperty(rt, "userInfo", user.user_info);
    jsiUsers.setValueAtIndex(rt, writeIdx++, jsiUser);
  }
  return jsiUsers;
}

std::vector<std::unique_ptr<DBOperationBase>> UserStore::createOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) const {
  std::vector<std::unique_ptr<DBOperationBase>> userStoreOps;

  for (size_t idx = 0; idx < operations.size(rt); idx++) {
    jsi::Object op = operations.getValueAtIndex(rt, idx).asObject(rt);
    std::string opType = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (opType == REMOVE_OPERATION) {
      std::vector<std::string> userIDsToRemove;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array userIDs =
          payloadObj.getProperty(rt, "ids").asObject(rt).asArray(rt);
      for (int userIdx = 0; userIdx < userIDs.size(rt); userIdx++) {
        userIDsToRemove.push_back(
            userIDs.getValueAtIndex(rt, userIdx).asString(rt).utf8(rt));
      }
      userStoreOps.push_back(
          std::make_unique<RemoveUsersOperation>(std::move(userIDsToRemove)));
    } else if (opType == REMOVE_ALL_OPERATION) {
      userStoreOps.push_back(std::make_unique<RemoveAllUsersOperation>());
    } else if (opType == REPLACE_OPERATION) {
      jsi::Object userObj = op.getProperty(rt, "payload").asObject(rt);
      std::string id = userObj.getProperty(rt, "id").asString(rt).utf8(rt);
      std::string user_info =
          userObj.getProperty(rt, "userInfo").asString(rt).utf8(rt);

      UserInfo user{id, user_info};

      userStoreOps.push_back(
          std::make_unique<ReplaceUserOperation>(std::move(user)));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return userStoreOps;
}

} // namespace comm
