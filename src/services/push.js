const admn = require("../firebase");
const { findQuery, updateOne } = require("../repository");

const sendNotificationToUser = async (customer_id, title, body) => {
  const [user] = await findQuery("Users", { customer_id });

  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
    return;
  }

  const message = {
    notification: {
      title,
      body,
    },
    tokens: user.fcmTokens,
  };

  try {
    const response = await admn.messaging().sendEachForMulticast(message);

    // Remove invalid tokens automatically
    response.responses.forEach(async (resp, index) => {
      if (!resp.success) {
        const badToken = user.fcmTokens[index];

        await updateOne(
          "Users",
          { customer_id },
          { $pull: { fcmTokens: badToken } },
        );
      }
    });
  } catch (error) {
    console.error("Push notification error:", error);
  }
};

module.exports = { sendNotificationToUser };
