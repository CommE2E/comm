#include "DeliveryBroker.h"
#include "GlobalTools.h"
#include "Tools.h"

#include <gtest/gtest.h>

#include <ctime>
#include <string>

using namespace comm::network;

class DeliveryBrokerTest : public testing::Test {};

TEST(DeliveryBrokerTest, CheckPushAndPopOnStaticValues) {
  const std::string toDeviceID =
      "mobile:EMQNoQ7b2ueEmQ4QsevRWlXxFCNt055y20T1PHdoYAQRt0S6TLzZWNM6XSvdWqxm";
  const DeliveryBrokerMessage message{
      .messageID = "bc0c1aa2-bf09-11ec-9d64-0242ac120002",
      .deliveryTag = 99,
      .fromDeviceID =
          "mobile:"
          "uTfNoQ7b2ueEmQ4QsevRWlXxFCNt055y20T1PHdooLkRt0S6TLzZWNM6XSvdWLop",
      .payload =
          "lYlNcO6RR4i9UW3G1DGjdJTRRGbqtPya2aj94ZRjIGZWoHwT5MB9ciAgnQf2VafYb9Tl"
          "8SZkX37tg4yZ9pOb4lqslY4g4h58OmWjumghVRvrPUZDalUuK8OLs1Qoengpu9wccxAk"
          "Bti2leDTNeiJDy36NnwS9aCIUc0ozsMvXfX1gWdBdmKbiRG1LvpNd6S7BNGG7Zly5zYj"
          "xz7s6ZUSDoFfZe3eJWQ15ngYhgMw1TsfbECnMVQTYvY6OyqWPBQi5wiftFcluoxor8G5"
          "RJ1NEDQq2q2FRfWjNHLhky92C2C7Nnfe4oVzSinfC1319uUkNLpSzI4MvEMi6g5Ukbl7"
          "iGhpnX7Hp4xpBL3h2IkvGviDRQ98UvW0ugwUuPxm1NOQpjLG5dPoqQ0jrMst0Bl5rgPw"
          "ajjNGsUWmp9r0ST0wRQXrQcY30PoSoqKSlCEgFMLzHWLrPQ86QFyCICismGSe7iBIqdD"
          "6d37StvXBzfJoZVU79UeOF2bFvb3DNoArEOe"};
  DeliveryBroker::getInstance().push(
      message.messageID,
      message.deliveryTag,
      toDeviceID,
      message.fromDeviceID,
      message.payload);
  DeliveryBrokerMessage receivedMessage =
      DeliveryBroker::getInstance().pop(toDeviceID);
  EXPECT_EQ(message.messageID, receivedMessage.messageID);
  EXPECT_EQ(message.deliveryTag, receivedMessage.deliveryTag);
  EXPECT_EQ(message.fromDeviceID, receivedMessage.fromDeviceID);
  EXPECT_EQ(message.payload, receivedMessage.payload);
}

TEST(DeliveryBrokerTest, CheckPushAndPopOnGeneratedValues) {
  const std::string toDeviceID =
      "mobile:" + tools::generateRandomString(DEVICEID_CHAR_LENGTH);
  const DeliveryBrokerMessage message{
      .messageID = tools::generateUUID(),
      .deliveryTag = static_cast<uint64_t>(std::time(0)),
      .fromDeviceID =
          "mobile:" + tools::generateRandomString(DEVICEID_CHAR_LENGTH),
      .payload = tools::generateRandomString(512)};
  DeliveryBroker::getInstance().push(
      message.messageID,
      message.deliveryTag,
      toDeviceID,
      message.fromDeviceID,
      message.payload);
  DeliveryBrokerMessage receivedMessage =
      DeliveryBroker::getInstance().pop(toDeviceID);
  EXPECT_EQ(message.messageID, receivedMessage.messageID)
      << "Generated MessageID \"" << message.messageID
      << "\" differs from what was received " << receivedMessage.messageID;
  EXPECT_EQ(message.deliveryTag, receivedMessage.deliveryTag)
      << "Generated DeliveryTag \"" << message.deliveryTag
      << "\" differs from what was received " << receivedMessage.deliveryTag;
  EXPECT_EQ(message.fromDeviceID, receivedMessage.fromDeviceID)
      << "Generated FromDeviceID \"" << message.fromDeviceID
      << "\" differs from what was received " << receivedMessage.fromDeviceID;
  EXPECT_EQ(message.payload, receivedMessage.payload)
      << "Generated Payload \"" << message.payload
      << "\" differs from what was received " << receivedMessage.payload;
}

