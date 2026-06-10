import { Channel, ConsumeMessage } from 'amqplib'
import { sendEmail } from '../services/email.service'

export async function handleNotificationSend(msg: ConsumeMessage | null, channel: Channel) {
  if (!msg) return
  
  try {
    const content = JSON.parse(msg.content.toString())
    const { type, recipient_email, subject, data } = content.payload
    
    let templateName = ''
    if (type === 'report_ready') templateName = 'email-report-ready'
    else if (type === 'weekly_report') templateName = 'email-weekly-report'
    else if (type === 'alert_no_clicks') templateName = 'email-alert-no-clicks'
    else throw new Error(`Nieznany typ powiadomienia: ${type}`)

    await sendEmail(recipient_email, subject || 'Powiadomienie TrackFlow', templateName, data || {})

    // Zawsze potwierdzamy wiadomość po udanej wysyłce, by nie wisiała w RabbitMQ
    channel.ack(msg)
  } catch (error) {
    console.error('Błąd w notification.consumer:', error)
    channel.nack(msg, false, true) // Requue przy błędzie
  }
}