const os = require("os");
const fs = require("fs-extra");
const path = require("path");

const effectsPath = path.join(__dirname, "cache", "effects.json");
const loadedAt = Date.now();


const W = 900;
const H = 600;

const IMG_FX = ["crack", "neon", "matrix", "fire", "ice", "sunset", "glitch"];

/* ---------- helpers ---------- */

function rngFrom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtUptime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${d ? d + "d " : ""}${h}h ${m}m ${s}s`;
}

function gradient(ctx, stops, vertical = true) {
  const g = vertical ? ctx.createLinearGradient(0, 0, 0, H) : ctx.createLinearGradient(0, 0, W, H);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  return g;
}

/* ---------- effects (background layers) ---------- */

function drawCracks(ctx, rng, color, glow) {
  const origins = [
    [W * (0.55 + rng() * 0.2), H * (0.45 + rng() * 0.2)],
    [W * (0.1 + rng() * 0.2), H * (0.1 + rng() * 0.2)],
    [W * (0.7 + rng() * 0.25), H * (0.05 + rng() * 0.2)]
  ];

  function walk(x, y, ang, life, depth) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    let cx = x, cy = y;
    while (life > 0) {
      const step = 18 + rng() * 40;
      ang += (rng() - 0.5) * 0.9;
      cx += Math.cos(ang) * step;
      cy += Math.sin(ang) * step;
      ctx.lineTo(cx, cy);
      life -= step;
      if (depth < 3 && rng() < 0.18) {
        const sx = cx, sy = cy;
        ctx.stroke();
        walk(sx, sy, ang + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.8), life * 0.7, depth + 1);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
      }
      if (cx < -50 || cx > W + 50 || cy < -50 || cy > H + 50) break;
    }
    ctx.stroke();
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 10;
  origins.forEach(([ox, oy]) => {
    const n = 7 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      ctx.lineWidth = 1 + rng() * 2;
      walk(ox, oy, (Math.PI * 2 * i) / n + rng() * 0.4, 260 + rng() * 380, 0);
    }
  });
  ctx.restore();
}

const BG = {
  crack(ctx, rng) {
    ctx.fillStyle = gradient(ctx, [[0, "#ff4a4a"], [0.6, "#d41f1f"], [1, "#8f0b0b"]], false);
    ctx.fillRect(0, 0, W, H);
    drawCracks(ctx, rng, "rgba(255,255,255,0.55)", "rgba(255,240,200,0.9)");
    drawCracks(ctx, rng, "rgba(255,230,150,0.35)", "rgba(255,200,80,0.9)");
  },

  neon(ctx, rng) {
    ctx.fillStyle = gradient(ctx, [[0, "#04061a"], [1, "#0b0233"]]);
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,200,255,0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.save();
    ctx.shadowBlur = 25;
    ctx.shadowColor = "#00e5ff";
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 4;
    roundRect(ctx, 14, 14, W - 28, H - 28, 26);
    ctx.stroke();
    ctx.shadowColor = "#ff2bd6";
    ctx.strokeStyle = "#ff2bd6";
    ctx.lineWidth = 2;
    roundRect(ctx, 28, 28, W - 56, H - 56, 20);
    ctx.stroke();
    ctx.restore();
  },

  matrix(ctx, rng) {
    ctx.fillStyle = "#010a03";
    ctx.fillRect(0, 0, W, H);
    ctx.font = "16px monospace";
    const chars = "01アイウエオカキクケコサシスセソ";
    for (let x = 0; x < W; x += 18) {
      const len = 6 + Math.floor(rng() * 24);
      const y0 = rng() * H;
      for (let i = 0; i < len; i++) {
        const a = 1 - i / len;
        ctx.fillStyle = i === 0 ? "rgba(200,255,210,0.95)" : `rgba(0,255,90,${(a * 0.55).toFixed(2)})`;
        ctx.fillText(chars[Math.floor(rng() * chars.length)], x, (y0 + i * 18) % H);
      }
    }
  },

  fire(ctx, rng) {
    ctx.fillStyle = gradient(ctx, [[0, "#0b0200"], [0.6, "#3a0a00"], [1, "#7a1a00"]]);
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 90; i++) {
      const x = rng() * W;
      const h = 90 + rng() * 300;
      const w = 20 + rng() * 50;
      const hue = 10 + rng() * 40;
      ctx.fillStyle = `hsla(${hue},100%,${45 + rng() * 15}%,0.18)`;
      ctx.beginPath();
      ctx.moveTo(x - w, H);
      ctx.quadraticCurveTo(x - w / 2, H - h / 2, x + (rng() - 0.5) * 30, H - h);
      ctx.quadraticCurveTo(x + w / 2, H - h / 2, x + w, H);
      ctx.fill();
    }
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(255,${150 + Math.floor(rng() * 100)},40,${(0.3 + rng() * 0.6).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(rng() * W, H - rng() * 450, 1 + rng() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  ice(ctx, rng) {
    ctx.fillStyle = gradient(ctx, [[0, "#d9f3ff"], [0.5, "#6fb9ee"], [1, "#2a5f9e"]], false);
    ctx.fillRect(0, 0, W, H);
    drawCracks(ctx, rng, "rgba(255,255,255,0.7)", "rgba(180,230,255,1)");
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${(0.3 + rng() * 0.6).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(rng() * W, rng() * H, 1 + rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  sunset(ctx, rng) {
    ctx.fillStyle = gradient(ctx, [[0, "#1a0b3d"], [0.45, "#a3256e"], [0.75, "#ff6a3d"], [1, "#ffd166"]]);
    ctx.fillRect(0, 0, W, H);
    const sunY = H * 0.72;
    const g = ctx.createRadialGradient(W * 0.78, sunY, 10, W * 0.78, sunY, 190);
    g.addColorStop(0, "rgba(255,240,170,1)");
    g.addColorStop(0.5, "rgba(255,170,70,0.7)");
    g.addColorStop(1, "rgba(255,120,60,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(W * 0.78, sunY, 190, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(20,5,40,0.35)";
    for (let y = sunY; y < H; y += 14) ctx.fillRect(0, y, W, 5);
  },

  glitch(ctx, rng) {
    ctx.fillStyle = "#07070d";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const y = rng() * H;
      const h = 3 + rng() * 22;
      const x = rng() * W * 0.6;
      const w = 80 + rng() * 420;
      const c = ["rgba(255,0,80,", "rgba(0,255,230,", "rgba(130,80,255,"][Math.floor(rng() * 3)];
      ctx.fillStyle = c + (0.12 + rng() * 0.25).toFixed(2) + ")";
      ctx.fillRect(x, y, w, h);
    }
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  }
};

/* ---------- card text ---------- */

const ACCENT = {
  crack: "#ffffff", neon: "#00e5ff", matrix: "#39ff7a", fire: "#ffd27a",
  ice: "#ffffff", sunset: "#fff1c9", glitch: "#ffffff"
};

function drawCard(ctx, fx, title, rows) {
  const accent = ACCENT[fx];
  const px = 60, py = 50, pw = W - 120, ph = H - 100;

  ctx.save();
  ctx.fillStyle = fx === "ice" ? "rgba(10,40,90,0.45)" : "rgba(0,0,0,0.38)";
  roundRect(ctx, px, py, pw, ph, 28);
  ctx.fill();
  ctx.restore();

  const drawText = (txt, x, y, font, color, glow) => {
    ctx.save();
    ctx.font = font;
    ctx.textBaseline = "middle";
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 14; }
    ctx.fillStyle = color;
    ctx.fillText(txt, x, y);
    ctx.restore();
  };

  const glow = fx === "neon" ? "#00e5ff" : fx === "matrix" ? "#00ff5a" : "rgba(0,0,0,0.6)";
  const titleFont = "bold 40px sans-serif";
  const rowFont = "bold 26px sans-serif";

  const tx = px + 40, ty = py + 52;
  if (fx === "glitch") {
    drawText(title, tx - 3, ty, titleFont, "rgba(255,0,80,0.9)");
    drawText(title, tx + 3, ty, titleFont, "rgba(0,255,230,0.9)");
  }
  drawText(title, tx, ty, titleFont, accent, glow);

  const top = ty + 38;
  const gap = (py + ph - 30 - top) / rows.length;
  const lineX = tx + 6;

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(lineX, ty + 22);
  ctx.lineTo(lineX, top + gap * (rows.length - 1) + gap / 2);
  ctx.stroke();
  ctx.restore();

  rows.forEach(([k, v], i) => {
    const y = top + gap * i + gap / 2;
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(lineX, y);
    ctx.lineTo(lineX + 22, y);
    ctx.stroke();
    ctx.restore();
    drawText(k, lineX + 34, y, rowFont, accent, glow);
    drawText(": " + v, lineX + 250, y, rowFont, "#ffffff", glow);
  });
}

/* ---------- message effects (heart / gift / fire ...) ---------- */

const DEFAULT_MSG_FX = { heart: null, gift: null, fire: null };

function loadFx() {
  try {
    return { ...DEFAULT_MSG_FX, ...fs.readJsonSync(effectsPath) };
  } catch (e) {
    return { ...DEFAULT_MSG_FX };
  }
}

function saveFx(data) {
  fs.ensureDirSync(path.dirname(effectsPath));
  fs.writeJsonSync(effectsPath, data, { spaces: 2 });
}

function fmtAgo(ms) {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m ago` : `${m}m ago`;
}

