import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EnvironmentScanService, ScanResult } from '../scan/environment-scan';
import { Observable, from, switchMap } from 'rxjs';

type ServerActionResponseType = {
  points: number;
  risk: | "None" |"Low" | "Medium" | "High";
  susFlags: string[];
  okFlags: string[];
  avoidedFlags: string[];
  possibleAvoidedReasons: string[];
  success: boolean;
}

@Injectable({
  providedIn: 'root',
})

export class ApiCall {
  constructor(private http: HttpClient, private environmentScan: EnvironmentScanService ){}

  runFullScanAndSendToServer(): Observable<ServerActionResponseType>{
    return from(this.environmentScan.runFullScan()).pipe(
      switchMap((clientScan: ScanResult) => {
        return from(this.http.post<ServerActionResponseType>('http://localhost:3000/api/backend-vm', {clientScan}, {withCredentials: true}))
      })
    )
  }

}
