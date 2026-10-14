/**
 * ╔══════════════════════════════════════════════════╗
 * ║                  💖 BABY AI V9                  ║
 * ║          💠 HRIDOY HASAN SHANTO 💠              ║
 * ║           GODBOT / MIRAI COMPATIBLE             ║
 * ╚══════════════════════════════════════════════════╝
 *
 * Features:
 * - AI chat and keyword triggers
 * - Teach / React / Edit / Remove
 * - List and select replies to keep
 * - Reply-to-bot and delete wrong answer
 * - AutoTeach
 * - Typing indicator and reactions
 * - API timeout and error handling
 */

"use strict";

const axios = require("axios");

const API = axios.create({
  baseURL: "https://eryxenx.agi.bd/api/simsimi",
  timeout: 20000,
  headers: {
    Accept: "application/json"
  }
});

const COMMAND = "baby";
const CREDIT = "💠 HRIDOY HASAN SHANTO 💠";
const triggerLocks = new Set();
const pendingReplies = new Map();

const TRIGGERS = [
  "baby", "bot", "bby", "beby", "bbz",
  "xan", "jan", "janu", "xanu",
  "বেবি", "জান", "বট", "জানু"
];

const GREETINGS = [
  "হ্যাঁ বলো 😊💖",
  "কী হয়েছে? বলো 🥰",
  "আমি শুনছি, বলো 💗",
  "এই যে! কী বলবে? 😄",
  "বলো, কী সাহায্য লাগবে? 🌸",
  "হুম, বলো 😊"
];

function errorMessage(error) {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data.slice(0, 300);
  }

  return (
    data?.message ||
    data?.error ||
    data?.detail ||
    error?.message ||
    "Unknown error"
  );
}

function logError(where, error) {
  console.error(
    `[${COMMAND}/${where}]`,
    errorMessage(error)
  );
}

function getReplyStore() {
  return global.GoatBot?.onReply;
}

function saveReply(messageID, data) {
  const store = getReplyStore();

  if (!messageID || !store || typeof store.set !== "function") {
    return false;
  }

  store.set(messageID, {
    commandName: COMMAND,
    messageID,
    ...data
  });

  return true;
}

