#include<gtest/gtest.h>

#include "DatabaseManager.h"

#include <iostream>

#include <string>
#include <random>

class DatabaseManagerTest : public testing::Test
{
protected:
  virtual void SetUp()
  {
    Aws::InitAPI({});
  }

  virtual void TearDown()
  {
    Aws::ShutdownAPI({});
  }
};

int randomNumber(const int from, const int to)
{
  std::random_device rd;
  std::mt19937 mt(rd());
  std::uniform_int_distribution<int> dist(from, to);

  return dist(mt);
}

std::string randomString(size_t size = 20)
{
  std::string str("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");

  std::string result;

  for (size_t i = 0; i < size; ++i)
  {
    result += str[randomNumber(0, str.size() - 1)];
  }

  return result;
}

using comm::network::Item;

Item generateItem()
{
  Item item;
  item.hash = randomString();
  item.reverseIndex = randomString();
  item.s3Path = randomString();
  return item;
}

TEST_F(DatabaseManagerTest, DatabaseManagerTest)
{
  Item item = generateItem();
  std::cout << ">>> Test item: " << std::endl;
  std::cout << item.hash << std::endl;
  std::cout << item.reverseIndex << std::endl;
  std::cout << item.s3Path << std::endl;
  std::cout << "<<< Test item: " << std::endl;

  std::cout << "==> create db manager" << std::endl;
  comm::network::DatabaseManager dbm("blob-service");
  std::cout << "==> put item" << std::endl;
  dbm.putItem(item);
  std::cout << "==> find item" << std::endl;
  Item foundItem = dbm.findItem(item.hash);
  std::cout << "==> checking hashes" << std::endl;
  EXPECT_EQ(item.hash.size(), foundItem.hash.size());
  EXPECT_EQ(memcmp(item.hash.data(), foundItem.hash.data(), item.hash.size()), 0);
  std::cout << "==> remove item" << std::endl;
  dbm.removeItem(foundItem.hash);
  std::cout << "==> done" << std::endl;
}