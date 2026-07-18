/**
 * Live API smoke: login via captcha override in Redis, then hit meter/collector/summary.
 * Usage: node scripts/live-api-smoke.mjs
 */
import net from "node:net";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const JSEncrypt = require("jsencrypt");

const BASE = process.env.API_BASE || "http://localhost:8004";
const USER = process.env.SMOKE_USER || "admin";
const PASS = process.env.SMOKE_PASS || "123456";
const PUBLIC_KEY =
  process.env.RSA_PUBLIC_KEY ||
  "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANL378k3RiZHWx5AfJqdH9xRNBmD9wGD2iRe41HdTNF8RUhNnHit5NpMNtGL0NPTSSpPjjI1kJfVorRvaQerUgkCAwEAAQ==";

function redisCmd(...args) {
  let s = `*${args.length}\r\n`;
  for (const a of args) {
    const b = Buffer.from(String(a));
    s += `$${b.length}\r\n${a}\r\n`;
  }
  return s;
}

function redisCall(...args) {
  return new Promise((resolve, reject) => {
    const c = net.connect(6379, "127.0.0.1");
    let buf = "";
    c.on("connect", () => {
      // app uses spring.redis.database=1
      c.write(redisCmd("SELECT", "1") + redisCmd(...args));
    });
    c.on("data", d => {
      buf += d.toString();
      // SELECT + command → two replies
      const lines = buf.split("\r\n").filter(Boolean);
      if (lines.length >= 2) {
        c.end();
        resolve(buf);
      }
    });
    c.on("error", reject);
  });
}

function encryptPassword(plain) {
  const enc = new JSEncrypt();
  enc.setPublicKey(
    `-----BEGIN PUBLIC KEY-----\n${PUBLIC_KEY}\n-----END PUBLIC KEY-----`
  );
  const out = enc.encrypt(plain);
  if (!out) throw new Error("RSA encrypt failed");
  return out;
}

async function httpJson(method, urlPath, { token, body, query } = {}) {
  const u = new URL(urlPath, BASE);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== "") u.searchParams.set(k, String(v));
    }
  }
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body != null) headers["Content-Type"] = "application/json";
  const started = Date.now();
  const res = await fetch(u, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, ms: Date.now() - started, json };
}

function summarizeSummary(dto) {
  if (!dto || typeof dto !== "object") return { ok: false, reason: "empty" };
  const data = dto.data || {};
  const keys = Object.keys(data);
  let itemCount = 0;
  let withMeterId = 0;
  let withCollectorId = 0;
  const sample = [];
  for (const k of keys) {
    const arr = Array.isArray(data[k]) ? data[k] : [];
    itemCount += arr.length;
    for (const it of arr) {
      if (it?.meterId != null) withMeterId += 1;
      if (it?.collectorId != null) withCollectorId += 1;
      if (sample.length < 3) {
        sample.push({
          time: k,
          meterId: it?.meterId,
          meterNo: it?.meterNo,
          collectorId: it?.collectorId,
          total: it?.totalConsumption,
          meterName: it?.meterName
        });
      }
    }
  }
  return {
    ok: dto.status === 1,
    status: dto.status,
    msg: dto.msg,
    dimension: dto.dimension,
    timeBuckets: keys.length,
    itemCount,
    withMeterId,
    withCollectorId,
    sample
  };
}

async function login() {
  if (process.env.SMOKE_TOKEN) {
    return process.env.SMOKE_TOKEN.replace(/^Bearer\s+/i, "");
  }

  // Fresh login by default; set SMOKE_RECOVER=1 to reuse Redis online session
  if (process.env.SMOKE_RECOVER === "1") {
    const recovered = await tryRecoverOnlineToken();
    if (recovered) return recovered;
  }

  const codeRes = await httpJson("GET", "/auth/code");
  if (codeRes.status !== 200 || !codeRes.json?.uuid) {
    throw new Error(`captcha failed: ${JSON.stringify(codeRes)}`);
  }
  const uuid = codeRes.json.uuid;
  const fixedCode = "ab";
  // FastJsonRedisSerializer stores String as JSON: "ab"
  await redisCall("SET", uuid, `"${fixedCode}"`);
  await redisCall("EXPIRE", uuid, 120);

  const password = encryptPassword(PASS);
  const loginRes = await httpJson("POST", "/auth/login", {
    body: { username: USER, password, code: fixedCode, uuid }
  });
  if (loginRes.status !== 200) {
    throw new Error(`login HTTP ${loginRes.status}: ${JSON.stringify(loginRes.json)}`);
  }
  const token =
    loginRes.json?.token ||
    loginRes.json?.data?.token ||
    loginRes.json?.access_token;
  if (!token) {
    throw new Error(`no token in login response: ${JSON.stringify(loginRes.json)}`);
  }
  console.log("(fresh login via /auth/login)");
  return String(token).replace(/^Bearer\s+/i, "");
}

