import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

interface EmailRecipient {
  email: string;
  name: string;
}

interface MeetingEmailData {
  mentorName: string;
  mentorEmail: string;
  teamLeaderName: string;
  teamLeaderEmail: string;
  calendlyUrl: string;
  meetingTitle: string;
  missedTargets: string[];
  summary: string;
  talkingPoints: string[];
}

/**
 * Email Service for sending meeting invitations
 */
class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = env.EMAIL_FROM || 'noreply@cmetrics.app';
    this.fromName = env.EMAIL_FROM_NAME || 'CMetrics Platform';
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter
   */
  private initializeTransporter() {
    const emailHost = env.EMAIL_HOST;
    const emailPort = env.EMAIL_PORT;
    const emailUser = env.EMAIL_USER;
    const emailPass = env.EMAIL_PASS;

    if (!emailHost || !emailUser || !emailPass) {
      logger.warn('Email service not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS in environment variables');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort || 587,
        secure: emailPort === 465, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service', { error });
    }
  }

  /**
   * Send meeting invitation email to a mentor
   */
  async sendMeetingInvitation(data: MeetingEmailData): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not available. Cannot send meeting invitation');
      return false;
    }

    try {
      const subject = `Meeting Request: ${data.meetingTitle}`;
      const html = this.buildMeetingInvitationHTML(data);
      const text = this.buildMeetingInvitationText(data);

      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: data.mentorEmail,
        replyTo: data.teamLeaderEmail, // Replies go to team leader
        subject,
        text,
        html,
      });

      logger.info('Meeting invitation sent', {
        to: data.mentorEmail,
        mentor: data.mentorName,
        teamLeader: data.teamLeaderName,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send meeting invitation', {
        error,
        to: data.mentorEmail,
        mentor: data.mentorName,
      });
      return false;
    }
  }

  /**
   * Build HTML email content
   */
  private buildMeetingInvitationHTML(data: MeetingEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #2563EB;
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .section {
      background: white;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      border-left: 4px solid #2563EB;
    }
    .section h3 {
      margin-top: 0;
      color: #2563EB;
    }
    .missed-targets {
      background: #fef2f2;
      border-left-color: #ef4444;
    }
    .talking-points {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }
    .btn {
      display: inline-block;
      background: #2563EB;
      color: white !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .btn:hover {
      background: #1d4ed8;
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">📅 Meeting Request</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.meetingTitle}</p>
  </div>

  <div class="content">
    <p>Hi <strong>${data.mentorName}</strong>,</p>

    <p>Your team leader, <strong>${data.teamLeaderName}</strong>, would like to schedule a one-on-one meeting with you to discuss your recent performance and provide support.</p>

    <div class="section">
      <h3>📊 Performance Summary</h3>
      <p>${data.summary}</p>
    </div>

    ${data.missedTargets.length > 0 ? `
    <div class="section missed-targets">
      <h3>🎯 Areas to Discuss</h3>
      <ul>
        ${data.missedTargets.map(target => `<li>${target}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${data.talkingPoints.length > 0 ? `
    <div class="section talking-points">
      <h3>💬 Meeting Topics</h3>
      <ul>
        ${data.talkingPoints.map(point => `<li>${point}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="section">
      <h3>📆 Book Your Meeting Time</h3>
      <p>Please click the button below to select a convenient time for our meeting:</p>
      <a href="${data.calendlyUrl}" class="btn">Book Meeting Time</a>
      <p style="font-size: 14px; color: #666; margin-top: 15px;">
        Or copy this link: <a href="${data.calendlyUrl}">${data.calendlyUrl}</a>
      </p>
    </div>

    <div class="section">
      <h3>📧 Contact Information</h3>
      <p>
        <strong>Team Leader:</strong> ${data.teamLeaderName}<br>
        <strong>Email:</strong> <a href="mailto:${data.teamLeaderEmail}">${data.teamLeaderEmail}</a>
      </p>
      <p style="font-size: 14px; color: #666; margin-top: 15px;">
        <em>Please reply to this email if you have any questions or need to discuss timing.</em>
      </p>
    </div>
  </div>

  <div class="footer">
    <p>This is an automated message from the CMetrics Platform</p>
    <p>Please do not reply to this email. Contact your team leader directly at ${data.teamLeaderEmail}</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Build plain text email content (fallback)
   */
  private buildMeetingInvitationText(data: MeetingEmailData): string {
    let text = `Meeting Request: ${data.meetingTitle}\n\n`;
    text += `Hi ${data.mentorName},\n\n`;
    text += `Your team leader, ${data.teamLeaderName}, would like to schedule a one-on-one meeting with you to discuss your recent performance and provide support.\n\n`;

    text += `Performance Summary:\n`;
    text += `${data.summary}\n\n`;

    if (data.missedTargets.length > 0) {
      text += `Areas to Discuss:\n`;
      data.missedTargets.forEach(target => text += `- ${target}\n`);
      text += `\n`;
    }

    if (data.talkingPoints.length > 0) {
      text += `Meeting Topics:\n`;
      data.talkingPoints.forEach(point => text += `- ${point}\n`);
      text += `\n`;
    }

    text += `Book Your Meeting Time:\n`;
    text += `${data.calendlyUrl}\n\n`;

    text += `Contact Information:\n`;
    text += `Team Leader: ${data.teamLeaderName}\n`;
    text += `Email: ${data.teamLeaderEmail}\n\n`;

    text += `Please reply to this email if you have any questions or need to discuss timing.\n\n`;
    text += `---\n`;
    text += `This is an automated message from the CMetrics Platform\n`;

    return text;
  }

  /**
   * Check if email service is configured
   */
  isEnabled(): boolean {
    return this.transporter !== null;
  }

  /**
   * Verify email connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error });
      return false;
    }
  }
}

export default new EmailService();
