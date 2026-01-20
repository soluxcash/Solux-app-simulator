
import { LithicEnrollment } from '../types';

/**
 * Lithic Service - Uses backend proxy to avoid CORS issues
 */
class LithicService {
  private backendUrl = '/api/lithic';

  private async request(endpoint: string, method: string, body?: any) {
    const response = await fetch(`${this.backendUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP Error ${response.status}`);
    }

    return await response.json();
  }

  async enrollAccount(data: LithicEnrollment) {
    const payload = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      dob: data.dob,
      address: data.address,
      ssn_last_four: data.ssn_last_four,
      type: "INDIVIDUAL"
    };

    return await this.request('/accounts', 'POST', payload);
  }

  async createCard(accountToken: string) {
    const payload = {
      account_token: accountToken,
      type: "VIRTUAL",
      memo: "Solux Virtual Card",
      spend_limit: 1000000,
      spend_limit_duration: "MONTHLY"
    };

    return await this.request('/cards', 'POST', payload);
  }

  async simulateAuthorization(cardToken: string, amountCents: number, merchantName: string) {
    const payload = {
      card_token: cardToken,
      amount: amountCents,
      descriptor: merchantName
    };

    return await this.request('/simulate/authorize', 'POST', payload);
  }
}

export const lithic = new LithicService();
