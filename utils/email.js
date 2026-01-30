import sgMail from '@sendgrid/mail'; // new import
import { convert } from 'html-to-text';
import nodemailer from 'nodemailer';
import { dirname } from 'path';
import pug from 'pug';
import 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Nick Fong <${process.env.EMAIL_FROM}>`;
  }

  // New unified send method using SendGrid API in production
  async send(template, subject) {
    const html = pug.renderFile(`${__dirname}/../emails/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html),
    };

    if (process.env.NODE_ENV === 'production') {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send(mailOptions);
    } else {
      // Keep Nodemailer for local/dev testing
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
      await transporter.sendMail(mailOptions);
    }
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to our family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)',
    );
  }
}
