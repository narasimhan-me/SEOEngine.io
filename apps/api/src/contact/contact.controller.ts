import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { ContactDto } from './contact.dto';
import { CaptchaService } from '../captcha/captcha.service';

@Controller('contact')
export class ContactController {
  constructor(private captchaService: CaptchaService) {}

  @Post()
  async submit(@Body() dto: ContactDto, @Req() req: Request) {
    // Get client IP for CAPTCHA verification
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress;

    // Verify CAPTCHA first
    await this.captchaService.verify(dto.captchaToken, clientIp);

    // TODO: Implement actual contact form handling
    // Options:
    // - Send email via SendGrid/Resend/Postmark
    // - Create a support ticket in help desk system
    // - Store in database for admin review
    // - Send to Slack webhook

    console.log('Contact form submission:', {
      name: dto.name,
      email: dto.email,
      messageLength: dto.message.length,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message:
        'Your message has been received. We will get back to you within 24 hours.',
    };
  }
}