TEST(DeliveryBrokerTest, IsEmptyShoudBeFalseAfterPush) {
  const std::string deviceID =
      "mobile:"
      "EMQNoQ7b2ueEmQ4QsevRWlXxFCNt055y20T1PHdoYAQRt0S6TLzZWNM6XSvdWqxm";
  const DeliveryBrokerMessage message{
      .messageID = "bc0c1aa2-bf09-11ec-9d64-0242ac120002",
      .deliveryTag = 99,
      .fromDeviceID =
          "mobile:"
          "uTfNoQ7b2ueEmQ4QsevRWlXxFCNt055y20T1PHdooLkRt0S6TLzZWNM6XSvdWLop",
      .payload =
          "lYlNcO6RR4i9UW3G1DGjdJTRRGbqtPya2aj94ZRjIGZWoHwT5MB9ciAgnQf2VafYb9Tl"
          "8SZkX37tg4yZ9pOb4lqslY4g4h58OmWjumghVRvrPUZDalUuK8OLs1Qoengpu9wccxAk"
          "Bti2leDTNeiJDy36NnwS9aCIUc0ozsMvXfX1gWdBdmKbiRG1LvpNd6S7BNGG7Zly5zYj"
          "xz7s6ZUSDoFfZe3eJWQ15ngYhgMw1TsfbECnMVQTYvY6OyqWPBQi5wiftFcluoxor8G5"
          "RJ1NEDQq2q2FRfWjNHLhky92C2C7Nnfe4oVzSinfC1319uUkNLpSzI4MvEMi6g5Ukbl7"
          "iGhpnX7Hp4xpBL3h2IkvGviDRQ98UvW0ugwUuPxm1NOQpjLG5dPoqQ0jrMst0Bl5rgPw"
          "ajjNGsUWmp9r0ST0wRQXrQcY30PoSoqKSlCEgFMLzHWLrPQ86QFyCICismGSe7iBIqdD"
          "6d37StvXBzfJoZVU79UeOF2bFvb3DNoArEOe"};
  EXPECT_EQ(DeliveryBroker::getInstance().isEmpty(deviceID), true);
  DeliveryBroker::getInstance().push(
      message.messageID,
      message.deliveryTag,
      deviceID,
      message.fromDeviceID,
      message.payload);
  EXPECT_EQ(DeliveryBroker::getInstance().isEmpty(deviceID), false);
}

TEST(DeliveryBrokerTest, ShouldBeEmptyAfterErase) {
  const std::string deviceID =
      "mobile:"
      "EMQNoQ7b2ueEmQ4QsevRWlXxFCNt055y20T1PHdoYAQRt0S6TLzZWNM6XSvdWqxm";
  const DeliveryBrokerMessage message{
      .messageID = "bc0c1aa2-bf09-11ec-9d64-0242ac120002",
      .deliveryTag = 99,
      .fromDeviceID =
          "mobile:"
          "uTfNoQ7b2ueEmQ4QsevRWlXxFCNt055y20T1PHdooLkRt0S6TLzZWNM6XSvdWLop",
      .payload =
          "lYlNcO6RR4i9UW3G1DGjdJTRRGbqtPya2aj94ZRjIGZWoHwT5MB9ciAgnQf2VafYb9Tl"
          "8SZkX37tg4yZ9pOb4lqslY4g4h58OmWjumghVRvrPUZDalUuK8OLs1Qoengpu9wccxAk"
          "Bti2leDTNeiJDy36NnwS9aCIUc0ozsMvXfX1gWdBdmKbiRG1LvpNd6S7BNGG7Zly5zYj"
          "xz7s6ZUSDoFfZe3eJWQ15ngYhgMw1TsfbECnMVQTYvY6OyqWPBQi5wiftFcluoxor8G5"
          "RJ1NEDQq2q2FRfWjNHLhky92C2C7Nnfe4oVzSinfC1319uUkNLpSzI4MvEMi6g5Ukbl7"
          "iGhpnX7Hp4xpBL3h2IkvGviDRQ98UvW0ugwUuPxm1NOQpjLG5dPoqQ0jrMst0Bl5rgPw"
          "ajjNGsUWmp9r0ST0wRQXrQcY30PoSoqKSlCEgFMLzHWLrPQ86QFyCICismGSe7iBIqdD"
          "6d37StvXBzfJoZVU79UeOF2bFvb3DNoArEOe"};
  DeliveryBroker::getInstance().push(
      message.messageID,
      message.deliveryTag,
      deviceID,
      message.fromDeviceID,
      message.payload);
  EXPECT_EQ(DeliveryBroker::getInstance().isEmpty(deviceID), false);
  DeliveryBroker::getInstance().erase(deviceID);
  EXPECT_EQ(DeliveryBroker::getInstance().isEmpty(deviceID), true);
}
