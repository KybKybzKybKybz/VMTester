import { Injectable } from '@angular/core';

export interface ScanResult {
  susFlags: string[];
  okFlags: string[];
  avoidedFlags: string[];
  possibleAvoidedReasons: string[];
  raw?: {
    userAgent: string;
    platform: string;
    cores?: number;
    ram?: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class EnvironmentScanService {
  private detectPlatformFallback(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "Windows";
  if (ua.includes("mac")) return "Mac";
  if (ua.includes("linux")) return "Linux";
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  if (ua.includes("android")) return "Android";
  return "Unknown";
}

  async runClientScan(): Promise<ScanResult> {

    const result: ScanResult = {
      susFlags: [],
      okFlags: [],
      avoidedFlags: [],
      possibleAvoidedReasons: [],
      raw: {
        userAgent: navigator.userAgent,
        platform: (navigator as any).userAgentData?.platform ?? this.detectPlatformFallback(),
        cores: navigator.hardwareConcurrency,
        ram: (navigator as any).deviceMemory
      }
    };

    this.runGpuTypeChecks(result);
    this.runCpuMemoryChecks(result);
    this.runScreenSizeChecks(result);
    this.runPlatformChecks(result);
    this.runPluginMimeChecks(result);
    this.runPerformanceChecks(result);
    await this.runMediaDevicesCheck(result);

    return result;
  }

  

  //1 Gpu Check
 private runGpuTypeChecks(result: ScanResult) {
  const canvas = document.createElement('canvas');
  const gl = (canvas.getContext('webgl') ||
    canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

  if (!gl) {
    result.okFlags.push("1. Ingen WebGL");
    return;
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

  if (!debugInfo) {
    result.avoidedFlags.push("1. Undvek GPU Analys");
    result.possibleAvoidedReasons.push(
      "Webbläsaren blockerar debug-info eller headless browser används"
    );
    return;
  }

  const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)?.toLowerCase();
  const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)?.toLowerCase();

  const vmOnlyRenderers = [
    'vboxsvga', 'vboxvga', 'vmsvga',
    'vmware', 'virtualbox', 'qemu',
    'bochs', 'virtual gpu', 'parallels', 'qxl'
  ];

  const weakSignalRenderersAndVendors = [
    'microsoft basic render driver', 'x.org', 'llvmpipe', 'software rasterizer', 'mesa'
  ];

  const suspiciousVendors = [
    'vmware', 'virtualbox', 'parallels',
    'qemu', 'bochs'
  ];

  if (renderer && vmOnlyRenderers.some(r => renderer.includes(r)) ||
      vendor && suspiciousVendors.some(v => vendor.includes(v))) {
    result.susFlags.push("1. Misstänkt GPU");
  } else if (renderer && weakSignalRenderersAndVendors.some(r => renderer.includes(r))) {
    result.susFlags.push("1. Eventuellt Misstänkt GPU");
  } else {
    result.okFlags.push("1. GPU ok");
  }

  console.log(`GPU Check -> Renderer: ${renderer}, Vendor: ${vendor}`);
}

  //2 Cpu & Ram
  private runCpuMemoryChecks(result: ScanResult) {

    const cores = navigator.hardwareConcurrency;
    const ram = (navigator as any).deviceMemory;

    if (typeof cores === "number") {
      cores <= 4
        ? result.susFlags.push("2. Lågt antal CPU-kärnor")
        : result.okFlags.push("2. Tillräckligt med CPU-kärnor");
    } else {
      result.avoidedFlags.push("2. CPU info otillgänglig");
    }

    if (typeof ram === "number") {
      ram <= 4
        ? result.okFlags.push("2. Litet RAM")
        : result.okFlags.push("2. Tillräckligt med RAM");
    } else {
      result.avoidedFlags.push("2. RAM info otillgänglig");
    }
  }

 //3 Screen
  private runScreenSizeChecks(result: ScanResult) {

    let score = 0;
    const reasons: string[] = [];

    if (screen.width <= 1024) {
      score++;
      reasons.push("Låg skärmbredd");
    }

    if (screen.height <= 768) {
      score++;
      reasons.push("Låg skärmhöjd");
    }

    if (window.devicePixelRatio === 1) {
      score++;
      reasons.push("PixelRatio = 1");
    }

    if (score >= 2) {
      result.susFlags.push(`3. ${reasons.join(", ")}`);
    } else {
      result.okFlags.push("3. Skärm ok");
    }
  }

 //4 Platform/Ua
  private runPlatformChecks(result: ScanResult) {

    const ua = navigator.userAgent.toLowerCase();

   const suspiciousUA = [
    "headless", "headlesschrome", "phantomjs", "node-fetch",
    "vmware", "virtualbox", "qemu", "parallels"
  ];

    if (suspiciousUA.some(s => ua.includes(s))) {
      result.susFlags.push("4. Misstänkt UserAgent På Klienten");
    } else {
      result.okFlags.push("4. Platform/UserAgent ok");
    }
  }


  //5 Plugins

  private runPluginMimeChecks(result: ScanResult) {

    const plugins = navigator.plugins;
    const mimeTypes = navigator.mimeTypes;

    if (plugins.length < 3 || mimeTypes.length < 2) {
      result.susFlags.push("5. Få Plugins/MIME types");
    } else {
      result.okFlags.push("5. Plugins ok");
    }
  }


  //6 Performence

  private runPerformanceChecks(result: ScanResult) {

    const start = performance.now();
    for (let i = 0; i < 1e6; i++) {}
    const end = performance.now();

    if (end - start > 200) {
      result.susFlags.push("6. Seg CPU");
    } else {
      result.okFlags.push("6. Prestanda ok");
    }
  }


  //7 Media Devices

  private async runMediaDevicesCheck(result: ScanResult) {

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const hasCamera = devices.some(d => d.kind === "videoinput");
      const hasMic = devices.some(d => d.kind === "audioinput");

      if (!hasCamera && !hasMic) {
        result.susFlags.push("7. Saknar mediaenheter");
      } else {
        result.okFlags.push("7. Mediaenheter ok");
      }

    } catch {
      result.avoidedFlags.push("7. Kunde inte läsa media devices");
    }
  }
}