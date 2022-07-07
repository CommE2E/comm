#include "Tools.h"
#include "Constants.h"
#include "GlobalTools.h"

#include <gtest/gtest.h>

#include <string>

using namespace comm::network;

class ToolsTest : public testing::Test {};

TEST(ToolsTest, GeneratedRandomStringHasValidLength) {
  const std::size_t length = 32;
  const std::string generated = tools::generateRandomString(length);
  EXPECT_EQ(generated.length(), length)
      << "Generated random string \"" << generated << "\" length "
      << generated.length() << " is not equal to " << length;
}

TEST(ToolsTest, ValidateDeviceIDReturnsTrueOnStaticValidDeviceID) {
  const std::string validDeviceID =
      "mobile:EMQNoQ7b2ueEmQ4QsevRWlXxFCNt055y20T1PHdoYAQRt0S6TLzZWNM6XSvdWqxm";
  EXPECT_EQ(tools::validateDeviceID(validDeviceID), true)
      << "Valid deviceID \"" << validDeviceID
      << "\" is invalid by the function";
}

TEST(ToolsTest, ValidateDeviceIDReturnsTrueOnGeneratedValidDeviceID) {
  const std::string validDeviceID =
      "mobile:" + tools::generateRandomString(DEVICEID_CHAR_LENGTH);
  EXPECT_EQ(tools::validateDeviceID(validDeviceID), true)
      << "Valid generated deviceID \"" << validDeviceID
      << "\" is invalid by the function";
}

TEST(ToolsTest, ValidateUUIDv4ReturnsTrueOnStaticValidUUID) {
  const std::string validUUID = "9bfdd6ea-25de-418f-aa2e-869c78073d81";
  EXPECT_EQ(tools::validateUUIDv4(validUUID), true)
      << "Valid UUID \"" << validUUID << "\" is invalid by the function";
}

TEST(ToolsTest, ValidateUUIDv4ReturnsTrueOnGeneratedValidUUID) {
  const std::string validUUID = tools::generateUUID();
  EXPECT_EQ(tools::validateUUIDv4(validUUID), true)
      << "Valid generated UUID \"" << validUUID
      << "\" is invalid by the function";
}

TEST(ToolsTest, ValidateUUIDv4ReturnsFalseOnStaticInvalidUUID) {
  const std::string invalidFormatUUID = "58g8141b-8e5b-48f4-b3a1-e5e495c65f93";
  EXPECT_EQ(tools::validateUUIDv4(invalidFormatUUID), false)
      << "Invalid formatted UUID \"" << invalidFormatUUID
      << "\" is valid by the function";
  const std::string uppercaseUUID = "58F8141B-8E5B-48F4-B3A1-E5E495C65F93";
  EXPECT_EQ(tools::validateUUIDv4(uppercaseUUID), false)
      << "Uppercase UUID \"" << uppercaseUUID
      << "\" must be invalid because we are using the lowercase UUID format "
         "convention";
}

TEST(ToolsTest, ValidateDeviceIDReturnsFalseOnInvalidDeviceIDPrefix) {
  const std::string invalidDeviceIDPrefix =
      "invalid-"
      "EMQNoQ7b2ueEmQ4QsevRWlXxFCNt055y20T1PHdoYAQRt0S6TLzZWNM6XSvdWqxm";
  EXPECT_EQ(tools::validateDeviceID(invalidDeviceIDPrefix), false)
      << "Invalid prefix deviceID \"" << invalidDeviceIDPrefix
      << "\" is valid by the function";
}

TEST(ToolsTest, ValidateDeviceIDReturnsFalseOnInvalidDeviceIDSuffix) {
  const std::string invalidDeviceIDSuffix =
      "mobile:tQNoQ7b2ueEmQ4QsevRWlXxFCNt055y20T1PHdoYAQRt0S6TLzZWNM6XSvdWqxm";
  EXPECT_EQ(tools::validateDeviceID(invalidDeviceIDSuffix), false)
      << "Invalid suffix deviceID \"" << invalidDeviceIDSuffix
      << "\" is valid by the function";
}

TEST(ToolsTest, ValidateSessionIDReturnsTrueOnValidStaticSessionID) {
  const std::string validSessionID = "bc0c1aa2-bf09-11ec-9d64-0242ac120002";
  EXPECT_EQ(tools::validateSessionID(validSessionID), true)
      << "Valid sessionID \"" << validSessionID
      << "\" is invalid by the function";
}

TEST(ToolsTest, ValidateSessionIDReturnsTrueOnValidGeneratedSessionID) {
  const std::string validSessionID = tools::generateUUID();
  EXPECT_EQ(tools::validateSessionID(validSessionID), true)
      << "Valid generated sessionID \"" << validSessionID
      << "\" is invalid by the function";
}

TEST(ToolsTest, ValidateSessionIDReturnsFalseOnInvalidSessionID) {
  const std::string invalidSessionID = "bc0c1aa29bf09-11ec-9d64-0242ac120002";
  EXPECT_EQ(tools::validateSessionID(invalidSessionID), false)
      << "Invalid sessionID \"" << invalidSessionID
      << "\" is valid by the function";
}
