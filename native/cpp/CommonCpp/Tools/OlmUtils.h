#pragma once

#include <string>

namespace comm {

/**
 * Parses a OLM prekey string from JSON format
 * @param prekeyBlob JSON string with prekey
 * @return The prekey string extracted from the JSON
 * @throws std::runtime_error if parsing fails
 */
std::string parseOLMPrekey(std::string prekeyBlob);

} // namespace comm
