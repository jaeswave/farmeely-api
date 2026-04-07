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

// NEW FUNCTION with FULL DEBUGGING
const sendNotificationToAllCustomers = async (title, body) => {
  console.log(
    "========== DEBUG: Starting sendNotificationToAllCustomers ==========",
  );
  console.log("DEBUG: Title:", title);
  console.log("DEBUG: Body:", body);

  try {
    // Step 1: Fetch users with tokens
    console.log("DEBUG: Step 1 - Fetching users with FCM tokens...");
    const allUsers = await findQuery("Users", {
      fcmTokens: { $exists: true, $ne: [] },
    });

    console.log(
      "DEBUG: Found users with tokens:",
      allUsers ? allUsers.length : 0,
    );

    if (!allUsers || allUsers.length === 0) {
      console.log("DEBUG: No users with FCM tokens found");
      return { success: false, message: "No users found" };
    }

    // Step 2: Collect all tokens
    console.log("DEBUG: Step 2 - Collecting all tokens...");
    const allTokens = [];
    const tokenUserMap = new Map();

    allUsers.forEach((user) => {
      console.log(
        `DEBUG: User ${user.customer_id} has ${user.fcmTokens.length} token(s)`,
      );
      user.fcmTokens.forEach((token) => {
        allTokens.push(token);
        tokenUserMap.set(token, user.customer_id);
        console.log(
          `DEBUG: Added token for user ${user.customer_id}: ${token.substring(0, 20)}...`,
        );
      });
    });

    console.log("DEBUG: Total tokens collected:", allTokens.length);

    if (allTokens.length === 0) {
      console.log("DEBUG: No tokens found in users");
      return { success: false, message: "No tokens found" };
    }

    // Step 3: Check Firebase initialization
    console.log("DEBUG: Step 3 - Checking Firebase...");
    if (!admn || !admn.messaging) {
      console.error("DEBUG: Firebase not initialized properly!");
      return { success: false, message: "Firebase not initialized" };
    }
    console.log("DEBUG: Firebase is available");

    // Step 4: Create batches (Firebase limit is 500)
    console.log("DEBUG: Step 4 - Creating batches...");
    const batchSize = 500;
    const tokenBatches = [];

    for (let i = 0; i < allTokens.length; i += batchSize) {
      tokenBatches.push(allTokens.slice(i, i + batchSize));
    }

    console.log(`DEBUG: Created ${tokenBatches.length} batch(es)`);
    console.log(
      `DEBUG: Sending to ${allTokens.length} devices across ${tokenBatches.length} batches`,
    );

    let totalSuccess = 0;
    let totalFailure = 0;

    // Step 5: Send each batch
    for (let batchIndex = 0; batchIndex < tokenBatches.length; batchIndex++) {
      const batchTokens = tokenBatches[batchIndex];
      console.log(
        `\n========== DEBUG: Processing Batch ${batchIndex + 1}/${tokenBatches.length} ==========`,
      );
      console.log(`DEBUG: Batch size: ${batchTokens.length} tokens`);
      console.log(
        `DEBUG: Sample token: ${batchTokens[0]?.substring(0, 30)}...`,
      );

      const message = {
        notification: {
          title,
          body,
        },
        tokens: batchTokens,
      };

      try {
        console.log(
          "DEBUG: Calling admn.messaging().sendEachForMulticast()...",
        );
        const response = await admn.messaging().sendEachForMulticast(message);

        console.log("DEBUG: Response received!");
        console.log("DEBUG: Response.successCount:", response.successCount);
        console.log("DEBUG: Response.failureCount:", response.failureCount);
        console.log("DEBUG: Full response:", JSON.stringify(response, null, 2));

        // Update totals
        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

        // Remove invalid tokens
        console.log("DEBUG: Checking for invalid tokens...");
        let invalidTokensCount = 0;

        for (let index = 0; index < response.responses.length; index++) {
          const resp = response.responses[index];
          if (!resp.success) {
            invalidTokensCount++;
            const badToken = batchTokens[index];
            const customerId = tokenUserMap.get(badToken);

            console.log(`DEBUG: Invalid token found for user ${customerId}`);
            console.log(
              `DEBUG: Error: ${resp.error ? resp.error.message : "Unknown error"}`,
            );

            if (customerId) {
              await updateOne(
                "Users",
                { customer_id: customerId },
                { $pull: { fcmTokens: badToken } },
              );
              console.log(
                `DEBUG: Removed invalid token for user: ${customerId}`,
              );
            }
          }
        }

        console.log(
          `DEBUG: Removed ${invalidTokensCount} invalid tokens from this batch`,
        );
      } catch (error) {
        console.error(`DEBUG: ERROR sending batch ${batchIndex + 1}:`, error);
        console.error("DEBUG: Error details:", error.message);
        console.error("DEBUG: Error stack:", error.stack);
        // If batch fails completely, all tokens in this batch are considered failed
        totalFailure += batchTokens.length;
      }
    }

    console.log("\n========== DEBUG: FINAL RESULTS ==========");
    console.log("DEBUG: Total devices:", allTokens.length);
    console.log("DEBUG: Total success:", totalSuccess);
    console.log("DEBUG: Total failure:", totalFailure);
    console.log("==========================================\n");

    return {
      success: true,
      totalDevices: allTokens.length,
      totalSuccess,
      totalFailure,
    };
  } catch (error) {
    console.error(
      "DEBUG: CATASTROPHIC ERROR in sendNotificationToAllCustomers:",
      error,
    );
    console.error("DEBUG: Error message:", error.message);
    console.error("DEBUG: Error stack:", error.stack);
    throw error;
  }
};

module.exports = {
  sendNotificationToAllCustomers,
};
