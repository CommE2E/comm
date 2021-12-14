#include "Cleanup.h"

#include <string>

namespace comm {
namespace network {

// MOCKED FOR TESTS

Cleanup::Cleanup(const std::string &bucketName) : bucketName(bucketName) {}
void Cleanup::perform() {}
void Cleanup::perform(const std::string &fileHash) {}

} // namespace network
} // namespace comm
