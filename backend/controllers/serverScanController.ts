import type { Request, Response } from "express";

interface FlagWeights {
  gpu: number;
  cpuCores: number;
  ram: number;
  screen: number;
  platformMismatch: number;
  uaSuspicious: number;
  clientHintsMissing: number;
  tlsSuspicious: number;
  mediaDevicesMissing: number;
}

export async function serverScan(req: Request, res: Response): Promise<Response> {
  // Nummer 1-7: client-side, 8 och uppåt: server-side
  const { susFlags, okFlags, avoidedFlags, possibleAvoidedReasons, raw } = req.body;

  if (!susFlags || !okFlags || !avoidedFlags || !possibleAvoidedReasons) {
    return res.status(400).send("Missing required fields");
  }

  // 8. Req UA & Client Hints - Mot Headless/VM

  const serverUserAgent = req.headers?.["user-agent"]?.toLowerCase() || '';
  const rawChUa = req.headers['sec-ch-ua'];
  const chUa = Array.isArray(rawChUa) ? rawChUa[0] : rawChUa || '';
  const rawChPlatform = req.headers['sec-ch-ua-platform'];
  const chPlatform = Array.isArray(rawChPlatform) ? rawChPlatform[0] : rawChPlatform || '';

  const chUaNormalized = chUa.toLowerCase();
  const chPlatformNormalized = (chPlatform || '').replace(/"/g, '').trim().toLowerCase();

  const suspiciousUA = [
    "headless", "headlesschrome", "phantomjs", "node-fetch",
    "vmware", "virtualbox", "qemu", "parallels"
  ];

  if (!serverUserAgent) susFlags.push("8. Ingen UserAgent på servern");

  if (suspiciousUA.some(ua => serverUserAgent.includes(ua))) {
    susFlags.push("8. Misstänkt UserAgent på servern");
  } else {
    okFlags.push("8. Ingen misstänkt UserAgent på servern");
  }

  if (!chUaNormalized || !chPlatformNormalized) {
    susFlags.push("8.1 Saknas Client Hints (sec-ch-ua/sec-ch-ua-platform)");
  } else {
    okFlags.push(`8.1 Client Hints ok (UA: ${chUaNormalized}, Platform: ${chPlatformNormalized})`);
  }

  const clientUAFlag = susFlags.includes("4. Misstänkt UserAgent På Klienten");
  const serverUAFlag = susFlags.includes("8. Misstänkt UserAgent på servern");

  if (clientUAFlag && !serverUAFlag) {
    susFlags.push("8.2 UserAgents matchar inte: Klient misstänkt, server ok");
  }
  if (!clientUAFlag && serverUAFlag) {
    susFlags.push("8.3 UserAgents matchar inte: Server misstänkt, klient ok");
  }

  if (raw.platform) {
    const clientPlatform = (raw.platform || '').trim().toLowerCase();

    if (clientPlatform !== chPlatformNormalized) {
      susFlags.push(
        `8.4 Plattform mismatch: Klient rapporterar '${clientPlatform}', server rapporterar '${chPlatformNormalized}'`
      );
    } else {
      okFlags.push(`8.4 Plattform matchar mellan klient och server (${clientPlatform})`);
    }
  } else {
    avoidedFlags.push("8.4 Klientplattform saknas");
  }

  // 9. TLS / Connection FP

  if (req.socket && typeof (req.socket as any).getCipher === "function") {
    const cipherInfo = (req.socket as any).getCipher();
    const suspiciousCiphers = [
      "TLS_NULL_WITH_NULL_NULL",
      "TLS_RSA_WITH_NULL_MD5",
      "TLS_RSA_WITH_NULL_SHA"
    ];

    if (suspiciousCiphers.includes(cipherInfo.name)) {
      susFlags.push("9. Misstänkt TLS-cipher suite");
    } else {
      okFlags.push(`9. TLS-cipher suite ok (${cipherInfo.name})`);
    }
  } else {
    avoidedFlags.push("9. Kunde inte läsa TLS-cipher suite – kanske HTTP istället för HTTPS");
  }

  const flagWeights: FlagWeights = {
    gpu: 2,
    cpuCores: 1,
    ram: 1,
    screen: 1,
    platformMismatch: 1,
    uaSuspicious: 2,
    clientHintsMissing: 1,
    tlsSuspicious: 2,
    mediaDevicesMissing: 1
  };

  let points = 0;

  // 1 GPU
  if (susFlags.includes("1. Misstänkt GPU") || susFlags.includes("1. Eventuellt Misstänkt GPU")) {
    points += flagWeights.gpu;
  }

  // 2 CPU & RAM
  if (raw.cores && raw.cores <= 4) points += flagWeights.cpuCores;
  if (raw.ram && raw.ram <= 4) points += flagWeights.ram;

  // 3 Screen
  if (susFlags.some((f: string) => f.startsWith("3."))) points += flagWeights.screen;

  // 4 Platform / UA
  if (susFlags.includes("4. Misstänkt UserAgent På Klienten") || susFlags.includes("8. Misstänkt UserAgent på servern")) {
    points += flagWeights.uaSuspicious;
  }

  // 5 Client Hints
  if (susFlags.includes("8.1 Saknas Client Hints (sec-ch-ua/sec-ch-ua-platform)")) {
    points += flagWeights.clientHintsMissing;
  }

  // 6 Platform mismatch mellan klient och server
  if (susFlags.some((f: string) => f.startsWith("8.4 Plattform mismatch"))) {
    points += flagWeights.platformMismatch;
  }

  // 7 TLS / Connection FP
  if (susFlags.includes("9. Misstänkt TLS-cipher suite")) {
    points += flagWeights.tlsSuspicious;
  }

  // 8 Media Devices
  if (susFlags.some((f: string) => f.startsWith("7. Saknar mediaenheter"))) {
    points += flagWeights.mediaDevicesMissing;
  }

  // Bonus Score För Speciellt Misstänksamma kombinationer
  if (susFlags.includes("8.1 Saknas Client Hints") && susFlags.includes("4. Misstänkt UserAgent På Klienten")) {
    points += 4;
  }

  let risk: "None" | "Low" | "Medium" | "High" = "None";

  if (points >= 8 || (susFlags.includes("1. Misstänkt GPU") && susFlags.includes("2. Lågt antal CPU-kärnor"))) risk = "High";
  else if (points >= 5) risk = "Medium";
  else if (points >= 2) risk = "Low";

  return res.status(200).json({ susFlags, okFlags, avoidedFlags, possibleAvoidedReasons, points, risk, success: true });
}