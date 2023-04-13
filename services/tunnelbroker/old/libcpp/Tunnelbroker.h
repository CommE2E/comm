#pragma once

#include "rust/cxx.h"
#include "tunnelbroker/src/cxx_bridge.rs.h"

void initialize();
rust::String getConfigParameter(rust::Str parameter);
bool isConfigParameterSet(rust::Str parameter);
bool isSandbox();
SessionSignatureResult sessionSignatureHandler(rust::Str deviceID);
rust::String getSavedNonceToSign(rust::Str deviceID);
NewSessionResult newSessionHandler(
    rust::Str deviceID,
    rust::Str publicKey,
    int32_t deviceType,
    rust::Str deviceAppVersion,
    rust::Str deviceOS,
    rust::Str notifyToken);
SessionItem getSessionItem(rust::Str sessionID);
void updateSessionItemIsOnline(rust::Str sessionID, bool isOnline);
void updateSessionItemDeviceToken(rust::Str sessionID, rust::Str newNotifToken);
rust::Vec<MessageItem> getMessagesFromDatabase(rust::Str deviceID);
rust::Vec<rust::String> sendMessages(const rust::Vec<MessageItem> &messages);
void eraseMessagesFromAMQP(rust::Str deviceID);
void ackMessageFromAMQP(uint64_t deliveryTag);
MessageItem waitMessageFromDeliveryBroker(rust::Str deviceID);
void removeMessages(
    rust::Str deviceID,
    const rust::Vec<rust::String> &messagesIDs);
void deleteDeliveryBrokerQueueIfEmpty(rust::Str deviceID);