async function tryRecoverOnlineToken() {
  try {
    process.env.NODE_OPTIONS = [
      process.env.NODE_OPTIONS || "",
      "--openssl-legacy-provider"
    ]
      .filter(Boolean)
      .join(" ");
  } catch {
    /* ignore */
  }
  const crypto = await import("node:crypto");
  const keysResp = await redisCall("KEYS", `online_token:${USER}:*`);
  const keyMatch = keysResp.match(/online_token:[^\r\n]+/);
  if (!keyMatch) return null;
  const key = keyMatch[0];
  const getResp = await redisCall("GET", key);
  const jsonMatch = getResp.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  let dto;
  try {
    dto = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
  const enc = dto?.key;
  if (!enc || typeof enc !== "string") return null;
  try {
    const decipher = crypto.createDecipheriv(
      "des-cbc",
      Buffer.from("Passw0rd"),
      Buffer.from("Passw0rd")
    );
    let out = decipher.update(Buffer.from(enc, "hex"));
    out = Buffer.concat([out, decipher.final()]);
    const token = out.toString("utf8");
    console.log(`(recovered online token for ${USER} from Redis)`);
    return token;
  } catch (e) {
    console.warn("recover token failed:", e.message);
    return null;
  }
}

function passFail(ok, label, detail) {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${label}${detail ? " — " + detail : ""}`);
  return ok;
}

async function main() {
  console.log(`Smoke against ${BASE} as ${USER}`);
  const results = [];

  let token;
  try {
    token = await login();
    results.push(passFail(true, "login", "got Bearer token"));
  } catch (e) {
    results.push(passFail(false, "login", String(e.message || e)));
    process.exitCode = 1;
    return;
  }

  // meters — page through up to 200 for full-plant smoke
  const meterContent = [];
  let meterHttpOk = true;
  let meterMs = 0;
  for (let page = 0; page < 5; page++) {
    const meters = await httpJson("GET", "/api/meters", {
      token,
      query: { page, size: 50, meterType: "electric" }
    });
    meterMs += meters.ms;
    if (meters.status !== 200) {
      meterHttpOk = false;
      break;
    }
    const chunk =
      meters.json?.content ||
      meters.json?.data?.content ||
      (Array.isArray(meters.json) ? meters.json : []);
    if (!Array.isArray(chunk) || !chunk.length) break;
    meterContent.push(...chunk);
    const total = Number(meters.json?.totalElements ?? meters.json?.data?.totalElements);
    if (Number.isFinite(total) && meterContent.length >= total) break;
    if (chunk.length < 50) break;
  }
  const meterOk = meterHttpOk && meterContent.length > 0;
  const withCollectorName = meterContent.filter(m => m?.collectorName).length;
  const withCollectorAddr = meterContent.filter(
    m => m?.collectorInstallAddress || m?.installAddress
  ).length;
  const collectorIdSet = [
    ...new Set(
      meterContent
        .map(m => Number(m.collectorId))
        .filter(n => Number.isFinite(n))
    )
  ];
  results.push(
    passFail(
      meterOk,
      "GET /api/meters (paged)",
      `rows=${meterContent.length}, collectors=${collectorIdSet.length}, collectorName=${withCollectorName}, addrish=${withCollectorAddr}, ${meterMs}ms`
    )
  );

  // collectors
  const collectors = await httpJson("GET", "/api/collectors", {
    token,
    query: { page: 0, size: 50 }
  });
  const collectorContent =
    collectors.json?.content || collectors.json?.data?.content || [];
  const collectorStatus = collectors.status;
  const collectorPath = "/api/collectors";
  const collectorOk =
    collectorStatus === 200 &&
    Array.isArray(collectorContent) &&
    collectorContent.length > 0;
  const firstCollectorId = collectorContent[0]?.id;
  results.push(
    passFail(
      collectorOk,
      `GET ${collectorPath}`,
      `HTTP ${collectorStatus}, rows=${collectorContent.length}, firstId=${firstCollectorId}`
    )
  );

  // month summary (local aggregation — should work without 3.2 hour path)
  const month = await httpJson("GET", "/api/external/energy-statistics/summary", {
    token,
    query: {
      dimension: "month",
      startTime: "202607",
      endTime: "202607",
      ignoreRadio: 0
    }
  });
  const monthSum = summarizeSummary(month.json);
  results.push(
    passFail(
      month.status === 200 && monthSum.ok,
      "summary month (all)",
      `HTTP ${month.status}, buckets=${monthSum.timeBuckets}, items=${monthSum.itemCount}, meterId=${monthSum.withMeterId}, collectorId=${monthSum.withCollectorId}, msg=${monthSum.msg}, ${month.ms}ms`
    )
  );
  if (monthSum.sample?.length) {
    console.log("  sample:", JSON.stringify(monthSum.sample, null, 2));
  }

  // filtered by first collector + multi-collector if available
  if (firstCollectorId != null) {
    const filtered = await httpJson(
      "GET",
      "/api/external/energy-statistics/summary",
      {
        token,
        query: {
          dimension: "month",
          startTime: "202607",
          endTime: "202607",
          ignoreRadio: 0,
          collectorIds: String(firstCollectorId)
        }
      }
    );
    const fSum = summarizeSummary(filtered.json);
    const allItems = monthSum.itemCount;
    const filteredLessOrEq =
      fSum.itemCount <= allItems || allItems === 0;
    const collectorMatch =
      fSum.sample.every(
        s => s.collectorId == null || Number(s.collectorId) === Number(firstCollectorId)
      ) || fSum.itemCount === 0;
    const expectedUnderCollector = meterContent.filter(
      m => Number(m.collectorId) === Number(firstCollectorId)
    ).length;
    results.push(
      passFail(
        filtered.status === 200 && fSum.ok && filteredLessOrEq && collectorMatch,
        `summary month collectorIds=${firstCollectorId}`,
        `HTTP ${filtered.status}, items ${fSum.itemCount}/${allItems}, metersUnderCollector=${expectedUnderCollector}, collectorMatch=${collectorMatch}, ${filtered.ms}ms`
      )
    );

    if (collectorIdSet.length >= 2) {
      const multiIds = collectorIdSet.slice(0, 2).join(",");
      const multi = await httpJson(
        "GET",
        "/api/external/energy-statistics/summary",
        {
          token,
          query: {
            dimension: "month",
            startTime: "202607",
            endTime: "202607",
            ignoreRadio: 0,
            collectorIds: multiIds
          }
        }
      );
      const mSum = summarizeSummary(multi.json);
      const allowed = new Set(collectorIdSet.slice(0, 2).map(Number));
      const multiMatch =
        mSum.sample.every(
          s => s.collectorId == null || allowed.has(Number(s.collectorId))
        ) || mSum.itemCount === 0;
      results.push(
        passFail(
          multi.status === 200 && mSum.ok && multiMatch,
          `summary month multi collectorIds=${multiIds}`,
          `items=${mSum.itemCount}, match=${multiMatch}, ${multi.ms}ms`
        )
      );
    }
  } else {
    results.push(passFail(false, "summary month filter", "no collector id"));
  }

  // hour summary pressure (full day window) — timing baseline for plant scale
  const hourDay = "20260717";
  const hourSummary = await httpJson(
    "GET",
    "/api/external/energy-statistics/summary",
    {
      token,
      query: {
        dimension: "hour",
        startTime: `${hourDay}00`,
        endTime: `${hourDay}23`,
        ignoreRadio: 0
      }
    }
  );
  const hourSum = summarizeSummary(hourSummary.json);
  results.push(
    passFail(
      hourSummary.status === 200,
      "summary hour (full day)",
      `HTTP ${hourSummary.status}, status=${hourSum.status}, buckets=${hourSum.timeBuckets}, items=${hourSum.itemCount}, msg=${hourSum.msg}, ${hourSummary.ms}ms`
    )
  );
  // second hit should come from Redis (hour/day summary cache)
  if (hourSummary.status === 200) {
    const hourCached = await httpJson(
      "GET",
      "/api/external/energy-statistics/summary",
      {
        token,
        query: {
          dimension: "hour",
          startTime: `${hourDay}00`,
          endTime: `${hourDay}23`,
          ignoreRadio: 0
        }
      }
    );
    const hc = summarizeSummary(hourCached.json);
    results.push(
      passFail(
        hourCached.status === 200 && hc.ok,
        "summary hour (cache hit)",
        `buckets=${hc.timeBuckets}, items=${hc.itemCount}, ${hourCached.ms}ms (1st=${hourSummary.ms}ms)`
      )
    );
  }
  if (firstCollectorId != null && hourSummary.status === 200 && hourSum.ok) {
    const hourFiltered = await httpJson(
      "GET",
      "/api/external/energy-statistics/summary",
      {
        token,
        query: {
          dimension: "hour",
          startTime: `${hourDay}00`,
          endTime: `${hourDay}23`,
          ignoreRadio: 0,
          collectorIds: String(firstCollectorId)
        }
      }
    );
    const hf = summarizeSummary(hourFiltered.json);
    results.push(
      passFail(
        hourFiltered.status === 200 && hf.ok,
        `summary hour collectorIds=${firstCollectorId}`,
        `buckets=${hf.timeBuckets}, items=${hf.itemCount}, ${hourFiltered.ms}ms`
      )
    );
  }

  // day summary (may depend on 3.2)
  const day = await httpJson("GET", "/api/external/energy-statistics/summary", {
    token,
    query: {
      dimension: "day",
      startTime: "20260717",
      endTime: "20260717",
      ignoreRadio: 0
    }
  });
  const daySum = summarizeSummary(day.json);
  results.push(
    passFail(
      day.status === 200,
      "summary day (HTTP)",
      `HTTP ${day.status}, status=${daySum.status}, msg=${daySum.msg}, items=${daySum.itemCount}, ${day.ms}ms`
    )
  );
  if (daySum.ok) {
    results.push(
      passFail(
        daySum.itemCount === 0 || daySum.withMeterId > 0,
        "summary day meterId mapping",
        `withMeterId=${daySum.withMeterId}/${daySum.itemCount}`
      )
    );
  } else {
    results.push(
      passFail(
        false,
        "summary day business",
        `status=${daySum.status} msg=${daySum.msg} (often 3.2/collector config)`
      )
    );
  }

  // batch day-power for up to 20 meters
  const batchIds = meterContent
    .map(m => Number(m.id))
    .filter(n => Number.isFinite(n))
    .slice(0, 20);
  if (batchIds.length) {
    const batch = await httpJson(
      "POST",
      "/api/external/energy-statistics/devices/day-power/batch",
      {
        token,
        body: { deviceIds: batchIds, date: "2026-07-17" }
      }
    );
    const items =
      batch.json?.items ||
      batch.json?.data?.items ||
      (Array.isArray(batch.json) ? batch.json : null);
    results.push(
      passFail(
        batch.status === 200,
        `day-power batch n=${batchIds.length}`,
        `HTTP ${batch.status}, items=${Array.isArray(items) ? items.length : "?"}, ${batch.ms}ms`
      )
    );
  }

  // device day-power if we have a meter
  const mid = meterContent[0]?.id;
  if (mid != null) {
    const dp = await httpJson(
      "GET",
      `/api/external/energy-statistics/device/${mid}/day-power`,
      { token, query: { date: "2026-07-17" } }
    );
    results.push(
      passFail(
        dp.status === 200,
        `day-power device ${mid}`,
        `HTTP ${dp.status}, keys=${Object.keys(dp.json || {}).join(",")}, ${dp.ms}ms`
      )
    );
  }

  // daily-energy reconcile (read-only)
  const reconcile = await httpJson(
    "GET",
    "/api/external/energy-statistics/daily-energy/reconcile",
    { token, query: { date: "2026-07-17" } }
  );
  results.push(
    passFail(
      reconcile.status === 200 && reconcile.json?.success !== false,
      "daily-energy reconcile",
      `HTTP ${reconcile.status}, expected=${reconcile.json?.expectedCount}, present=${reconcile.json?.presentCount}, missing=${reconcile.json?.missingCount}, healthy=${reconcile.json?.healthy}, ${reconcile.ms}ms`
    )
  );

  // redis energy cache volume
  const cacheStats = await httpJson(
    "GET",
    "/api/external/energy-statistics/cache-stats",
    { token }
  );
  results.push(
    passFail(
      cacheStats.status === 200 && typeof cacheStats.json?.total === "number",
      "energy cache-stats",
      `HTTP ${cacheStats.status}, total=${cacheStats.json?.total}, ${cacheStats.ms}ms`
    )
  );
  if (cacheStats.json?.byPrefix) {
    console.log("  cache byPrefix:", JSON.stringify(cacheStats.json.byPrefix));
  }

  const failed = results.filter(r => !r).length;
  console.log(`\nDone: ${results.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
