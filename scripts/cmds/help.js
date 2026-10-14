
/**
 * ╔══════════════════════════════════════════╗
 * ║          💎 HELP MENU V7 PREMIUM        ║
 * ║      💠 HRIDOY HASAN SHANTO 💠          ║
 * ║             GoatBot System              ║
 * ╚══════════════════════════════════════════╝
 */

const fs = require("fs-extra");
const path = require("path");
const https = require("https");

const CREDIT = "💠 HRIDOY HASAN SHANTO 💠";

const GIF_URLS = [
  "https://i.imgur.com/Xw6JTfn.gif",
  "https://i.imgur.com/mW0yjZb.gif",
  "https://i.imgur.com/KQBcxOV.gif"
];

const CACHE_DIR = path.join(__dirname, "cache");

module.exports = {
  config: {
    name: "help",
    aliases: ["menu", "commands"],
    version: "7.0.0",
    author: CREDIT,
    countDown: 3,
    role: 0,
    shortDescription: "Premium command menu",
    longDescription: "Show all commands or detailed command information",
    category: "system",
    guide: "{pn}help [command name]"
  },

  onStart: async function ({ message, args, prefix }) {
    try {
      const allCommands = global.GoatBot?.commands;

      if (!allCommands || typeof allCommands.values !== "function") {
        return message.reply(
          "❌ Command database is not available.\n" +
          "🔄 Please restart the bot and try again."
        );
      }

      // Premium font
      const fancyFont = (text) => {
        const normal =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        const fancy =
          "𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙" +
          "𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳";

        return String(text).replace(/[A-Za-z]/g, char => {
          const index = normal.indexOf(char);
          return index === -1 ? char : fancy[index];
        });
      };

      const categoryFont = text =>
        String(text).toUpperCase().replace(/[A-Z]/g, char =>
          "𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙"[
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(char)
          ]
        );

      const getConfig = command => command?.config || {};

      const findCommand = name => {
        const searchName = String(name).toLowerCase();

        for (const command of allCommands.values()) {
          const config = getConfig(command);

          if (
            String(config.name || "").toLowerCase() === searchName ||
            (Array.isArray(config.aliases) &&
              config.aliases.some(
                alias => String(alias).toLowerCase() === searchName
              ))
          ) {
            return command;
          }
        }

        return null;
      };

      // Detailed command information
      if (args && args.length > 0) {
        const searchName = args[0].toLowerCase();
        const command = findCommand(searchName);

        if (!command) {
          return message.reply(
            `╭━━━〔 ❌ COMMAND NOT FOUND 〕━━━╮\n` +
            `┃ 🔎 Name: ${args[0]}\n` +
            `┃ 💡 Try: ${prefix}help\n` +
            `╰━━━━━━━━━━━━━━━━━━━━╯`
          );
        }

        const config = getConfig(command);
        const commandName = config.name || searchName;
        const aliases = Array.isArray(config.aliases)
          ? config.aliases.join(", ")
          : "None";

        const guide = typeof config.guide === "string"
          ? config.guide.replace(/\{pn\}/g, `${prefix}${commandName}`)
          : `${prefix}${commandName}`;

        const info =
`╭━━━〔 💎 ${fancyFont("PREMIUM CMD INFO")} 〕━━━╮
┃
┃ 💠 Name: ${commandName}
┃ 🔗 Aliases: ${aliases}
┃ 📂 Category: ${config.category || "Others"}
┃ 🏷️ Version: ${config.version || "1.0"}
┃ 👑 Author: ${config.author || CREDIT}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 📖 Description:
┃ ${config.longDescription ||
    config.shortDescription ||
    "No description available"}
┃
┃ ⚡ Usage:
┃ ${guide}
┃
╰━━━〔 ${fancyFont("HRIDOY BOT")} 〕━━━╯`;

        return message.reply(info);
      }

      // Group commands by category
      const categories = new Map();

      for (const command of allCommands.values()) {
        const config = getConfig(command);
        const name = config.name;

        if (!name) continue;

        const category = String(config.category || "Others")
          .trim()
          .toLowerCase();

        if (!categories.has(category)) {
          categories.set(category, []);
        }

        categories.get(category).push(name);
      }

      const categoryEntries = [...categories.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]));

      let msg =
`╭━━━〔 💎 ${fancyFont("PREMIUM MENU")} 〕━━━╮
┃
┃ 👑 Owner: ${CREDIT}
┃ ⚙️ Bot: GoatBot
┃ 🔰 Prefix: ${prefix}
┃ 📚 Total Commands: ${allCommands.size}
┃ 📂 Categories: ${categories.size}
┃
┣━━━━━━━━━━━━━━━━━━━━`;

      for (const [category, commands] of categoryEntries) {
        commands.sort((a, b) => a.localeCompare(b));

        msg += `\n\n╭─〔 ${categoryFont(category)} 〕`;

        for (const commandName of commands) {
          msg += `\n┃ ✦ ${fancyFont(commandName)}`;
        }

        msg += `\n╰━━━━━━━━━━━━━━━━━━━━`;
      }

      msg +=
`\n\n╭━━━〔 💡 ${fancyFont("HOW TO USE")} 〕━━━╮
┃
┃ 🔎 ${prefix}help
┃    ➤ Show all commands
┃
┃ 📖 ${prefix}help command
┃    ➤ View command details
┃
┃ 💠 ${prefix}menu
┃    ➤ Open this menu
┃
╰━━━━━━━━━━━━━━━━━━━━
   ${CREDIT}`;

      // Choose a random GIF
      const randomGifURL =
        GIF_URLS[Math.floor(Math.random() * GIF_URLS.length)];

      try {
        await fs.ensureDir(CACHE_DIR);

        const gifName = path.basename(
          new URL(randomGifURL).pathname
        );
        const gifPath = path.join(CACHE_DIR, gifName);

        // Download if missing or empty
        if (
          !(await fs.pathExists(gifPath)) ||
          (await fs.stat(gifPath)).size === 0
        ) {
          await downloadGif(randomGifURL, gifPath);
        }

        // Send menu with GIF
        return await message.reply({
          body: msg,
          attachment: fs.createReadStream(gifPath)
        });
      } catch (gifError) {
        // GIF failure must not prevent the menu
        console.error(
          "[HELP V7] GIF unavailable:",
          gifError.message
        );

        return message.reply(msg);
      }
    } catch (error) {
      console.error("[HELP V7] Error:", error);

      return message.reply(
        "❌ Help menu could not be loaded.\n" +
        "🔄 Please try again later."
      );
    }
  }
};

