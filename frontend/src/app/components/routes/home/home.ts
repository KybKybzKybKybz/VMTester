import { Component, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField, pattern, required, minLength, maxLength, submit, validate, SchemaPathTree } from '@angular/forms/signals';
import { StartFullscreen } from '../../../services/vm-services/start-fullscreen/start-fullscreen';
import { CountVMFactors } from '../../../services/vm-services/count-score/count-vmfactors-outdated';
import {ApiCall} from '../../../services/vm-services/api-services/api-call';

@Component({
  selector: 'app-home',
  imports: [FormField, CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home {

  constructor(private apiCall: ApiCall, private cdr: ChangeDetectorRef, private startFullscreen: StartFullscreen ) {}

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

  points: number = 0;
  risk: |"None" |"Low" | "Medium" | "High" = "None";
  susFlags: string[] = [];
  okFlags: string[] = [];
  avoidedFlags: string[] = [];
  possibleAvoidedReasons: string[] = [];

  errorMsg: string = ""


  // Kör hela miljöskanningen
callVMAnalyzer() {
this.cdr.detectChanges();
 this.apiCall.runFullScan().subscribe({
  next: result => {
    if(result.success){
      this.risk = result.risk;
      this.points = result.points;
      this.susFlags = result.susFlags;
      this.okFlags = result.okFlags;
      this.avoidedFlags = result.avoidedFlags;
      this.possibleAvoidedReasons = result.possibleAvoidedReasons;

      console.log(this.susFlags);
      console.log(this.okFlags);
      console.log(this.avoidedFlags);
      console.log(this.risk);
      console.log(this.points);

      if(this.risk === "High") {
        this.examActive = false;
        this.examStatus = "Risk hög – prov avbrutet";
        setTimeout(() => {
          document.exitFullscreen?.();
        }, 1500)
        
      }
    } else {
      this.errorMsg = "Kunde inte köra miljöskanningen";
      console.error("Scan failed", result);
    }
  },
  error: err => {
    this.errorMsg = "Fel vid API-anrop";
    console.error("API error", err);
  }
});

}


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
        
        this.cdr.detectChanges();
        document.removeEventListener('fullscreenchange', onFullscreenChange);
      }
    };

      document.addEventListener('fullscreenchange', onFullscreenChange);

      this.examActive = true;
      this.startFullscreen.startFullscreen();

      this.callVMAnalyzer();
    });
  }
}