function sendMsg(api, msg, threadID) {
  return new Promise((resolve, reject) => {
    api.sendMessage(msg, threadID, (err, info) => (err ? reject(err) : resolve(info)));
  });
}

/* ---------- command ---------- */

module.exports = {
  config: {
    name: "uptime",
    aliases: ["upt", "status", "effect", "fx"],
    version: "3.0",
    author: "RX",
    countDown: 5,
    role: 0,
    category: "system",
    description: "Bot status with Messenger message effects (text) or visual effect cards (image)",
    guide:
      "{pn} - status text, random message effect\n" +
      "{pn} <heart|gift|fire> - status text with that effect\n" +
      "{pn} plain - status text, no effect\n" +
      "{pn} img [" + IMG_FX.join("|") + "] - status image card\n" +
      "{pn} list - show all effects\n" +
      "{pn} set <name> <effectID> - save message effect ID (admin)\n" +
      "{pn} del <name> - remove message effect (admin)"
  },

  onStart: async function ({ api, event, args, message, role }) {
    const { threadID } = event;
    const cfg = (global.GoatBot && global.GoatBot.config) || {};
    const sub = (args[0] || "").toLowerCase();
    const fxDb = loadFx();

    /* ----- management ----- */
    if (sub === "list") {
      const lines = Object.keys(fxDb).map(k => `• ${k} : ${fxDb[k] ? fxDb[k] : "ID not set"}`);
      return message.reply(
        "✨ Message effects (text)\n" + lines.join("\n") +
        "\n\n🎨 Image effects\n" + IMG_FX.map((e, i) => `${i + 1}. ${e}`).join("\n") +
        "\n\nUse: uptime <name> | uptime img <effect>"
      );
    }

    if (sub === "set") {
      if (role < 2) return message.reply("❌ Only bot admin can set effect IDs.");
      const name = (args[1] || "").toLowerCase();
      const id = (args[2] || "").trim();
      if (!name || !/^\d+$/.test(id)) return message.reply("Usage: uptime set <name> <numeric effectID>");
      fxDb[name] = id;
      saveFx(fxDb);
      return message.reply(`✅ Saved: ${name} = ${id}`);
    }

    if (sub === "del") {
      if (role < 2) return message.reply("❌ Only bot admin can delete effects.");
      const name = (args[1] || "").toLowerCase();
      if (!(name in fxDb)) return message.reply("❌ No such effect.");
      delete fxDb[name];
      saveFx(fxDb);
      return message.reply(`🗑️ Removed: ${name}`);
    }

    /* ----- gather stats ----- */
    let account = cfg.nickNameBot || "Bot";
    try {
      const uid = api.getCurrentUserID();
      const info = await api.getUserInfo(uid);
      if (info && info[uid] && info[uid].name) account = info[uid].name;
    } catch (e) {}

    const totalMem = os.totalmem();
    const usedMem = totalMem - os.freemem();
    const mb = n => Math.round(n / 1024 / 1024);
    const gb = n => (n / 1024 / 1024 / 1024).toFixed(1);
    const cores = os.cpus().length || 1;
    const cpuNum = Math.min(100, (os.loadavg()[0] / cores) * 100);
    const cpuStr = os.platform() === "win32" ? "N/A" : cpuNum.toFixed(1) + "%";
    const ping = Math.max(0, Date.now() - (event.timestamp || Date.now()));
    const cmdCount = global.GoatBot && global.GoatBot.commands ? global.GoatBot.commands.size : "N/A";
    const startedAt = (global.GoatBot && global.GoatBot.startTime) || loadedAt;
    const botName = String(cfg.nickNameBot || "BOT").toUpperCase();

    let region = "N/A";
    try { if (typeof api.getRegion === "function") region = api.getRegion() || region; } catch (e) {}
    let version = "N/A";
    try { version = "v" + require("../../package.json").version; } catch (e) {}

    /* ----- image mode ----- */
    if (sub === "img" || sub === "image") {
      let createCanvas;
      try { ({ createCanvas } = require("canvas")); }
      catch (e) { return message.reply("❌ `canvas` package is not installed."); }

      const pick = (args[1] || "").toLowerCase();
      let fx;
      if (!pick) fx = IMG_FX[Math.floor(Math.random() * IMG_FX.length)];
      else if (/^\d+$/.test(pick) && IMG_FX[+pick - 1]) fx = IMG_FX[+pick - 1];
      else if (IMG_FX.includes(pick)) fx = pick;
      else return message.reply("❌ Unknown image effect. Use `uptime list`.");

      const rows = [
        ["State", "Online"],
        ["Uptime", fmtUptime(process.uptime())],
        ["Ping", ping + "ms"],
        ["Prefix", cfg.prefix || "!"],
        ["Commands", String(cmdCount)],
        ["RAM", `${mb(usedMem)} MB / ${gb(totalMem)} GB`],
        ["Bot RAM", `${mb(process.memoryUsage().rss)} MB`],
        ["CPU", cpuStr],
        ["Node", process.version],
        ["Effect", fx]
      ];

      const rng = rngFrom((Date.now() ^ (Math.random() * 1e9)) >>> 0);
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      BG[fx](ctx, rng);
      drawCard(ctx, fx, `${botName} STATUS`, rows);

      const dir = path.join(__dirname, "cache");
      fs.ensureDirSync(dir);
      const file = path.join(dir, `uptime_${Date.now()}.png`);
      fs.writeFileSync(file, canvas.toBuffer("image/png"));
      try {
        await message.reply({ attachment: fs.createReadStream(file) });
      } finally {
        fs.remove(file).catch(() => {});
      }
      return;
    }

    /* ----- text mode (with message effect) ----- */
    const body =
`╭─ ${botName} STATUS
├ State     : 🟢 Online
├ Uptime    : ${fmtUptime(process.uptime())}
├ Account   : ${account}
├ Prefix    : ${cfg.prefix || "!"}
├ Commands  : ${cmdCount}
├ Ping      : ${ping}ms
├ Session   : ${fmtAgo(Date.now() - startedAt)}
├ Region    : ${region}
├─ Server
│  ⎙ RAM     : ${mb(usedMem)} MB / ${gb(totalMem)} GB
│  ⎙ Bot RAM : ${mb(process.memoryUsage().rss)} MB
│  ⎙ CPU     : ${cpuStr}
│  ⎙ Node    : ${process.version}
│  ⎙ MQTT    : Online
├─ Bot
│  ⎙ Version : ${version}
╰─ Author: AKASH`;

    let effectId = null;
    if (sub !== "plain") {
      if (sub && fxDb[sub]) effectId = String(fxDb[sub]);
      else if (!sub) {
        const ids = Object.values(fxDb).filter(Boolean);
        if (ids.length) effectId = String(ids[Math.floor(Math.random() * ids.length)]);
      } else if (sub && !(sub in fxDb)) {
        return message.reply("❌ Unknown option. Use `uptime list`.");
      }
    }

    try {
      await sendMsg(api, effectId ? { body, effect_id: effectId } : { body }, threadID);
    } catch (err) {
      if (effectId) await sendMsg(api, { body }, threadID); // effect failed -> plain text
      else throw err;
    }
  }
};
