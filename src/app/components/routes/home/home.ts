import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {form, FormField, pattern, required, minLength, maxLength, submit, validate, SchemaPathTree} from '@angular/forms/signals';


@Component({
  selector: 'app-home',
  imports: [FormField, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  
  codeModel = signal({
    code: ''
  });

  codeSchema!: SchemaPathTree<{ code: string }>;

  testForm = form(this.codeModel, (schemaPath) => {
    this.codeSchema = schemaPath;
    required(schemaPath.code, {
      message: "Du måste fylla i koden för att starta provet."
    });

    minLength(schemaPath.code, 8, {
      message: "Koden måste vara 8 siffror"
    });

    maxLength(schemaPath.code, 8, {
      message: "Koden måste vara 8 siffror."
    });

    pattern(schemaPath.code, /^12345678$/, {
      message: "Fel kod."
    });
  });

  examActive: boolean = false;

  score: number = 0;

  suspiciousFlags: string[] = [];
  UnsuspiciousFlags: string[] = [];
  avoidedFlags: string[] = [];
  possibleAvoidedReasons: string[] = [];

  examStatus: string = "";

  countFactors(){
    this.score = this.suspiciousFlags.length;
  }

  startScan(){
    //Triggas endast för att det är genom ett knapp tryck.
    const elem = document.documentElement;
    if(elem.requestFullscreen) elem.requestFullscreen();
  }

  runGpuTypeChecks() {
  // 1️ Vilken GPU används för att rendera grafik
  const canvas = document.createElement('canvas');
  const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

      // Lista på misstänkta VM-renderers eller vendors
      const suspiciousRenderers = [
        'VMware SVGA II',
        'VirtualBox Graphics Adapter',
        'QXL',
        'Parallels Graphics Adapter',
        'Microsoft Basic Render Driver',
        'Bochs',
        'Virtual GPU',
        'VMWare Virtual GPU'
      ];

      const suspiciousVendors = [
        'VMware, Inc.',
        'VirtualBox',
        'Parallels',
        'X.Org',
        'QEMU',
        'Microsoft Corporation'
      ];

      if (
        suspiciousRenderers.some(r => renderer.includes(r)) ||
        suspiciousVendors.some(v => vendor.includes(v))
      ) {
        this.suspiciousFlags.push("1. Misstänkt GPU");
      }
      console.log(`GPU: ${renderer ?? "Okänd GPU"}, Tillverkare: ${vendor ?? "Okänt"}`)
    } else {
      this.avoidedFlags.push("1. Undvek GPU Analys");
      this.possibleAvoidedReasons.push(
        "1. Webbläsarens säkerhetsinställningar blockerar debug-info, Mobilwebbläsare som inte tillåter debug-info, Headless eller automatiserad browser (Puppeteer, Selenium etc.), Inkompatibel eller gammal GPU/drivrutin som inte stöder debug-info"
      );
    }

  } else {
    this.UnsuspiciousFlags.push("1. Ingen WebGL");
  }
}

runCpuMemoryChecks() {
  //2. Tillgängliga CPU Kärnor & RAM
  const cores = navigator.hardwareConcurrency; 
  const ram = (navigator as any).deviceMemory; 

  if (typeof cores === "number") {
    if (cores <= 2) {
      this.suspiciousFlags.push("2. Lågt Antal CPU-kärnor");
    } else {
      this.UnsuspiciousFlags.push("2. Tillräckligt med CPU-kärnor");
    }
  } else {
    this.avoidedFlags.push("2. CPU info otillgänglig");
    this.possibleAvoidedReasons.push(
      "2. Webbläsare blockerar access till hardwareConcurrency, Headless browser, Mycket gammal webbläsare"
    );
  }

  if (typeof ram === "number") {
    if (ram <= 2) {
      this.suspiciousFlags.push("2. Litet RAM");
    } else {
      this.UnsuspiciousFlags.push("2. Tillräckligt med RAM");
    }
  } else {
    this.avoidedFlags.push("2. RAM info otillgänglig");
    this.possibleAvoidedReasons.push(
      "2. Webbläsare blockerar access till deviceMemory, Headless browser, Mycket gammal webbläsare"
    );
  }

  console.log(`CPU-kärnor: ${cores ?? "okänt"}, RAM: ${ram ?? "okänt"}GB`);
}

runScreenSizeChecks(){
  // 3. Kolla Skärmstorlek och PixelRatio
  let localScore = 0;
  const reasons = [];
  const screenWidth = screen.width;
  const screenHeight = screen.height;
  const pixelRatio = window.devicePixelRatio;

  if(screenWidth <= 1024){
    localScore++
    reasons.push("Låg Skärmbredd")
  }
  if(screenHeight <= 768){
    localScore++
    reasons.push("Låg Skärmhöjd")
  }
  if(pixelRatio === 1){
    localScore++
    reasons.push("Låg Enhetspixels Ratio")
  }
  if(localScore >= 2){
    const reasonsString = reasons.join(", ");
    console.log(`3. Misstänkt: ${reasonsString}`);
    this.suspiciousFlags.push(`3. ${reasonsString}`);
    return;
}
  reasons.length === 1 ? this.UnsuspiciousFlags.push(`3. Inget Misstänkt Men: ${reasons[0]}`) : this.UnsuspiciousFlags.push("3. Inget Misstänkt.")
  return;
}

runPlatformChecks() {
  // 4. Kolla userAgent information och att det stämmer överens.
  const nav = navigator as any;
  const userAgentData = nav.userAgentData;
  const ua = nav.userAgent.toLowerCase();
  let suspicious = false;
  const reasons: string[] = [];

  // -------- 1️⃣ Mobile fallback --------
  let isMobile = false;
  if (userAgentData?.mobile !== undefined) {
    isMobile = userAgentData.mobile;
  } else {
    // fallback via klassisk userAgent-sträng
    isMobile = /android|iphone|ipad|ipod|windows phone|mobile/i.test(navigator.userAgent.toLowerCase());
  }

  // -------- 2️⃣ userAgentData checks --------
  if (userAgentData) {
    const platform = (userAgentData.platform ?? "").toLowerCase();

    // ---------- Plattform-mismatch ----------
    if (platform) {
      const platformMap: Record<string, string[]> = {
        "windows": ["windows"],
        "mac": ["macintosh", "mac os x"],
        "linux": ["linux", "x11"]
      };

      if (platformMap[platform]) {
        const validUA = platformMap[platform];
        if (!validUA.some(v => ua.includes(v))) {
          suspicious = true;
          reasons.push(`Platform mismatch: ${platform} vs userAgent`);
        }
      }
    }

    // ---------- Arkitektur ----------
    if (userAgentData.architecture) {
      const architecture = userAgentData.architecture.toLowerCase();
      if (architecture === "unknown") {
        suspicious = true;
        reasons.push("Misstänkt arkitektur");
      }
    }

    // ---------- Bitness ----------
    if (userAgentData.bitness) {
      const bitness = userAgentData.bitness;
      if (bitness !== "64" && bitness !== "32") {
        suspicious = true;
        reasons.push("Misstänkt Bit");
      }
    }

    // ---------- Desktop OS men mobile=true ----------
    if (
      (platform.includes("windows") ||
       platform.includes("mac") ||
       platform.includes("linux")) &&
       isMobile
    ) {
      suspicious = true;
      reasons.push("Desktop OS men mobile=true (fallback kontrollerad)");
    }

    // ---------- Brands ----------
    if (userAgentData.brands && Array.isArray(userAgentData.brands)) {
      const suspiciousBrands = ["headless", "puppeteer", "selenium"];
      userAgentData.brands.forEach((b: any) => {
        const brandName = b.brand.toLowerCase();
        if (suspiciousBrands.some(sb => brandName.includes(sb))) {
          suspicious = true;
          reasons.push(`Misstänkt Brand: ${b.brand}`);
        }
      });
    }
  }

  // -------- 3️⃣ Fallback: navigator.userAgent --------
  if (!suspicious) {
    const suspiciousUA = [
      "vmware",
      "virtualbox",
      "qemu",
      "parallels",
      "vbox",
      "bochs",
      "hyper-v",
      "kvm",
      "x11",
      "headless"
    ];
    if (suspiciousUA.some(ss => ua.includes(ss))) {
      suspicious = true;
      reasons.push(`Misstänkt UserAgent: ${navigator.userAgent}`);
    }
  }

  // -------- 4️⃣ Push flags --------
  if (suspicious) {
    this.suspiciousFlags.push(`4. ${reasons.join(", ")}`);
  } else {
    this.UnsuspiciousFlags.push("4. Platform/UserAgent ok");
  }

  console.log("Platform/UserAgent Check:", reasons);
}

runPluginMimeChecks() {
  const nav: any = navigator;
  const reasons: string[] = [];
  let suspicious = false;

  // ---- Kolla om det är mobil ----
  let isMobile = false;
  if(nav.userAgentData?.mobile !== undefined){
    isMobile = nav.userAgentData.mobile;
  } else {
    // fallback med klassisk userAgent
    isMobile = /android|iphone|ipad|ipod|windows phone|mobile/i.test(nav.userAgent.toLowerCase());
  }

  // ---- Endast desktop / icke-mobil ----
  if(!isMobile){
    const plugins = nav.plugins;
    const mimeTypes = nav.mimeTypes;

    if(plugins.length < 5){
      suspicious = true;
      reasons.push(`Få browser-plugins (${plugins.length})`);
    }

    if(mimeTypes.length < 2){
      suspicious = true;
      reasons.push(`Få MIME types (${mimeTypes.length})`);
    }
  }
  

  // ---- Push flags ----
  if(suspicious){
    this.suspiciousFlags.push(`5. ${reasons.join(", ")}`);
  } else {
    this.UnsuspiciousFlags.push("5. Plugins/MIME types ok");
  }

  console.log("Plugin/MIME Check:", reasons);
}

runPerformanceChecks(){
  let isMobile = false;
  const nav = navigator as any;
  if(nav.userAgentData.mobile){
    isMobile = true;
    this.UnsuspiciousFlags.push("6. Användare är på en mobil enhet.");
  } else if(/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent.toLowerCase())){
    isMobile = true;
    this.UnsuspiciousFlags.push("6. Användare är på en mobil enhet.")
  }
  if (!isMobile) {
      const start = performance.now();
      for(let i=0;i<1e6;i++);
      const end = performance.now();
      if (end-start > 200){
        this.suspiciousFlags.push('6. Misstänkt: Seg CPU');
      } 
      else{
        this.UnsuspiciousFlags.push("6. Prestanda Ok")
      } 
  }
};

