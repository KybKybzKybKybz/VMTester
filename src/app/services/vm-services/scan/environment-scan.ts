import { Injectable } from '@angular/core';

export interface ScanResult {
  suspiciousFlags: string[];
  unsuspiciousFlags: string[];
  avoidedFlags: string[];
  possibleAvoidedReasons: string[];
}

@Injectable({
  providedIn: 'root',
})
export class EnvironmentScanService {

  async runFullScan(): Promise<ScanResult> {

    const result: ScanResult = {
      suspiciousFlags: [],
      unsuspiciousFlags: [],
      avoidedFlags: [],
      possibleAvoidedReasons: [],
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

  // ================================
  // 1️⃣ GPU CHECK
  // ================================
 private runGpuTypeChecks(result: ScanResult) {
  const canvas = document.createElement('canvas');
  const gl = (canvas.getContext('webgl') ||
    canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

  if (!gl) {
    result.unsuspiciousFlags.push("1. Ingen WebGL");
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

  // Renderers som nästan bara förekommer i VM
  const vmOnlyRenderers = [
    'vboxsvga', 'vboxvga', 'vmsvga',
    'vmware', 'virtualbox', 'qemu',
    'bochs', 'virtual gpu', 'parallels', 'qxl'
  ];

  // Svaga signaler, kan vara fysiska maskiner också (software rendering)
  const weakSignalRenderers = [
    'microsoft basic render driver', 'x.org', 'llvmpipe', 'software rasterizer'
  ];

  // Vendorer som kan indikera VM
  const suspiciousVendors = [
    'vmware', 'virtualbox', 'parallels',
    'qemu', 'bochs'
  ];

  if (renderer && vmOnlyRenderers.some(r => renderer.includes(r)) ||
      vendor && suspiciousVendors.some(v => vendor.includes(v))) {
    result.suspiciousFlags.push("1. Misstänkt GPU");
  } else if (renderer && weakSignalRenderers.some(r => renderer.includes(r))) {
    result.suspiciousFlags.push("1. Eventuellt Misstänkt GPU");
  } else {
    result.unsuspiciousFlags.push("1. GPU ok");
  }

  console.log(`GPU Check -> Renderer: ${renderer}, Vendor: ${vendor}`);
}

  // ================================
  // 2️⃣ CPU & RAM
  // ================================
  private runCpuMemoryChecks(result: ScanResult) {

    const cores = navigator.hardwareConcurrency;
    const ram = (navigator as any).deviceMemory;

    if (typeof cores === "number") {
      cores <= 4
        ? result.suspiciousFlags.push("2. Lågt antal CPU-kärnor")
        : result.unsuspiciousFlags.push("2. Tillräckligt med CPU-kärnor");
    } else {
      result.avoidedFlags.push("2. CPU info otillgänglig");
    }

    if (typeof ram === "number") {
      ram <= 4
        ? result.suspiciousFlags.push("2. Litet RAM")
        : result.unsuspiciousFlags.push("2. Tillräckligt med RAM");
    } else {
      result.avoidedFlags.push("2. RAM info otillgänglig");
    }
  }

  // ================================
  // 3️⃣ SCREEN
  // ================================
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
      result.suspiciousFlags.push(`3. ${reasons.join(", ")}`);
    } else {
      result.unsuspiciousFlags.push("3. Skärm ok");
    }
  }

  // ================================
  // 4️⃣ PLATFORM / UA
  // ================================
  private runPlatformChecks(result: ScanResult) {

    const ua = navigator.userAgent.toLowerCase();

    const suspiciousUA = [
      "vmware", "virtualbox", "qemu",
      "parallels", "headless"
    ];

    if (suspiciousUA.some(s => ua.includes(s))) {
      result.suspiciousFlags.push("4. Misstänkt UserAgent");
    } else {
      result.unsuspiciousFlags.push("4. Platform/UserAgent ok");
    }
  }

  // ================================
  // 5️⃣ PLUGINS
  // ================================
  private runPluginMimeChecks(result: ScanResult) {

    const plugins = navigator.plugins;
    const mimeTypes = navigator.mimeTypes;

    if (plugins.length < 3 || mimeTypes.length < 2) {
      result.suspiciousFlags.push("5. Få Plugins/MIME types");
    } else {
      result.unsuspiciousFlags.push("5. Plugins ok");
    }
  }

  // ================================
  // 6️⃣ PERFORMANCE
  // ================================
  private runPerformanceChecks(result: ScanResult) {

    const start = performance.now();
    for (let i = 0; i < 1e6; i++) {}
    const end = performance.now();

    if (end - start > 200) {
      result.suspiciousFlags.push("6. Seg CPU");
    } else {
      result.unsuspiciousFlags.push("6. Prestanda ok");
    }
  }

  // ================================
  // 7️⃣ MEDIA DEVICES (async)
  // ================================
  private async runMediaDevicesCheck(result: ScanResult) {

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const hasCamera = devices.some(d => d.kind === "videoinput");
      const hasMic = devices.some(d => d.kind === "audioinput");

      if (!hasCamera || !hasMic) {
        result.suspiciousFlags.push("7. Saknar mediaenheter");
      } else {
        result.unsuspiciousFlags.push("7. Mediaenheter ok");
      }

    } catch {
      result.avoidedFlags.push("7. Kunde inte läsa media devices");
    }
  }
}