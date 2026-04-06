/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';

@Injectable()
export class MailService {
  private apiInstance: SibApiV3Sdk.TransactionalEmailsApi;

  constructor() {
    const client = SibApiV3Sdk.ApiClient.instance;
    const apiKey = client.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  }

  async sendOtpEmail(to: string, otp: string) {
    try {
      await this.apiInstance.sendTransacEmail({
        sender: {
          email: 'udaysenapati6878@gmail.com',
          name: 'Auth Service',
        },
        to: [{ email: to }],
        subject: 'Your OTP Code',
        htmlContent: `
          <h2>Verification Code</h2>
          <h1>${otp}</h1>
          <p>Expires in 5 minutes.</p>
        `,
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Email failed');
    }
  }
}
