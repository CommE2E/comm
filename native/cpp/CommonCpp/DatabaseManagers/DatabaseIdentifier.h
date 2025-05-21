#pragma once

#include <map>
#include <string>

enum class DatabaseIdentifier {
  // The main database used by the app with all the data.
  MAIN,
  // Decrypted database downloaded from backup service.
  RESTORED,
};

inline DatabaseIdentifier
stringToDatabaseIdentifier(const std::string &identifier) {
  static const std::map<std::string, DatabaseIdentifier> identifierMap = {
      {"main", DatabaseIdentifier::MAIN},
      {"restored", DatabaseIdentifier::RESTORED},
  };

  auto it = identifierMap.find(identifier);
  if (it != identifierMap.end()) {
    return it->second;
  } else {
    throw std::invalid_argument("Invalid database identifier");
  }
}
