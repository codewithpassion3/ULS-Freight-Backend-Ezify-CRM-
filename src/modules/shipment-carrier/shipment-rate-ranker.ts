import { Injectable } from '@nestjs/common';

@Injectable()
export class RateRanker {
  rank(results: any[]) {
    return results
      .filter(r => r.success)
      .sort((a, b) => {
        const aPrice = a.rates?.[0]?.cost ?? Infinity;
        const bPrice = b.rates?.[0]?.cost ?? Infinity;

        return aPrice - bPrice; // cheapest first
      });
  }
}