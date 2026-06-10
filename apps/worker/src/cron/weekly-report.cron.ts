import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { Channel } from 'amqplib';
import { Link } from '@prisma/client'; // Poprawny import typu Link

export function initWeeklyReportCron(channel: Channel) {
  // Cron: "0 8 * * 1" -> Poniedziałek, godzina 08:00
  cron.schedule('0 8 * * 1', async () => {
    console.log('Uruchamiam cotygodniowe generowanie raportów...');

    try {
      // 1. Pobieramy wszystkich klientów
      const clients = await prisma.user.findMany({ 
        where: { role: 'client' } 
      });

      for (const client of clients) {
        // 2. Pobieramy linki klienta, typując je bezpośrednio jako Link[]
        const links: Link[] = await prisma.link.findMany({ 
          where: { clientId: client.id } 
        });
        
        const linkIds = links.map(l => l.id);

        // 3. Liczymy kliknięcia z ostatnich 7 dni
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const clicksCount = await prisma.click.count({
          where: {
            linkId: { in: linkIds },
            clickedAt: { gte: lastWeek }
          }
        });

        // 4. Wysyłamy wiadomość do kolejki notification.send
        const event = {
          type: 'weekly_report',
          recipient_email: client.email,
          subject: 'Twój tygodniowy raport TrackFlow',
          data: {
            clientName: client.agencyClientName || client.email,
            clicksCount
          }
        };

        channel.publish(
          'trackflow.events', 
          'notification.send', 
          Buffer.from(JSON.stringify({ payload: event })), 
          { persistent: true }
        );
      }
      console.log(`Wysłano zadania raportów dla ${clients.length} klientów.`);
    } catch (error) {
      console.error('Błąd podczas wykonywania Crona tygodniowego:', error);
    }
  });
}