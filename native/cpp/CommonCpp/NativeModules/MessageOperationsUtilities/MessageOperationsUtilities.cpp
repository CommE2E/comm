#include "MessageOperationsUtilities.h"
#include "Logger.h"
#include "MessageSpecs.h"

#include <folly/String.h>
#include <folly/json.h>
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

  std::unique_ptr<std::string> localID = nullptr;
  if (rawMessageInfo.count("localID")) {
    localID =
        std::make_unique<std::string>(rawMessageInfo["localID"].asString());
  }

  int type = rawMessageInfo["type"].asInt();
  MessageType messageType = static_cast<MessageType>(type);
  int64_t time = rawMessageInfo["time"].asInt();

  std::unique_ptr<int> futureType = nullptr;
  if (messageType == MessageType::UNSUPPORTED) {
    futureType = std::make_unique<int>(
        rawMessageInfo["unsupportedMessageInfo"]["type"].asInt());
  }

  std::unique_ptr<std::string> content = nullptr;
  if (messageSpecsHolder.find(messageType) != messageSpecsHolder.end()) {
    content = messageSpecsHolder.at(messageType)
                  ->messageContentForClientDB(rawMessageInfo);
  }
  std::vector<Media> mediaVector;
  if (messageType == MessageType::IMAGES ||
      messageType == MessageType::MULTIMEDIA) {
    for (const auto &media : rawMessageInfo["media"]) {
      mediaVector.push_back(
          translateMediaToClientDBMediaInfo(media, id, thread));
    }
  }
  return {
      Message{
          id,
          std::move(localID),
          thread,
          user,
          type,
          std::move(futureType),
          std::move(content),
          time},
      std::move(mediaVector)};
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
    std::string &rawMessageInfoString) {
  std::vector<ClientDBMessageInfo> clientDBMessageInfos;
  folly::dynamic rawMessageInfos;
  try {
    rawMessageInfos =
        folly::parseJson(folly::trimWhitespace(rawMessageInfoString));
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

void MessageOperationsUtilities::storeNotification(
    std::string &rawMessageInfoString) {
  std::vector<ClientDBMessageInfo> clientDBMessageInfos =
      translateStringToClientDBMessageInfos(rawMessageInfoString);
  for (const auto &clientDBMessageInfo : clientDBMessageInfos) {
    DatabaseManager::getQueryExecutor().replaceMessage(
        clientDBMessageInfo.first);
    for (const auto &mediaInfo : clientDBMessageInfo.second) {
      DatabaseManager::getQueryExecutor().replaceMedia(mediaInfo);
    }
  }
}

} // namespace comm