// Download GIF safely, including HTTPS redirects
function downloadGif(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      return reject(new Error("Too many redirects"));
    }

    const tempPath = `${destination}.tmp`;
    const file = fs.createWriteStream(tempPath);

    const cleanup = error => {
      file.destroy();

      fs.unlink(tempPath, () => {
        reject(error);
      });
    };

    const request = https.get(url, response => {
      // Follow redirects
      if (
        [301, 302, 303, 307, 308].includes(response.statusCode)
      ) {
        const location = response.headers.location;
        response.resume();

        file.destroy();

        fs.unlink(tempPath, () => {
          if (!location) {
            return reject(new Error("Redirect URL missing"));
          }

          const nextURL = new URL(location, url);

          if (nextURL.protocol !== "https:") {
            return reject(new Error("Only HTTPS URLs are allowed"));
          }

          downloadGif(nextURL.href, destination, redirects + 1)
            .then(resolve)
            .catch(reject);
        });

        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        return cleanup(
          new Error(`HTTP status ${response.statusCode}`)
        );
      }

      const contentType = response.headers["content-type"] || "";

      if (!contentType.toLowerCase().includes("image/gif")) {
        response.resume();
        return cleanup(new Error("Response is not a GIF"));
      }

      response.pipe(file);

      file.on("finish", async () => {
        file.close(async error => {
          if (error) {
            return cleanup(error);
          }

          try {
            const stats = await fs.stat(tempPath);

            if (stats.size === 0) {
              throw new Error("Downloaded GIF is empty");
            }

            await fs.move(tempPath, destination, {
              overwrite: true
            });

            resolve(destination);
          } catch (err) {
            fs.unlink(tempPath, () => reject(err));
          }
        });
      });

      file.on("error", cleanup);
      response.on("error", cleanup);
    });

    request.setTimeout(20000, () => {
      request.destroy(new Error("GIF download timed out"));
    });

    request.on("error", cleanup);
  });
}
