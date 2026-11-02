
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { google } = require("googleapis");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

const avisos = [10080, 4320, 1440, 60]; 
// 7 dias, 3 dias, 24 horas e 1 hora

const enviados = new Set();

async function consultarAgenda() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"]
    });

    const calendar = google.calendar({ version: "v3", auth });

    const agora = new Date();
    const limite = new Date(agora.getTime() + 8 * 24 * 60 * 60 * 1000);

    const resposta = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: agora.toISOString(),
      timeMax: limite.toISOString(),
      singleEvents: true,
      orderBy: "startTime"
    });

    for (const evento of resposta.data.items || []) {
      if (!evento.start?.dateTime) continue;

      const inicio = new Date(evento.start.dateTime);
      const minutos = Math.round((inicio - agora) / 60000);

      const canal = await client.channels.fetch(process.env.CHANNEL_ID);
      if (!canal) continue;

      for (const aviso of avisos) {
        const chave = `${evento.id}-${aviso}`;

        if (Math.abs(minutos - aviso) <= 2 && !enviados.has(chave)) {
          const embed = new EmbedBuilder()
            .setTitle(`🏁 ${evento.summary || "Evento de corrida"}`)
            .setDescription(evento.description || "Sem descrição")
            .addFields(
              { name: "📅 Data", value: inicio.toLocaleDateString("pt-BR") },
              { name: "🕒 Horário", value: inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
              { name: "⏳ Aviso", value: `Faltam ${aviso} minutos!` }
            )
            .setColor(0x5865F2);

          await canal.send({ embeds: [embed] });
          enviados.add(chave);
        }
      }
    }
  } catch (erro) {
    console.error("Erro na agenda:", erro.message);
  }
}

client.once("ready", () => {
  console.log("Rustezebot está online!");
  consultarAgenda();
  setInterval(consultarAgenda, 60000);
});

client.login(TOKEN);
