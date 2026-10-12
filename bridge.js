require("dotenv").config();

const qrcode = require("qrcode-terminal");
const { Client: WAClient, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const {
  Client: DiscordClient,
  GatewayIntentBits,
  AttachmentBuilder,
} = require("discord.js");

// ======================================================
// BASE ENV CHECK
// ======================================================

const REQUIRED_BASE_ENV = [
  "DISCORD_TOKEN",
  "BROWSER_EXECUTABLE_PATH",
];

const missingBase = REQUIRED_BASE_ENV.filter(
  (key) => !process.env[key]?.trim()
);

if (missingBase.length) {
  console.error(`❌ .env에 다음 값을 채워주세요: ${missingBase.join(", ")}`);
  process.exit(1);
}

// ======================================================
// LOAD UP TO 10 WHATSAPP ↔ DISCORD PAIRS
// ======================================================

const GROUP_PAIRS = [];

for (let i = 1; i <= 10; i++) {
  const n = String(i).padStart(2, "0");

  const name = (process.env[`PAIR_${n}_NAME`] || `PAIR-${n}`).trim();
  const wa = (process.env[`PAIR_${n}_WHATSAPP_GROUP_ID`] || "").trim();
  const discord = (process.env[`PAIR_${n}_DISCORD_CHANNEL_ID`] || "").trim();

  // 둘 다 비어 있으면 미사용 슬롯
  if (!wa && !discord) continue;

  // 하나만 입력된 경우 실수로 간주하고 해당 슬롯은 건너뜀
  if (!wa || !discord) {
    console.warn(
      `⚠️ ${name} (${n}) 매핑이 불완전해서 비활성화합니다. ` +
      `WhatsApp ID와 Discord Channel ID를 둘 다 입력하세요.`
    );
    continue;
  }

  GROUP_PAIRS.push({ slot: n, name, wa, discord });
}

if (!GROUP_PAIRS.length) {
  console.error("❌ 활성화된 매핑이 없습니다. .env의 PAIR_01 ~ PAIR_10 중 최소 1개를 채워주세요.");
  process.exit(1);
}

// 중복 ID 방지
const duplicateWa = GROUP_PAIRS.find(
  (pair, index, arr) => arr.findIndex((p) => p.wa === pair.wa) !== index
);
const duplicateDiscord = GROUP_PAIRS.find(
  (pair, index, arr) => arr.findIndex((p) => p.discord === pair.discord) !== index
);

if (duplicateWa) {
  console.error(`❌ 같은 WhatsApp 그룹 ID가 여러 매핑에 사용되었습니다: ${duplicateWa.wa}`);
  process.exit(1);
}
if (duplicateDiscord) {
  console.error(`❌ 같은 Discord 채널 ID가 여러 매핑에 사용되었습니다: ${duplicateDiscord.discord}`);
  process.exit(1);
}

const WA_TO_DISCORD = Object.fromEntries(
  GROUP_PAIRS.map((pair) => [pair.wa, pair.discord])
);

const DISCORD_TO_WA = Object.fromEntries(
  GROUP_PAIRS.map((pair) => [pair.discord, pair.wa])
);

const PAIR_BY_WA = Object.fromEntries(
  GROUP_PAIRS.map((pair) => [pair.wa, pair])
);

const PAIR_BY_DISCORD = Object.fromEntries(
  GROUP_PAIRS.map((pair) => [pair.discord, pair])
);

// ======================================================
// CLIENTS
// ======================================================

const wa = new WAClient({
  authStrategy: new LocalAuth({
    dataPath: process.env.WHATSAPP_SESSION_DIR || ".wwebjs_auth",
  }),
  puppeteer: {
    headless: (process.env.PUPPETEER_HEADLESS || "false").toLowerCase() === "true",
    executablePath: process.env.BROWSER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

const discord = new DiscordClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ======================================================
// HELPERS
// ======================================================

function safeName(name) {
  return (name || "Unknown").replace(/[`*_~|>]/g, "\\$&");
}

function splitText(text, max = 1900) {
  if (!text) return [""];

  const chunks = [];
  let remaining = text;

  while (remaining.length > max) {
    let cut = remaining.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = max;

    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\n/, "");
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

async function getWhatsAppSenderName(msg) {
  // 최신 WA Web에서 contact API가 불안정할 때도 notifyName 우선 사용
  const notifyName = msg._data?.notifyName;
  if (notifyName) return notifyName;

  if (msg.author) {
    try {
      const contact = await wa.getContactById(msg.author);
      return (
        contact.pushname ||
        contact.name ||
        contact.shortName ||
        contact.number ||
        msg.author
      );
    } catch {
      return msg.author;
    }
  }

  return "Unknown";
}

// ======================================================
// WHATSAPP EVENTS
// ======================================================

wa.on("qr", (qr) => {
  console.log("\n📱 WhatsApp 앱 → 설정 → 연결된 기기 → 기기 연결에서 QR을 스캔하세요.\n");
  qrcode.generate(qr, { small: true });
});

wa.on("authenticated", () => {
  console.log("🔐 WhatsApp 인증 완료");
});

wa.on("ready", () => {
  console.log("✅ WhatsApp Bot Ready");
  console.log(`🔗 활성 매핑: ${GROUP_PAIRS.length}/10`);

  GROUP_PAIRS.forEach((pair) => {
    console.log(
      `   [${pair.slot}] ${pair.name}: ${pair.wa} ↔ Discord ${pair.discord}`
    );
  });
});

wa.on("auth_failure", (msg) => {
  console.error("❌ WhatsApp 인증 실패:", msg);
});

wa.on("disconnected", (reason) => {
  console.error("⚠️ WhatsApp 연결 종료:", reason);
});

// ======================================================
// WHATSAPP → DISCORD
// ======================================================
// message_create 사용: 현재 WA Web에서 수신 메시지 감지가 더 안정적이며,
// Discord → WA로 봇 자신이 보낸 메시지는 msg.fromMe로 루프 차단.

wa.on("message_create", async (msg) => {
  if (msg.fromMe) return;

  const groupId = [msg.from, msg.to].find(
    (id) => id && id.endsWith("@g.us")
  );

  if (!groupId) return;

  const discordChannelId = WA_TO_DISCORD[groupId];

  if (!discordChannelId) {
    // 등록되지 않은 그룹은 조용히 무시하되 디버깅용 로그만 남김
    console.log(`ℹ️ 미등록 WhatsApp 그룹 메시지 무시: ${groupId}`);
    return;
  }

  const pair = PAIR_BY_WA[groupId];

  try {
    const channel = await discord.channels.fetch(discordChannelId);

    if (!channel || !channel.isTextBased()) {
      console.error(
        `❌ [${pair?.name || groupId}] Discord 텍스트 채널을 찾을 수 없습니다: ${discordChannelId}`
      );
      return;
    }

    const senderName = safeName(await getWhatsAppSenderName(msg));
    const prefix = `**${senderName}**`;
    let content = msg.body || "";

    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();

        if (media?.data) {
          const buffer = Buffer.from(media.data, "base64");
          const mime = media.mimetype || "application/octet-stream";
          const ext = mime.split("/")[1]?.split(";")[0] || "bin";
          const filename = media.filename || `whatsapp-${Date.now()}.${ext}`;
          const attachment = new AttachmentBuilder(buffer, { name: filename });

          await channel.send({
            content: `${prefix}\n${content || "📎 첨부파일"}`,
            files: [attachment],
          });

          console.log(
            `✅ WA → Discord [${pair?.name || groupId}] [media] | ${senderName}`
          );
          return;
        }
      } catch (mediaErr) {
        console.error(
          `❌ WA media → Discord [${pair?.name || groupId}] Error:`,
          mediaErr
        );
        content = `${content}\n[첨부파일 전달 실패]`;
      }
    }

    const chunks = splitText(content || "(메시지 내용 없음)");

    for (let i = 0; i < chunks.length; i++) {
      const header = i === 0 ? prefix : `${prefix} *(계속)*`;
      await channel.send(`${header}\n${chunks[i]}`);
    }

    console.log(
      `✅ WA → Discord [${pair?.name || groupId}] | ${senderName}: ${(content || "").slice(0, 100)}`
    );
  } catch (err) {
    console.error(
      `❌ WA → Discord [${pair?.name || groupId}] Error:`,
      err
    );
  }
});

// ======================================================
// DISCORD EVENTS
// ======================================================

discord.once("ready", () => {
  console.log(`✅ Discord Bot Ready: ${discord.user.tag}`);
});

// ======================================================
// DISCORD → WHATSAPP
// ======================================================

discord.on("messageCreate", async (message) => {
  // Discord의 모든 봇 메시지는 기본적으로 제외해 봇 간 무한 루프 방지
  if (message.author.bot) return;

  const whatsappGroupId = DISCORD_TO_WA[message.channel.id];
  if (!whatsappGroupId) return;

  const pair = PAIR_BY_DISCORD[message.channel.id];

  try {
    const senderName =
      message.member?.displayName ||
      message.author.globalName ||
      message.author.username;

    const prefix = `*${senderName}*`;
    const content = message.content?.trim() || "";

    if (content) {
      await wa.sendMessage(whatsappGroupId, `${prefix}\n${content}`);
    }

    for (const attachment of message.attachments.values()) {
      try {
        const response = await fetch(attachment.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        const media = new MessageMedia(
          attachment.contentType || "application/octet-stream",
          base64,
          attachment.name || `discord-${Date.now()}`
        );

        await wa.sendMessage(whatsappGroupId, media, {
          caption: content ? `${prefix}\n${content}` : prefix,
        });
      } catch (attachmentErr) {
        console.error(
          `❌ Discord attachment → WA [${pair?.name || whatsappGroupId}] Error:`,
          attachmentErr
        );

        await wa.sendMessage(
          whatsappGroupId,
          `${prefix}\n📎 첨부파일: ${attachment.url}`
        );
      }
    }

    if (content || message.attachments.size > 0) {
      console.log(
        `✅ Discord → WA [${pair?.name || whatsappGroupId}] | ${senderName}: ${(content || "[attachment]").slice(0, 100)}`
      );
    }
  } catch (err) {
    console.error(
      `❌ Discord → WA [${pair?.name || whatsappGroupId}] Error:`,
      err
    );
  }
});

// ======================================================
// START
// ======================================================

async function start() {
  try {
    console.log(`🚀 MIDAS Bridge 시작 — 활성 매핑 ${GROUP_PAIRS.length}/10`);
    await discord.login(process.env.DISCORD_TOKEN.trim());
    await wa.initialize();
  } catch (err) {
    console.error("❌ 시작 실패:", err);
    process.exit(1);
  }
}

start();
