#include "MessageOperationsUtilities.h"
#include "../ThreadOperationsUtilities/ThreadTypeEnum.h"
#include "Logger.h"
#include "MessageSpecs.h"
#include "StringUtils.h"

#include <folly/json.h>
#include <optional>
#include <stdexcept>

namespace comm {
ClientDBMessageInfo
MessageOperationsUtilities::translateRawMessageInfoToClientDBMessageInfo(
    const folly::dynamic &rawMessageInfo) {
  std::string id = rawMessageInfo.count("id")
      ? rawMessageInfo["id"].asString()
      : rawMessageInfo["localID"].asString();
  std::string thread = rawMessageInfo["threadID"].asString();
  std::string user = rawMessageInfo["creatorID"].asString();

  std::optional<std::string> localID = std::nullopt;
  if (rawMessageInfo.count("localID")) {
    localID = rawMessageInfo["localID"].asString();
  }

  int type = rawMessageInfo["type"].asInt();
  MessageType messageType = static_cast<MessageType>(type);
  int64_t time = rawMessageInfo["time"].asInt();

  std::optional<int> futureType = std::nullopt;
  if (messageType == MessageType::UNSUPPORTED) {
    futureType = rawMessageInfo["unsupportedMessageInfo"]["type"].asInt();
  }

  std::optional<std::string> content = std::nullopt;
  if (messageSpecsHolder.find(messageType) != messageSpecsHolder.end()) {
    auto contentPtr = messageSpecsHolder.at(messageType)
                          ->messageContentForClientDB(rawMessageInfo);
    if (contentPtr) {
      content = *contentPtr;
    }
  }
  std::vector<Media> mediaVector;
  if (messageType == MessageType::IMAGES ||
      messageType == MessageType::MULTIMEDIA) {
    for (const auto &media : rawMessageInfo["media"]) {
      mediaVector.push_back(
          translateMediaToClientDBMediaInfo(media, id, thread));
    }
  }
  MessageEntity entity;
  entity.message = Message{
      id,
      std::move(localID),
      thread,
      user,
      type,
      std::move(futureType),
      std::move(content),
      time};
  entity.medias = std::move(mediaVector);
  return entity;
}

Media MessageOperationsUtilities::translateMediaToClientDBMediaInfo(
    const folly::dynamic &rawMediaInfo,
    const std::string &container,
    const std::string &thread) {
  std::string id = rawMediaInfo["id"].asString();
  std::string uri = rawMediaInfo["uri"].asString();
  std::string type = rawMediaInfo["type"].asString();
  folly::dynamic extrasData =
      folly::dynamic::object("dimensions", rawMediaInfo["dimensions"])(
          "loop", (type == "video") ? rawMediaInfo["loop"] : false);
  if (rawMediaInfo.count("localMediaSelection")) {
    extrasData["local_media_selection"] = rawMediaInfo["localMediaSelection"];
  }
  std::string extras = folly::toJson(extrasData);
  return Media{id, container, thread, uri, type, extras};
}

std::vector<ClientDBMessageInfo>
MessageOperationsUtilities::translateStringToClientDBMessageInfos(
    std::string &rawMessageInfosString) {
  std::vector<ClientDBMessageInfo> clientDBMessageInfos;
  folly::dynamic rawMessageInfos;
  try {
    rawMessageInfos =
        folly::parseJson(StringUtils::trimWhitespace(rawMessageInfosString));
  } catch (const folly::json::parse_error &e) {
    Logger::log(
        "Failed to convert message into JSON object. Details: " +
        std::string(e.what()));
    return clientDBMessageInfos;
  }
  for (const auto &messageInfo : rawMessageInfos) {
    try {
      clientDBMessageInfos.push_back(
          translateRawMessageInfoToClientDBMessageInfo(messageInfo));
    } catch (const folly::TypeError &e) {
      Logger::log(
          "Invalid type conversion when parsing message. Details: " +
          std::string(e.what()));
    } catch (const std::out_of_range &e) {
      Logger::log(
          "Non-existing key accessed when parsing message. Details: " +
          std::string(e.what()));
    }
  }

  return clientDBMessageInfos;
}

void MessageOperationsUtilities::storeMessageInfos(
    std::string &rawMessageInfosString) {
  std::vector<ClientDBMessageInfo> clientDBMessageInfos =
      translateStringToClientDBMessageInfos(rawMessageInfosString);
  for (const auto &clientDBMessageInfo : clientDBMessageInfos) {
    bool dataIsBackedUp =
        !threadIDMatchesKeyserverProtocol(clientDBMessageInfo.message.thread);
    DatabaseManager::getQueryExecutor().replaceMessage(
        clientDBMessageInfo.message, dataIsBackedUp);
    for (const auto &mediaInfo : clientDBMessageInfo.medias) {
      DatabaseManager::getQueryExecutor().replaceMedia(
          mediaInfo, dataIsBackedUp);
    }
  }
}

} // namespace comm
