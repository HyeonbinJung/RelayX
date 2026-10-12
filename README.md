<div align="center">

# 🔁 RelayX

**Real-time cross-platform messaging relay — WhatsApp ↔ Discord**

<sub>One bot, up to ten two-way bridges between WhatsApp groups and Discord channels — text, sender names and attachments included.</sub>

<img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" height="26">
<img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" height="26">
<img src="https://img.shields.io/badge/whatsapp--web.js-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" height="26">
<img src="https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white" height="26">
<img src="https://img.shields.io/badge/Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" height="26">

<sub><b>Type</b> Messaging bridge &nbsp;·&nbsp; <b>Pairs</b> up to 10 &nbsp;·&nbsp; <b>Direction</b> two-way &nbsp;·&nbsp; <b>Runs on</b> Windows · macOS · Linux</sub>

[Overview](#-overview) · [Features](#-key-features) · [How It Works](#%EF%B8%8F-how-it-works) · [Getting Started](#-getting-started) · [Configuration](#%EF%B8%8F-configuration) · [Troubleshooting](#-troubleshooting) · [Structure](#%EF%B8%8F-project-structure) · [Notes](#-notes--limitations)

</div>

---

## 📌 Overview

RelayX keeps a WhatsApp group and a Discord channel in sync. A message posted on one side appears on the other within seconds, prefixed with the sender's name, and files travel with it. A single WhatsApp account and a single Discord bot can serve **up to ten independent pairs** — for example one pair per team or project.

| | |
|---|---|
| **WhatsApp → Discord** | Group messages are posted to the paired channel as **`Sender`** + text, with images, video, audio and documents attached |
| **Discord → WhatsApp** | Channel messages are sent to the paired group as *`Sender`* + text; attachments are forwarded as media |
| **Loop protection** | The bot ignores its own WhatsApp messages and every Discord bot message, so nothing echoes back and forth |

> **Heads-up.** WhatsApp support uses [`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js), which automates WhatsApp Web — it is not the official WhatsApp Business API. Use a **dedicated WhatsApp number** for the bot.

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔀 **Up to 10 pairs** | Each `PAIR_01` … `PAIR_10` slot links one WhatsApp group to one Discord channel; empty slots are skipped |
| ↔️ **Two-way relay** | Text in both directions, with the sender's display name on every message |
| 📎 **Attachments** | WhatsApp media is uploaded to Discord; Discord files are re-sent to WhatsApp (falls back to a link if a file cannot be sent) |
| ✂️ **Long messages** | Text over Discord's limit is split at line breaks and sent as consecutive messages |
| 🛡️ **Config checks** | Half-filled pairs are disabled with a warning; the same group or channel used twice stops the bot with a clear error |
| 🔍 **Group-ID finder** | `npm run groups` prints the `@g.us` ID of any group you message — no need to dig through WhatsApp internals |
| 💾 **Saved session** | Scan the QR code once; the login is stored locally and reused on every restart |

## ⚙️ How It Works

```text
   WhatsApp                     RelayX (bridge.js)                 Discord
 ┌─────────────┐   whatsapp-web.js   ┌──────────────┐   discord.js   ┌──────────────┐
 │  Group  A   │ ◄─────────────────► │  PAIR_01     │ ◄────────────► │  #channel-a  │
 │  Group  B   │ ◄─────────────────► │  PAIR_02     │ ◄────────────► │  #channel-b  │
 │     …       │                     │     …        │                │      …       │
 │  Group  J   │ ◄─────────────────► │  PAIR_10     │ ◄────────────► │  #channel-j  │
 └─────────────┘  (Chrome/Puppeteer) └──────────────┘   (bot token)  └──────────────┘
```

1. **Startup** — `bridge.js` reads the ten pair slots from `.env`, validates them and builds lookup tables in both directions.
2. **Discord** — the bot logs in with `DISCORD_TOKEN` and listens for new messages in the paired channels.
3. **WhatsApp** — a Chrome window opens WhatsApp Web. The first time, you link it by scanning a QR code; afterwards the saved session is reused.
4. **Relay** — every new group message is matched to its pair and forwarded; messages from unregistered groups are ignored (and logged).

## 🧰 Tech Stack

| Layer | Tools |
|---|---|
| Runtime | Node.js 18+ (uses the built-in `fetch`) |
| Discord | `discord.js` v14 — Guilds, GuildMessages and MessageContent intents |
| WhatsApp | `whatsapp-web.js` with `LocalAuth` session storage, driven by Puppeteer and your installed Chrome |
| Config | `dotenv` — everything lives in `.env` |
| Login | `qrcode-terminal` — prints the WhatsApp QR code in the terminal |

## 🚀 Getting Started

### 1. Requirements

- **Node.js 18 or newer** — check with `node -v`
- **Google Chrome** (or Chromium) installed on the machine
- A **Discord server** where you can add a bot
- A **WhatsApp account** for the bot (a separate number is strongly recommended), with the phone online during setup

### 2. Install

```bash
git clone https://github.com/HyeonbinJung/RelayX.git
cd RelayX
npm install          # Windows: double-click install.bat
```

> `.puppeteerrc.cjs` tells Puppeteer **not** to download its own browser — RelayX uses the Chrome you already have.

### 3. Create the Discord bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **Bot** tab → **Reset Token** → copy the token. This is your `DISCORD_TOKEN` (keep it secret).
3. Same tab → **Privileged Gateway Intents** → turn on **Message Content Intent** → Save.
4. **OAuth2 → URL Generator** → scope **`bot`** → permissions **View Channels**, **Send Messages**, **Read Message History**, **Attach Files** → open the generated URL and add the bot to your server.
5. In Discord, enable **User Settings → Advanced → Developer Mode**, then right-click each channel you want to bridge → **Copy Channel ID**.

### 4. Create `.env`

```bash
cp .env.example .env     # Windows: copy .env.example .env
```

Fill in `DISCORD_TOKEN` and `BROWSER_EXECUTABLE_PATH` (the path to `chrome.exe` / Chrome), and the Discord channel ID of each pair. Leave the WhatsApp IDs empty for now.

### 5. Link WhatsApp and find group IDs

```bash
npm run groups           # Windows: find-groups.bat
```

1. A Chrome window opens and a **QR code** appears in the terminal.
2. On the bot's phone: **WhatsApp → Settings → Linked devices → Link a device** → scan the code.
3. When the terminal shows `✅ WhatsApp 연결 완료`, send any message in each group you want to bridge. The terminal prints:

```text
===============================================
🆕 WHATSAPP GROUP
GROUP ID : 120363XXXXXXXXXXXX@g.us
MESSAGE  : test
===============================================
```

4. Copy each `GROUP ID` into the matching `PAIR_XX_WHATSAPP_GROUP_ID`, then press **Ctrl + C**.

The login is saved in `.wwebjs_auth/`, so you will not need to scan again.

### 6. Run the bridge

```bash
npm start                # Windows: start.bat
```

A healthy start looks like this:

```text
🚀 MIDAS Bridge 시작 — 활성 매핑 2/10
✅ Discord Bot Ready: RelayX#1234
🔐 WhatsApp 인증 완료
✅ WhatsApp Bot Ready
🔗 활성 매핑: 2/10
   [01] General: 120363…@g.us ↔ Discord 1234567890…
   [02] Design:  120363…@g.us ↔ Discord 9876543210…
```

Send a test message on each side. Every relayed message is logged, e.g. `✅ WA → Discord [General] | Alice: hello`.

### 7. Keep it running (optional)

- Once the session is saved you can set `PUPPETEER_HEADLESS=true` to hide the Chrome window.
- To run in the background and restart on crashes, use a process manager such as [pm2](https://pm2.keymetrics.io/): `npm i -g pm2 && pm2 start bridge.js --name relayx`.
- The bot only relays while it is running, and the WhatsApp phone needs to stay connected to the internet.

## 🛠️ Configuration

All settings live in `.env` (template: [`.env.example`](.env.example)).

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from the Discord Developer Portal |
| `BROWSER_EXECUTABLE_PATH` | ✅ | Path to Chrome / Chromium used by WhatsApp Web |
| `PAIR_XX_NAME` | — | Label shown in the logs (`XX` = `01`…`10`) |
| `PAIR_XX_DISCORD_CHANNEL_ID` | per pair | Discord text-channel ID |
| `PAIR_XX_WHATSAPP_GROUP_ID` | per pair | WhatsApp group ID ending in `@g.us` |
| `WHATSAPP_SESSION_DIR` | — | Where the WhatsApp session is stored (default `.wwebjs_auth`) |
| `PUPPETEER_HEADLESS` | — | `false` shows the Chrome window (default), `true` hides it |

**Pair rules**

- A pair is **active** only when both IDs are filled in; a pair with only one ID is disabled with a warning.
- Each WhatsApp group and each Discord channel may appear in **one** pair only — duplicates stop the bot.
- At least one complete pair is required to start.
- Add or change pairs by editing `.env` and restarting the bridge.

```env
PAIR_03_NAME=Research
PAIR_03_DISCORD_CHANNEL_ID=123456789012345678
PAIR_03_WHATSAPP_GROUP_ID=120363XXXXXXXXXXXX@g.us
```

## 🧯 Troubleshooting

| Symptom | Fix |
|---|---|
| `❌ .env에 다음 값을 채워주세요: …` | `DISCORD_TOKEN` or `BROWSER_EXECUTABLE_PATH` is empty in `.env` |
| `❌ 활성화된 매핑이 없습니다` | No pair has both a Discord channel ID and a WhatsApp group ID |
| `⚠️ … 매핑이 불완전해서 비활성화합니다` | That pair is missing one of its two IDs |
| Discord messages are empty / not relayed | Turn on **Message Content Intent** for the bot and check its channel permissions |
| `Discord 텍스트 채널을 찾을 수 없습니다` | Wrong channel ID, or the bot is not in that server / cannot see the channel |
| `ℹ️ 미등록 WhatsApp 그룹 메시지 무시` | The group is not in any pair — add its ID to `.env` (harmless otherwise) |
| QR code keeps reappearing / `auth_failure` | Stop the bot, delete the `.wwebjs_auth` folder, run `npm run groups` and scan again |
| Chrome fails to launch | Check `BROWSER_EXECUTABLE_PATH`; on Linux servers install Chrome and its system libraries |
| `npm install` tries to download Chrome | Run `install.bat` (sets `PUPPETEER_SKIP_DOWNLOAD=true`) or keep `.puppeteerrc.cjs` in the folder |

## 🗂️ Project Structure

```text
RelayX
├── bridge.js           main bridge — loads pairs, relays both directions
├── list-groups.js      prints WhatsApp group IDs (npm run groups)
├── .env.example        configuration template → copy to .env
├── .puppeteerrc.cjs    skips Puppeteer's browser download
├── package.json        scripts: start, groups
├── install.bat · start.bat · find-groups.bat   Windows shortcuts
└── .gitignore          keeps .env, sessions and node_modules out of git
```

## 📝 Notes & Limitations

- **Unofficial WhatsApp client.** WhatsApp Web automation can break when WhatsApp changes its web app, and automated accounts can be restricted — use a dedicated number and update `whatsapp-web.js` if relaying stops.
- **Keep secrets local.** `.env` (bot token) and `.wwebjs_auth/` (a logged-in WhatsApp session) are git-ignored. Anyone with the session folder can use that WhatsApp account — never share or commit it.
- **New messages only.** History from before the bot started is not copied; edits, deletions and reactions are not synced.
- **Discord bots are skipped.** Messages from any Discord bot are ignored to prevent loops, so other bots' posts will not reach WhatsApp.
- **Attachment limits.** Each platform's own file-size limits apply; a Discord file that cannot be sent to WhatsApp is shared as a link instead.

---

<div align="center"><sub>Built by <a href="https://github.com/HyeonbinJung">Hyeonbin Jung</a></sub></div>
