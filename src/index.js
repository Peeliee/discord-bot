import "dotenv/config";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import cron from "node-cron";
import dayjs from "dayjs";
import tz from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import "dayjs/locale/ko.js";

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.locale("ko");

const { DISCORD_BOT_TOKEN: TOKEN, CHANNEL_ID, TZ = "Asia/Seoul" } = process.env;

if (!TOKEN || !CHANNEL_ID) {
    console.error(".env에 DISCORD_BOT_TOKEN, CHANNEL_ID 없음");
    process.exit(1);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    partials: [Partials.Channel],
});

const Emoji = [
    "👍",
    "⭐️",
    "❗️",
    "👀",
    "💡",
    "😎",
    "🤩",
    "👻",
    "💩",
    "🤡",
    "🍗",
    "🐛",
    "🐝",
    "🍻",
    "👹",
    "📷",
    "🚘",
    "🐤",
    "🐣",
    "🐥",
    "🐳",
    "👾",
    "🤖",
    "👽",
];

function pickRandomEmoji() {
  const i = Math.floor(Math.random() * Emoji.length)
  return Emoji[i]
}

// 제목
function buildTitle(dateKST) {
    const mm = dateKST.format("M");
    const dd = dateKST.format("D");
    const dow = ["일", "월", "화", "수", "목", "금", "토"][dateKST.day()];
    return `${mm}/${dd}(${dow}) 데일리스크럼`;
}

// 본문 템플릿
function threadBody(dateKST) {
    return ["[어제 한 일]", "[오늘 할 일]", "[이슈 / 공유사항]", ""].join(
        "\n"
    );
}

async function postDailyScrum() {
    const now = dayjs().tz(TZ);
    const weekday = now.day();
    // 평일만: 1~5, 주말 스킵하려면 아래 if 유지
    //   if (weekday === 0 || weekday === 6) {
    //     console.log('주말 스킵')
    //     return
    //   }

    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) {
        console.error("채널을 찾을 수 없거나 텍스트 채널이 아님");
        return;
    }

    const title = buildTitle(now);
    const emoji = pickRandomEmoji()
    const headline = `${emoji} ${title} ${emoji}`;

    try {
        // 헤드라인 메시지
        const msg = await channel.send(headline);

        // 스레드 생성
        const thread = await msg.startThread({
            name: `${title}`,
            autoArchiveDuration: 10080, // 분 단위: 1440(24h), 10080(1주일)
            reason: "Daily Scrum auto thread",
        });

        // 3) 스레드에 첫 댓글(템플릿)
        await thread.send(`**${headline}**\n\n${threadBody(now)}`);

        console.log(`스크럼 생성: ${title}`);
    } catch (err) {
        console.error("스크럼 생성 실패:", err);
    }
}

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);

    // 매일 07:00 KST
    cron.schedule(
        "0 7 * * *",
        () => {
            postDailyScrum();
        },
        { timezone: TZ }
    );
});

client.login(TOKEN);

// 안전 종료
process.on("SIGINT", () => {
    console.log("bye");
    client.destroy();
    process.exit(0);
});
