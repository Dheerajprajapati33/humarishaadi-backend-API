const { getMessagingInstance, isFirebaseReady } = require("../config/firebase");
const User = require("../models/User");

/**
 * Clean & normalize data map for FCM (FCM data values must be strings)
 */
function formatDataPayload(data) {
  if (!data || typeof data !== "object") return {};
  const formatted = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      formatted[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
  }
  return formatted;
}

/**
 * Send FCM push notification to a list of device tokens
 */
async function sendPushNotification({ tokens, title, body, data = {}, imageUrl = null }) {
  if (!isFirebaseReady()) {
    console.warn("[NotificationService] Firebase Admin is not initialized. Skipping notification.");
    return { success: false, error: "Firebase not initialized" };
  }

  const messaging = getMessagingInstance();
  if (!messaging) {
    return { success: false, error: "Firebase Messaging unavailable" };
  }

  const tokenList = Array.isArray(tokens)
    ? [...new Set(tokens.filter((t) => typeof t === "string" && t.trim().length > 0))]
    : typeof tokens === "string" && tokens.trim()
      ? [tokens.trim()]
      : [];

  if (tokenList.length === 0) {
    return { success: false, message: "No valid device tokens provided" };
  }

  const notification = {
    title: String(title || "HumaariShaadi"),
    body: String(body || ""),
  };
  if (imageUrl) {
    notification.imageUrl = imageUrl;
  }

  const payload = {
    tokens: tokenList,
    notification,
    data: formatDataPayload(data),
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "humaari_shaadi_alerts",
        priority: "high",
        defaultSound: true,
        defaultVibrateTimings: true,
        ...(imageUrl ? { imageUrl } : {}),
      },
    },
    apns: {
      headers: {
        "apns-priority": "10",
      },
      payload: {
        aps: {
          sound: "default",
          badge: 1,
          contentAvailable: true,
        },
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast(payload);
    const staleTokens = [];

    response.responses.forEach((res, index) => {
      if (!res.success && res.error) {
        const code = res.error.code;
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-argument"
        ) {
          staleTokens.push(tokenList[index]);
        }
      }
    });

    // Remove dead/unregistered tokens from DB
    if (staleTokens.length > 0) {
      await User.updateMany(
        { fcmTokens: { $in: staleTokens } },
        { $pull: { fcmTokens: { $in: staleTokens } } },
      );
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      staleTokensRemoved: staleTokens.length,
    };
  } catch (error) {
    console.error("[NotificationService] Send error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to a specific user by their MongoDB _id
 */
async function sendNotificationToUser(userId, { title, body, data = {}, imageUrl = null }) {
  try {
    const user = await User.findById(userId).select("fcmTokens phone");
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return { success: false, message: "User has no registered device tokens" };
    }

    return await sendPushNotification({
      tokens: user.fcmTokens,
      title,
      body,
      data,
      imageUrl,
    });
  } catch (error) {
    console.error(`[NotificationService] Error sending to user ${userId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to multiple users
 */
async function sendNotificationToUsers(userIds, { title, body, data = {}, imageUrl = null }) {
  try {
    const users = await User.find({ _id: { $in: userIds } }).select("fcmTokens");
    const allTokens = users.flatMap((u) => u.fcmTokens || []);
    return await sendPushNotification({
      tokens: allTokens,
      title,
      body,
      data,
      imageUrl,
    });
  } catch (error) {
    console.error("[NotificationService] Error sending to multiple users:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send broadcast notification to a topic (e.g. 'all', 'matches', 'offers')
 */
async function sendNotificationToTopic(topic, { title, body, data = {}, imageUrl = null }) {
  if (!isFirebaseReady()) return { success: false, error: "Firebase not initialized" };
  const messaging = getMessagingInstance();
  if (!messaging) return { success: false, error: "Firebase Messaging unavailable" };

  try {
    const message = {
      topic,
      notification: {
        title: String(title || "HumaariShaadi"),
        body: String(body || ""),
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: formatDataPayload(data),
    };
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error(`[NotificationService] Error sending to topic ${topic}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
  sendNotificationToUser,
  sendNotificationToUsers,
  sendNotificationToTopic,
};
