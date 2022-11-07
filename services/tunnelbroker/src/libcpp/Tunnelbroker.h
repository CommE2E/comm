#pragma once

#include "rust/cxx.h"
#include "tunnelbroker/src/cxx_bridge.rs.h"

void initialize();
rust::String getConfigParameter(rust::Str parameter);
bool isSandbox();
SessionSignatureResult sessionSignatureHandler(rust::Str deviceID);
NewSessionResult newSessionHandler(
    rust::Str deviceID,
    rust::Str publicKey,
    rust::Str signature,
    int32_t deviceType,
    rust::Str deviceAppVersion,
    rust::Str deviceOS,
    rust::Str notifyToken);
SessionItem getSessionItem(rust::Str sessionID);
void updateSessionItemIsOnline(rust::Str sessionID, bool isOnline);
void updateSessionItemDeviceToken(rust::Str sessionID, rust::Str newNotifToken);
rust::Vec<MessageItem> getMessagesFromDatabase(rust::Str deviceID);
void eraseMessagesFromAMQP(rust::Str deviceID);
void ackMessageFromAMQP(uint64_t deliveryTag);
MessageItem waitMessageFromDeliveryBroker(rust::Str deviceID);
