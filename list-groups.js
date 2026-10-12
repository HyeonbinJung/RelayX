require("dotenv").config();

const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

if (!process.env.BROWSER_EXECUTABLE_PATH?.trim()) {
  console.error("❌ .env의 BROWSER_EXECUTABLE_PATH가 비어 있습니다.");
  process.exit(1);
}

const wa = new Client({
  authStrategy: new LocalAuth({
    dataPath: process.env.WHATSAPP_SESSION_DIR || ".wwebjs_auth",
  }),
  puppeteer: {
    headless: false,
    executablePath: process.env.BROWSER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

const seenGroups = new Set();

wa.on("qr", (qr) => {
  console.log("\n📱 WhatsApp 앱 → 설정 → 연결된 기기 → 기기 연결에서 아래 QR을 스캔하세요.\n");
  qrcode.generate(qr, { small: true });
});

wa.on("authenticated", () => {
  console.log("🔐 WhatsApp 인증 완료");
});

wa.on("ready", () => {
  console.log("\n✅ WhatsApp 연결 완료");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("ID를 알고 싶은 WhatsApp 그룹에 아무 메시지나 보내세요.");
  console.log("최대 10개 그룹을 차례대로 테스트하면 각 @g.us ID가 표시됩니다.");
  console.log("종료: Ctrl + C");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
});

wa.on("message_create", (msg) => {
  const groupId = [msg.from, msg.to].find(
    (id) => id && id.endsWith("@g.us")
  );

  if (!groupId) return;

  const isNew = !seenGroups.has(groupId);
  seenGroups.add(groupId);

  console.log("\n===============================================");
  console.log(isNew ? "🆕 WHATSAPP GROUP" : "📩 WHATSAPP GROUP");
  console.log("GROUP ID :", groupId);
  console.log("MESSAGE  :", msg.body || "(첨부파일/빈 메시지)");
  console.log(`FOUND     : ${seenGroups.size} unique group(s)`);
  console.log("===============================================\n");
});

wa.on("auth_failure", (msg) => {
  console.error("❌ WhatsApp 인증 실패:", msg);
});

wa.initialize();
