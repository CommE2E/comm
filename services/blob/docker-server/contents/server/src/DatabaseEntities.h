#pragma once

#include "S3Path.h"

#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>
#include <aws/dynamodb/model/AttributeDefinition.h>

#include <stdexcept>
#include <string>

namespace comm {
namespace network {
namespace database {

typedef Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue>
    AttributeValues;

/**
 * Database Structure:
 * blob
 *  fileHash            string
 *  s3Path              string
 *  removeCandidate     bool
 * reverse_index
 *  reverseIndex        string
 *  fileHash            string
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
  std::string fileHash;
  S3Path s3Path;
  bool removeCandidate = false;

  BlobItem(const std::string fileHash, const S3Path s3Path)
      : fileHash(fileHash), s3Path(s3Path) {}
  BlobItem(const AttributeValues &itemFromDB) {
    try {
      this->fileHash = itemFromDB.at("fileHash").GetS();
      this->s3Path = S3Path(itemFromDB.at("s3Path").GetS());
      this->removeCandidate = std::stoi(
          std::string(itemFromDB.at("removeCandidate").GetS()).c_str());
    } catch (std::out_of_range &e) {
      std::string errorMessage = "invalid blob item provided, ";
      errorMessage += e.what();
      throw std::runtime_error(errorMessage);
    }
  }

  void validate() const override {
    // todo consider more checks here for valid values e.g. fileHash size
    if (!this->fileHash.size()) {
      throw std::runtime_error("fileHash empty");
    }
    this->s3Path.getFullPath();
  }
};

struct ReverseIndexItem : Item {
  const ItemType type = ItemType::REVERSE_INDEX;
  std::string reverseIndex;
  std::string fileHash;

  ReverseIndexItem() {}
  ReverseIndexItem(const std::string reverseIndex, const std::string fileHash)
      : reverseIndex(reverseIndex), fileHash(fileHash) {}
  ReverseIndexItem(const AttributeValues &itemFromDB) {
    try {
      this->reverseIndex = itemFromDB.at("reverseIndex").GetS();
      this->fileHash = itemFromDB.at("fileHash").GetS();
    } catch (std::out_of_range &e) {
      std::string errorMessage = "invalid reverse index item provided, ";
      errorMessage += e.what();
      throw std::runtime_error(errorMessage);
    }
  }

  void validate() const override {
    // todo consider more checks here for valid values e.g. fileHash size
    if (!this->reverseIndex.size()) {
      throw std::runtime_error("reverse index empty");
    }
    if (!this->fileHash.size()) {
      throw std::runtime_error("fileHash empty");
    }
  }
};

} // namespace database
} // namespace network
} // namespace comm
