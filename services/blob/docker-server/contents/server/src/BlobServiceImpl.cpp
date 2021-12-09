#include "BlobServiceImpl.h"

#include <iostream>

namespace comm {
namespace network {

BlobServiceImpl::BlobServiceImpl() {
  Aws::InitAPI({});
  this->storageManager = std::make_unique<AwsStorageManager>();
  if (!this->storageManager->getBucket(this->bucketName).isAvailable()) {
    throw std::runtime_error("bucket " + this->bucketName + " not available");
  }
}

BlobServiceImpl::~BlobServiceImpl() { Aws::ShutdownAPI({}); }

/*
(findBlobItem)- Search for the hash in the database, if it doesn't exist:
  (-)- create a place for this file and upload it to the S3
  (-)- compute a hash of the uploaded file and verify that it's the same as
provided in the argument (putBlobItem)- store a hash and a place where the file
was saved in the DB (putReverseIndexItem)- store a reverse index in the DB for a
given hash
(updateBlobItem)- sets `remove_candidate` for this hash to `false`
*/
grpc::Status BlobServiceImpl::Put(grpc::ServerContext *context,
                                  grpc::ServerReader<blob::PutRequest> *reader,
                                  google::protobuf::Empty *response) {
  /*
  blob::PutRequest request;
  AwsS3Bucket bucket = this->storageManager->getBucket(this->bucketName);
  std::string hash;
  try {
    while (reader->Read(&request)) {
      const std::string reverseIndex = request.reverseindex();
      const std::string dataChunk = request.datachunk();
      if (reverseIndex.size()) {
        std::cout << "Blob Service => Put(this log will be removed) "
                     "reading reverse index ["
                  << reverseIndex << "]" << std::endl;
        // todo bucket operations
      } else if (dataChunk.size()) {
        std::cout << "Backup Service => ResetKey(this log will be removed) "
                     "reading chunk ["
                  << dataChunk << "]" << std::endl;
        // todo bucket operations
      }
    }
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  if (!hash.size()) { // todo maybe some more rules about the hash?
    return grpc::Status(grpc::StatusCode::INTERNAL,
                        "hash has not been created properly");
  }
  */
  return grpc::Status::OK;
}

/*
(findReverseIndexItemByReverseIndex)- search for the file location on S3 in the
database by the reverse index
*/
grpc::Status
BlobServiceImpl::Get(grpc::ServerContext *context,
                     const blob::GetRequest *request,
                     grpc::ServerWriter<blob::GetResponse> *writer) {
  /*
  // todo look up the file location on S3 in the database
  std::string objectName;

  const std::string hash = request->hash();
  AwsS3Bucket bucket = this->storageManager->getBucket(this->bucketName);
  try {
    blob::GetResponse response;
    std::function<void(const std::string &)> callback =
        [&response, &writer](std::string chunk) {
          response.set_datachunk(chunk);
          if (!writer->Write(response)) {
            throw std::runtime_error("writer interrupted sending compaction");
          }
        };

    bucket.getObjectDataChunks(objectName, callback, GRPC_CHUNK_SIZE_LIMIT);
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  */
  return grpc::Status::OK;
}

/*
(findReverseIndexItemByReverseIndex)- search for the file hash by the reverse
index (removeReverseIndexItem)- remove the current reverse index
()- run the cleanup process for this hash
*/
grpc::Status BlobServiceImpl::Remove(grpc::ServerContext *context,
                                     const blob::RemoveRequest *request,
                                     google::protobuf::Empty *response) {
  /*
  // todo look up the file location on S3 in the database
  std::string objectName;

  const std::string hash = request->hash();
  AwsS3Bucket bucket = this->storageManager->getBucket(this->bucketName);
  try {
    bucket.removeObject(objectName);
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  */
  return grpc::Status::OK;
}

// todo - cleanup

} // namespace network
} // namespace comm
