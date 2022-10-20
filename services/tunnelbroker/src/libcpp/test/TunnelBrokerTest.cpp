#include <gtest/gtest.h>

class TunnelBrokerTest : public testing::Test {
protected:
  virtual void SetUp() {
    //...
  }

  virtual void TearDown() {
    //...
  }
};

TEST_F(TunnelBrokerTest, passingTest) {
  EXPECT_TRUE(true);
}

TEST_F(TunnelBrokerTest, failingTest) {
  // EXPECT_TRUE(false);
}
