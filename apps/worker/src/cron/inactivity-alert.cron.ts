import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { Channel } from 'amqplib';

export function initInactivityAlertCron(channel: Channel) {
  // Cron: "0 9 * * *" -> Każdego dnia o 09:00 rano
  cron.schedule('0 9 * * *', async () => {
    console.log('Sprawdzam linki pod kątem braku aktywności...');

    try {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      // Znajdź linki, które nie miały żadnych kliknięć od 14 dni
      const inactiveLinks = await prisma.link.findMany({
        where: {
          isActive: true,
          clicks: {
            none: {
              clickedAt: { gte: fourteenDaysAgo }
            }
          }
        },
        include: { creator: true }
      });

      for (const link of inactiveLinks) {
        const event = {
          type: 'alert_no_clicks',
          recipient_email: link.creator.email,
          subject: 'Twój link stracił aktywność!',
          data: {
            shortCode: link.shortCode,
            originalUrl: link.originalUrl
          }
        };

        channel.publish(
          'trackflow.events', 
          'notification.send', 
          Buffer.from(JSON.stringify({ payload: event })), 
          { persistent: true }
        );
      }
      console.log(`Wysłano ${inactiveLinks.length} alertów o braku aktywności.`);
    } catch (error) {
      console.error('Błąd podczas sprawdzania nieaktywnych linków:', error);
    }
  });
}