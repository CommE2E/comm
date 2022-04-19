#include <gtest/gtest.h>

class BackupTest : public testing::Test {
protected:
  virtual void SetUp() {
    //...
  }

  virtual void TearDown() {
    //...
  }
};

TEST_F(BackupTest, passingTest) {
  EXPECT_TRUE(true);
}

TEST_F(BackupTest, failingTest) {
  // EXPECT_TRUE(false);
}
