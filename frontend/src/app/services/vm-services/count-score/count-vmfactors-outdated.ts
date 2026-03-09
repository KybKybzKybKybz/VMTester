import { Injectable } from '@angular/core';

export interface VMFactorsType {
  suspiciousFlags: string[];
  examActive: boolean;
  examStatus: string;
}

@Injectable({
  providedIn: 'root',
})
export class CountVMFactors {
  countFactors(suspiciousFlags: string[]): VMFactorsType {
    const result: VMFactorsType = {
      suspiciousFlags: suspiciousFlags,
      examActive: true,
      examStatus: '',
    };

    const weightMap: Record<string, number> = {
      '1. Misstänkt GPU': 40,
      '1. Eventuellt Misstänkt GPU': 5,
      '2. Lågt antal CPU-kärnor': 10,
      '2. Litet RAM': 10,
      '6. Seg CPU': 8,
      '3. Låg skärmbredd': 5,
      '3. Låg skärmhöjd': 5,
      '3. PixelRatio = 1': 5,
      '4. Desktop OS men mobile=true': 15,
      '4. Misstänkt UserAgent': 20,
      '5. Få Plugins/MIME types': 8,
      '7. Saknar mediaenheter': 6,
    };

    let totalScore = 0;
    for (const flag of suspiciousFlags) {
      const weight = weightMap[flag] ?? 1;
      totalScore += weight;
    }

    if (
      suspiciousFlags.includes('1. Eventuellt Misstänkt GPU') &&
      suspiciousFlags.includes('2. Lågt antal CPU-kärnor')
    )
      totalScore = 40;

    const maxScore = 50;
    const riskPercent = Math.min(100, Math.round((totalScore / maxScore) * 100));

    const vmThreshold = 40;
    if (riskPercent >= vmThreshold) {
      result.examActive = false;
      result.examStatus = 'Misstänkt VM – provet avbrutet';
    } else {
      result.examStatus = 'Ingen misstänkt VM – provet pågår';
    }
    console.log(`Riskprocent: ${riskPercent}%, ExamStatus: ${result.examStatus}`);
    return result;
  }
}
