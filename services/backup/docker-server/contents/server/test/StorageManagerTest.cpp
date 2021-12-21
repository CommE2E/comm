#include <gtest/gtest.h>

#include "AwsStorageManager.h"
#include "TestTools.h"

#include <aws/core/Aws.h>

#include <chrono>
#include <iostream>
#include <memory>
#include <string>

using namespace comm::network;

class StorageManagerTest : public testing::Test {
public:
protected:
  std::unique_ptr<AwsStorageManager> storageManager;
  const std::string bucketName = "commapp-test";
  const std::string data = "yiU3VaZlKfTteO10yrWmK1Q5BOvBQrdmj2aBlnoLuhxLfRZK1n8"
                           "26FRXJAGhPswR1r8yxtwxyLkv3I4J4tlH4brDP10mrB99XpM6";

  virtual void SetUp() {
    Aws::InitAPI({});
    if (storageManager == nullptr) {
      storageManager = std::make_unique<AwsStorageManager>();
    }
  }

  virtual void TearDown() { Aws::ShutdownAPI({}); }
};

TEST_F(StorageManagerTest, ObjectOperationsTest) {
  EXPECT_TRUE(storageManager->getBucket(bucketName).isAvailable());
  std::string objectName = createObject(storageManager->getBucket(bucketName));

  storageManager->getBucket(bucketName).writeObject(objectName, data);

  EXPECT_EQ(storageManager->getBucket(bucketName).getObjectSize(objectName),
            data.size());
  EXPECT_TRUE(storageManager->getBucket(bucketName).getObjectData(objectName) ==
              data);
  std::string chunkedData;
  const size_t chunkSize = data.size() / 10;
  std::function<void(const std::string &)> callback =
      [&chunkedData](const std::string &chunk) { chunkedData += chunk; };
  storageManager->getBucket(bucketName)
      .getObjectDataChunks(objectName, callback, chunkSize);
  EXPECT_TRUE(data == chunkedData);

  storageManager->getBucket(bucketName)
      .renameObject(objectName, objectName + "c");
  EXPECT_THROW(storageManager->getBucket(bucketName).getObjectData(objectName),
               std::runtime_error);
  EXPECT_TRUE(
      storageManager->getBucket(bucketName).getObjectData(objectName + "c") ==
      data);
  storageManager->getBucket(bucketName)
      .renameObject(objectName + "c", objectName);

  storageManager->getBucket(bucketName).clearObject(objectName);
  EXPECT_EQ(storageManager->getBucket(bucketName).getObjectSize(objectName), 0);

  storageManager->getBucket(bucketName).deleteObject(objectName);
  EXPECT_THROW(storageManager->getBucket(bucketName).getObjectData(objectName),
               std::runtime_error);
}
