#include <gtest/gtest.h>

#include "BlobServiceImpl.h"

#include <memory>

using namespace comm::network;

class BlobServiceTest : public testing::Test {
protected:
  std::unique_ptr<BlobServiceImpl> blobService;

  virtual void SetUp() {
    if (blobService == nullptr) {
      blobService = std::make_unique<BlobServiceImpl>();
    }
  }

  virtual void TearDown() {
  }
};

TEST_F(BlobServiceTest, passingTest) {
  EXPECT_TRUE(true);
}