function sendMessage(api, text, threadID, replyToID) {
  return new Promise((resolve, reject) => {
    if (!api || typeof api.sendMessage !== "function") {
      return reject(new Error("api.sendMessage is unavailable"));
    }

    const callback = (error, info) => {
      if (error) return reject(error);
      resolve(info || {});
    };

    try {
      if (replyToID) {
        api.sendMessage(text, threadID, callback, replyToID);
      } else {
        api.sendMessage(text, threadID, callback);
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function sendSafe(api, text, event, replyToID) {
  try {
    return await sendMessage(
      api,
      text,
      event.threadID,
      replyToID || event.messageID
    );
  } catch (error) {
    logError("sendMessage", error);

    // Retry once without reply-to, if supported.
    try {
      return await sendMessage(
        api,
        text,
        event.threadID
      );
    } catch (retryError) {
      logError("sendMessage-retry", retryError);
      return null;
    }
  }
}

async function sendTyping(api, threadID, enabled) {
  try {
    if (typeof api.sendTypingIndicator === "function") {
      await api.sendTypingIndicator(threadID, enabled);
    }
  } catch (error) {
    console.error("[baby/typing]", error.message);
  }
}

async function getUserName(api, uid, usersData) {
  try {
    if (usersData && typeof usersData.getName === "function") {
      const name = await usersData.getName(uid);
      if (name) return name;
    }

    if (typeof api.getUserInfo === "function") {
      const info = await api.getUserInfo(uid);
      if (info?.[uid]?.name) return info[uid].name;
    }
  } catch (error) {
    console.error("[baby/getUserName]", error.message);
  }

  return "User";
}

function getBotUID(api) {
  try {
    if (typeof api.getCurrentUserID === "function") {
      return api.getCurrentUserID();
    }
  } catch (error) {
    console.error("[baby/getBotUID]", error.message);
  }

  return null;
}

async function reactToMessage(api, reaction, messageID) {
  if (!reaction || !messageID) return;

  try {
    if (typeof api.setMessageReaction === "function") {
      await api.setMessageReaction(
        reaction,
        messageID,
        () => {},
        true
      );
    }
  } catch (error) {
    console.error("[baby/reaction]", error.message);
  }
}

async function callAPI(method, endpoint, options = {}) {
  const response = await API.request({
    method,
    url: endpoint,
    ...options
  });

  return response.data || {};
}

function normalizeText(value) {
  return String(value || "").trim();
}

function parseParts(value, expectedParts) {
  const parts = String(value || "").split(" - ");

  if (parts.length < expectedParts) return null;

  const result = parts.slice(0, expectedParts - 1);
  result.push(parts.slice(expectedParts - 1).join(" - "));

  if (result.some(part => !part.trim())) return null;

  return result.map(part => part.trim());
}

async function deliverSimsimiResponse({
  api,
  event,
  query,
  senderName
}) {
  query = normalizeText(query);

  if (!query) return;

  await sendTyping(api, event.threadID, true);

  let data;

  try {
    data = await callAPI("GET", "/", {
      params: {
        text: query,
        senderName,
        threadID: event.threadID,
        senderID: event.senderID
      }
    });
  } finally {
    await sendTyping(api, event.threadID, false);
  }

  if (data.rateLimited) {
    return;
  }

  if (data.reaction) {
    reactToMessage(api, data.reaction, event.messageID);
  }

  if (!data.response) return;

  const info = await sendSafe(
    api,
    String(data.response),
    event,
    event.messageID
  );

  if (info?.messageID) {
    saveReply(info.messageID, {
      author: event.senderID,
      type: "simsimi",
      body: String(data.response)
    });
  }
}

async function sendGreeting(api, event) {
  const greeting =
    GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

  await sendTyping(api, event.threadID, true);

  await new Promise(resolve => setTimeout(resolve, 1000));

  await sendTyping(api, event.threadID, false);

  const info = await sendSafe(api, greeting, event);

  if (info?.messageID) {
    saveReply(info.messageID, {
      author: event.senderID,
      type: "simsimi",
      body: greeting
    });
  }
}

module.exports.config = {
  name: COMMAND,
  version: "9.0.0",
  role: 0,
  author: CREDIT,
  countTime: 0,
  category: "chat",
  shortDescription: "Baby AI chat and teaching",
  longDescription: "GodBot/Mirai compatible Simsimi-style AI",
  guide:
    "{pn} [query]\n" +
    "{pn} list\n" +
    "{pn} autoteach\n" +
    "{pn} teach [Question] - [Reply]\n" +
    "{pn} react [Question] - [Emoji]\n" +
    "{pn} edit [Question] - [OldReply] - [NewReply]\n" +
    "{pn} remove [Question] - [Reply]\n" +
    "{pn} del (reply to a bot answer)\n" +
    "{pn} msg [trigger] [-limit]",
  envConfig: {}
};

// ─────────────────────────────────────────
// COMMAND HANDLER
// ─────────────────────────────────────────

module.exports.onStart = async function ({
  api,
  event,
  args,
  usersData
}) {
  const uid = event.senderID;
  const senderName = await getUserName(api, uid, usersData);
  const raw = args.join(" ").trim();
  const action = String(args[0] || "").toLowerCase();

  try {
    if (action === "autoteach") {
      const data = await callAPI("GET", "/autoteach/stats");

      return sendSafe(
        api,
        `╭─╼ 🌟 BABY AUTOTEACH\n` +
        `├ 📅 Today: ${data.today ?? 0}\n` +
        `├ 📊 Total: ${data.total ?? 0}\n` +
        `╰─╼ 👑 ${CREDIT}`,
        event
      );
    }

    if (action === "list") {
      const data = await callAPI("GET", "/list");

      return sendSafe(
        api,
        `╭─╼ 💖 BABY AI LIST\n` +
        `├ 📝 Questions: ${data.totalQuestions ?? 0}\n` +
        `├ 📦 Replies: ${data.totalReplies ?? 0}\n` +
        `╰─╼ 👑 ${CREDIT}`,
        event
      );
    }

    if (action === "teach") {
      const content = raw.slice(args[0].length).trim();
      const parts = parseParts(content, 2);

      if (!parts) {
        return sendSafe(
          api,
          "ব্যবহার: baby teach [Question] - [Reply]",
          event
        );
      }

      const [ask, ans] = parts;

      const data = await callAPI("GET", "/teach", {
        params: {
          ask,
          ans,
          senderID: uid,
          senderName
        }
      });

      return sendSafe(
        api,
        `✅ ${data.message || "Teach request completed."}`,
        event
      );
    }

    if (action === "react") {
      const content = raw.slice(args[0].length).trim();
      const parts = parseParts(content, 2);

      if (!parts) {
        return sendSafe(
          api,
          "ব্যবহার: baby react [Question] - [Emoji]",
          event
        );
      }

      const [ask, emoji] = parts;

      const data = await callAPI("GET", "/teachReact", {
        params: { ask, emoji, senderName }
      });

      return sendSafe(
        api,
        `✅ ${data.message || "Reaction saved."}`,
        event
      );
    }

    if (action === "edit") {
      const content = raw.slice(args[0].length).trim();
      const parts = parseParts(content, 3);

      if (!parts) {
        return sendSafe(
          api,
          "ব্যবহার: baby edit [Question] - [OldReply] - [NewReply]",
          event
        );
      }

      const [ask, oldReply, newReply] = parts;

      const data = await callAPI("GET", "/edit", {
        params: {
          ask,
          old: oldReply,
          new: newReply
        }
      });

      return sendSafe(
        api,
        data.message || "Edit request completed.",
        event
      );
    }

    if (["remove", "rm"].includes(action)) {
      const content = raw.slice(args[0].length).trim();
      const parts = parseParts(content, 2);

      if (!parts) {
        return sendSafe(
          api,
          "ব্যবহার: baby remove [Question] - [Reply]",
          event
        );
      }

      const [ask, ans] = parts;

      const data = await callAPI("GET", "/delete", {
        params: { ask, ans }
      });

      return sendSafe(
        api,
        data.message || "Remove request completed.",
        event
      );
    }

    if (action === "del") {
      return sendSafe(
        api,
        "❌ বটের ভুল উত্তরের মেসেজে Reply দিয়ে `del` লিখো।",
        event
      );
    }

    if (action === "msg") {
      let trigger = args.slice(1).join(" ").trim();

      if (!trigger) {
        return sendSafe(
          api,
          "ব্যবহার: baby msg [trigger] অথবা baby msg [trigger] -20",
          event
        );
      }

      let limit = 150;
      const match = trigger.match(/\s+-(\d+)$/);

      if (match) {
        limit = Math.min(
          Math.max(parseInt(match[1], 10), 1),
          200
        );

        trigger = trigger.replace(/\s+-(\d+)$/, "").trim();
      }

      const data = await callAPI("GET", "/simsimi-list", {
        params: { ask: trigger }
      });

      const replies = Array.isArray(data.replies)
        ? data.replies
        : [];

      if (!replies.length) {
        return sendSafe(api, "❌ কোনো উত্তর পাওয়া যায়নি।", event);
      }

      const shown = replies.slice(0, limit);

      const formatted = shown
        .map((reply, index) => `${index + 1}. ${reply}`)
        .join("\n");

      const remaining = Math.max(
        replies.length - shown.length,
        0
      );

      const message =
        `📌 Trigger: ${trigger}\n` +
        `📊 Total: ${data.total ?? replies.length}\n` +
        `━━━━━━━━━━━━━━\n${formatted}\n` +
        `━━━━━━━━━━━━━━\n` +
        (remaining
          ? `⚠️ আরও ${remaining}টি উত্তর আছে।\n`
          : "") +
        `যে উত্তরগুলো রাখতে চাও, সেগুলোর নম্বর কমা দিয়ে পাঠাও। যেমন: 2, 4`;

      const info = await sendSafe(api, message, event);

      if (info?.messageID) {
        saveReply(info.messageID, {
          author: uid,
          type: "msgSelect",
          trigger
        });
      }

      return;
    }

    if (!raw) {
      return sendGreeting(api, event);
    }

    return await deliverSimsimiResponse({
      api,
      event,
      query: raw,
      senderName
    });
  } catch (error) {
    logError("onStart", error);

    return sendSafe(
      api,
      `❌ Baby AI Error: ${errorMessage(error)}`,
      event
    );
  }
};

// ─────────────────────────────────────────
// REPLY HANDLER
// ─────────────────────────────────────────

module.exports.onReply = async function ({
  api,
  event,
  Reply,
  usersData
}) {
  try {
    if (!Reply) return;

    // Only the original user may edit the selected reply list.
    if (
      Reply.type === "msgSelect" &&
      String(event.senderID) !== String(Reply.author)
    ) {
      return;
    }

    const text = normalizeText(event.body);
    if (!text) return;

    const lowered = text.toLowerCase();

    if (lowered === "del" || lowered === "!baby del") {
      const original =
        event.messageReply?.body ||
        Reply.body;

      if (!original) {
        return sendSafe(
          api,
          "❌ মূল উত্তরটি পড়া যায়নি।",
          event
        );
      }

      const data = await callAPI("GET", "/deleteByReply", {
        params: { reply: original }
      });

      return sendSafe(
        api,
        data.message || "Delete request completed.",
        event
      );
    }

    if (Reply.type === "msgSelect") {
      const numbers = [
        ...new Set(
          text
            .split(",")
            .map(value => Number(value.trim()))
            .filter(value =>
              Number.isInteger(value) &&
              value > 0
            )
        )
      ];

      if (!numbers.length) {
        return sendSafe(
          api,
          "❌ নম্বর পাঠাও, যেমন: 2, 7",
          event
        );
      }

      const data = await callAPI("POST", "/keepOnly", {
        data: {
          ask: Reply.trigger,
          keepIndexes: numbers
        }
      });

      return sendSafe(
        api,
        data.message || "Reply list updated.",
        event
      );
    }

    const senderName = await getUserName(
      api,
      event.senderID,
      usersData
    );

    return await deliverSimsimiResponse({
      api,
      event,
      query: text,
      senderName
    });
  } catch (error) {
    logError("onReply", error);

    return sendSafe(
      api,
      `❌ Reply Error: ${errorMessage(error)}`,
      event
    );
  }
};

// ─────────────────────────────────────────
// NORMAL CHAT HANDLER
// ─────────────────────────────────────────

module.exports.onChat = async function ({
  api,
  event,
  usersData
}) {
  try {
    const body = normalizeText(event.body);
    if (!body || !event.senderID) return;

    const uid = getBotUID(api);

    // Ignore messages sent by the bot itself.
    if (uid && String(event.senderID) === String(uid)) {
      return;
    }

    const text = body.toLowerCase();
    const senderName = await getUserName(
      api,
      event.senderID,
      usersData
    );

    const mentions = event.mentions || {};
    const mentioned = uid
      ? Object.prototype.hasOwnProperty.call(mentions, uid)
      : false;

    if (mentioned) {
      if (triggerLocks.has(event.threadID)) return;

      triggerLocks.add(event.threadID);

      try {
        return await sendGreeting(api, event);
      } finally {
        triggerLocks.delete(event.threadID);
      }
    }

    if (TRIGGERS.includes(text)) {
      if (triggerLocks.has(event.threadID)) return;

      triggerLocks.add(event.threadID);

      try {
        return await sendGreeting(api, event);
      } finally {
        triggerLocks.delete(event.threadID);
      }
    }

    const escaped = TRIGGERS
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(value =>
        value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      )
      .join("|");

    const prefixRegex = new RegExp(
      `^(${escaped})\\s+`,
      "i"
    );

    const match = body.match(prefixRegex);

    if (match) {
      const query = body.slice(match[0].length).trim();
      if (!query) return;

      if (triggerLocks.has(event.threadID)) return;

      triggerLocks.add(event.threadID);

      try {
        return await deliverSimsimiResponse({
          api,
          event,
          query,
          senderName
        });
      } finally {
        triggerLocks.delete(event.threadID);
      }
    }

    // AutoTeach only in groups, as in the original module.
    if (event.isGroup) {
      try {
        await callAPI("GET", "/autoteach", {
          params: {
            text: body,
            senderName,
            senderID: event.senderID,
            threadID: event.threadID
          },
          timeout: 10000
        });
      } catch (error) {
        // Keep logs short to avoid flooding Railway logs.
        console.error(
          "[baby/autoteach]",
          errorMessage(error)
        );
      }
    }
  } catch (error) {
    logError("onChat", error);
  }
};
