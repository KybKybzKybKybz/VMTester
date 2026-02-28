import { Component, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField, pattern, required, minLength, maxLength, submit, validate, SchemaPathTree } from '@angular/forms/signals';
import { EnvironmentScanService, ScanResult} from '../../../services/vm-services/scan/environment-scan';
import { StartFullscreen } from '../../../services/vm-services/start-fullscreen/start-fullscreen';
import { CountVMFactors } from '../../../services/vm-services/count-score/count-vmfactors';

@Component({
  selector: 'app-home',
  imports: [FormField, CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home {

  constructor(private envScan: EnvironmentScanService, private cdr: ChangeDetectorRef, private startFullscreen: StartFullscreen, private countVMFactors: CountVMFactors ) {}

  // Formmodell
  codeModel = signal({ code: '' });
  codeSchema!: SchemaPathTree<{ code: string }>;

  testForm = form(this.codeModel, (schemaPath) => {
    this.codeSchema = schemaPath;
    required(schemaPath.code, { message: "Du måste fylla i koden för att starta provet." });
    minLength(schemaPath.code, 8, { message: "Koden måste vara 8 siffror" });
    maxLength(schemaPath.code, 8, { message: "Koden måste vara 8 siffror." });
    pattern(schemaPath.code, /^12345678$/, { message: "Fel kod." });
  });

  examActive: boolean = false;
  examStatus: string = "";

  suspiciousFlags: string[] = [];
  unsuspiciousFlags: string[] = [];
  avoidedFlags: string[] = [];
  possibleAvoidedReasons: string[] = [];

  // Kör hela miljöskanningen
async runEnvironmentScan() {
  const result: ScanResult = await this.envScan.runFullScan();

  this.suspiciousFlags = result.suspiciousFlags;
  this.unsuspiciousFlags = result.unsuspiciousFlags;
  this.avoidedFlags = result.avoidedFlags;
  this.possibleAvoidedReasons = result.possibleAvoidedReasons;

  // Räkna viktad score och kontrollera VM-tröskel
  const vmResult = this.countVMFactors.countFactors(this.suspiciousFlags);

  this.examActive = vmResult.examActive;
  this.examStatus = vmResult.examStatus;

  this.cdr.detectChanges(); // Uppdaterar UI om examActive ändras
}

  // Viktad score och VM-tröskel

  // Submit knapp
  onSubmit(event: Event) {
    event.preventDefault();

    submit(this.testForm, async () => {
      const { code } = this.codeModel();
      if (code !== '12345678') {
        validate(this.codeSchema.code, () => ({
          kind: 'invalidCode',
          message: 'Koden är ogiltig enligt server'
        }));
        return; // stoppar submit callback
      }

      // Rensa input
      this.codeModel.update(current => ({ ...current, code: '' }));

      // Lyssna på fullscreen exit
      const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        this.examActive = false;
        this.examStatus = "Fullskärm avslutad – prov avbrutet";
        
        this.cdr.detectChanges(); // Tvingar Angular att uppdatera UI
        document.removeEventListener('fullscreenchange', onFullscreenChange);
      }
    };

      document.addEventListener('fullscreenchange', onFullscreenChange);

      // Starta exam
      this.examActive = true;
      this.startFullscreen.startFullscreen();

      // Kör hela miljöskanningen
      await this.runEnvironmentScan();
      console.log(this.suspiciousFlags)
      console.log(this.unsuspiciousFlags)
      console.log(this.avoidedFlags)
    });
  }
}