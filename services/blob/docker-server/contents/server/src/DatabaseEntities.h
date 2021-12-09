#pragma once

#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>
#include <aws/dynamodb/model/AttributeDefinition.h>

#include <stdexcept>
#include <string>

namespace comm {
namespace network {
namespace database {

/**
 * Database Structure:
 * blob
 *  hash                string
 *  s3Path              string
 *  remove_candidate    bool
 * reverse_index
 *  hash                string
 *  reverse_index       string
 */

enum class ItemType {
  BLOB = 0,
  REVERSE_INDEX = 1,
};

struct Item {
  virtual void validate() const = 0;
};

struct BlobItem : Item {
  const ItemType type = ItemType::BLOB;
  std::string hash;
  std::string s3Path;
  bool removeCandidate = false;

  BlobItem() {}
  BlobItem(const std::string hash, const std::string s3Path)
      : hash(hash), s3Path(s3Path) {}
  BlobItem(const Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue>
               itemFromDB) {
    try {
      this->hash = itemFromDB.at("hash").GetS();
      this->s3Path = itemFromDB.at("s3Path").GetS();
      this->removeCandidate = std::stoi(
          std::string(itemFromDB.at("removeCandidate").GetS()).c_str());
    } catch (std::out_of_range &e) {
      std::string errorMessage = "invalid blob item provided, ";
      errorMessage += e.what();
      throw std::runtime_error(errorMessage);
    }
  }

  void validate() const override {
    // todo consider more checks here for valid values
    if (!this->hash.size()) {
      throw std::runtime_error("hash empty");
    }
    if (!this->s3Path.size()) {
      throw std::runtime_error("S3 path empty");
    }
  }
};

struct ReverseIndexItem : Item {
  const ItemType type = ItemType::REVERSE_INDEX;
  std::string hash;
  std::string reverseIndex;

  ReverseIndexItem() {}
  ReverseIndexItem(const std::string hash, const std::string reverseIndex)
      : hash(hash), reverseIndex(reverseIndex) {}
  ReverseIndexItem(
      const Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue>
          itemFromDB) {
    try {
      this->hash = itemFromDB.at("hash").GetS();
      this->reverseIndex = itemFromDB.at("reverseIndex").GetS();
    } catch (std::out_of_range &e) {
      std::string errorMessage = "invalid reverse index item provided, ";
      errorMessage += e.what();
      throw std::runtime_error(errorMessage);
    }
  }

  void validate() const override {
    // todo consider more checks here for valid values
    if (!this->hash.size()) {
      throw std::runtime_error("hash empty");
    }
    if (!this->reverseIndex.size()) {
      throw std::runtime_error("reverse index empty");
    }
  }
};

} // namespace database
} // namespace network
} // namespace comm