runMediaDevicesCheck(){
  navigator.mediaDevices.enumerateDevices().then(devices => {
    const hasCamera = devices.some(d => d.kind === "videoinput");
    const hasMic = devices.some(d => d.kind === "audioinput");

    if(!hasCamera || !hasMic) this.suspiciousFlags.push("7. Saknar Mediaenheter");
    else this.UnsuspiciousFlags.push("7. Ok Mediaenheter")
    console.log("Media Devices Check:", { hasCamera, hasMic });
  })
}


  onSubmit(event: Event){
    event.preventDefault();

    submit(this.testForm, async () => {
      const {code} = this.codeModel()
      if (code !== '12345678') {
        validate(this.codeSchema.code, () => ({
          kind: 'invalidCode',
          message: 'Koden är ogiltig enligt server'
        }));
        return; // stoppar submit callback
      }
      this.codeModel.update(current => ({ ...current, code: '' }));

      
      const onFullscreenChange = () => {
        if (!document.fullscreenElement) {
          this.examActive = false;
          console.log('Exam avbröts eftersom fullscreen avslutades');
          document.removeEventListener('fullscreenchange', onFullscreenChange);
        }
      };
      document.addEventListener('fullscreenchange', onFullscreenChange);

      this.examActive = true;
      this.startScan();
      this.runGpuTypeChecks();
      this.runCpuMemoryChecks();
      this.runScreenSizeChecks();
      this.runPlatformChecks();
      this.runPerformanceChecks();
      this.runPluginMimeChecks();
      this.runMediaDevicesCheck();
    })
  }

}
