import nodemailer from 'nodemailer'
import ejs from 'ejs'
import path from 'path'

// Używamy '127.0.0.1' zamiast 'localhost' by uniknąć problemów z IPv6 w Node.js
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || '127.0.0.1', 
  port: parseInt(process.env.SMTP_PORT || '1025', 10),
  ignoreTLS: true
})

export async function sendEmail(to: string, subject: string, templateName: string, data: any): Promise<any> {
  const templatePath = path.join(__dirname, `../templates/${templateName}.ejs`)
  
  // Rzutujemy wynik na string, by uspokoić TypeScripta i Nodemailera!
  const html = await ejs.renderFile(templatePath, data) as string

  const info = await transporter.sendMail({
    from: '"TrackFlow Automatyzacja" <no-reply@trackflow.local>',
    to,
    subject,
    html
  })

  return info
}