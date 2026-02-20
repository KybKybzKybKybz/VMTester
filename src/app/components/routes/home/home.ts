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
  const cores = navigator.hardwareConcurrency; // antal logiska CPU-kärnor
  const ram = (navigator as any).deviceMemory; // RAM i GB, kan saknas på vissa browsers

  // --- CPU-kontroll ---
  if (typeof cores === "number") {
    if (cores <= 2) {
      this.suspiciousFlags.push("2. Lågt Antal CPU-kärnor");
    } else {
      this.UnsuspiciousFlags.push("2. Tillräckligt med CPU-kärnor");
    }
  } else {
    // API stöds inte / okänt
    this.avoidedFlags.push("2. CPU info otillgänglig");
    this.possibleAvoidedReasons.push(
      "2. Webbläsare blockerar access till hardwareConcurrency, Headless browser, Mycket gammal webbläsare"
    );
  }

  // --- Minne-kontroll ---
  if (typeof ram === "number") {
    if (ram <= 2) {
      this.suspiciousFlags.push("2. Litet RAM");
    } else {
      this.UnsuspiciousFlags.push("2. Tillräckligt med RAM");
    }
  } else {
    // API stöds inte / okänt
    this.avoidedFlags.push("2. RAM info otillgänglig");
    this.possibleAvoidedReasons.push(
      "2. Webbläsare blockerar access till deviceMemory, Headless browser, Mycket gammal webbläsare"
    );
  }

  // --- Konsol-logg för debugging ---
  console.log(`CPU-kärnor: ${cores ?? "okänt"}, RAM: ${ram ?? "okänt"}GB`);
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

      this.examActive = true;
      this.startScan();
      this.runGpuTypeChecks();
      this.runCpuMemoryChecks();

      const onFullscreenChange = () => {
        if (!document.fullscreenElement) {
          this.examActive = false;
          console.log('Exam avbröts eftersom fullscreen avslutades');
          document.removeEventListener('fullscreenchange', onFullscreenChange);
        }
      };
      document.addEventListener('fullscreenchange', onFullscreenChange);
    })
  }

}
