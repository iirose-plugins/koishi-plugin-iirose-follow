import { Context, Schema, Logger, Session, h } from 'koishi';
import { } from 'koishi-plugin-adapter-iirose';

export const name = 'iirose-follow';

export interface Config {
  permission: string[];
}

export const inject = ['database'];

export const Config: Schema<Config> = Schema.object({
  permission: Schema.array(String).description('允许使用者唯一标识列表').default([])
});

const logger = new Logger('IIROSE-Follow');

declare module 'koishi' {
  interface Tables {
    iirose_follow: follow;
  }
}

export interface follow {
  uid: string;
  status: boolean;
}

export function apply(ctx: Context, config: Config) {
  ctx.model.extend('iirose_follow', {
    uid: 'string',
    status: 'boolean'
  }, {
    primary: 'uid'
  });

  ctx.command('iirose.跟随', '让机器人跟随我！')
    .action(async ({ session }) => {
      const uid = session.userId;
      if (config.permission.indexOf(uid) < 0) {
        return '[IIROSE-Follow] 权限不足，请在控制台处将你的唯一标识添加到允许列表';
      }

      if (session.platform !== 'iirose') {
        return '[IIROSE-Follow] 该平台不支持使用此插件';
      }
      const userData = await ctx.database.get('iirose_follow', session.userId);

      if (userData.length > 0 && userData[0].status) {
        return '[IIROSE-Follow] 你已经设置为跟随状态了哦~';
      } else if (userData.length > 0) {
        await ctx.database.set('iirose_follow', session.userId, {
          status: true
        });

        return `[IIROSE-Follow] 将 ${h.at(session.userId)} 设置为BOT跟随状态`;
      } else if (userData.length == 0) {
        ctx.database.create('iirose_follow', {
          uid: session.userId,
          status: true
        });

        return `[IIROSE-Follow] 将 ${h.at(session.userId)} 设置为BOT跟随状态`;
      }
    });

  ctx.command('iirose.取消跟随', '停止机器人的跟随！')
    .action(async ({ session }) => {
      if (session.platform !== 'iirose') {
        return '[IIROSE-Follow] 该平台不支持使用此插件';
      }
      const userData = await ctx.database.get('iirose_follow', session.userId);

      if (userData.length > 0 && !userData[0].status) {
        return `[IIROSE-Follow]  ${h.at(session.userId)} 你还没有要求BOT跟随过哦~无需取消。`;
      } else if (userData.length > 0) {
        await ctx.database.set('iirose_follow', session.userId, {
          status: false
        });

        return `[IIROSE-Follow] 将 ${h.at(session.userId)} 设置BOT取消跟随啦`;
      } else if (userData.length == 0) {
        ctx.database.create('iirose_follow', {
          uid: session.userId,
          status: false
        });

        return `[IIROSE-Follow] 将 ${h.at(session.userId)} 设置BOT取消跟随啦`;
      }

    });

  ctx.on('iirose/switchRoom', async (session: Session, data) => {
    const userData = await ctx.database.get('iirose_follow', data.uid);
    if (userData.length <= 0 || !userData[0].status) {
      return;
    }

    const newRoomId = data.targetRoom;
    if (session.guildId === newRoomId) {
      await session.bot.sendMessage(session.channelId, '[IIROSE-Follow] 跳转失败，目标房间与当前机器人所在房间可能位置相同')
      return
    }
    logger.info(`跟随 ${session.username} 跳转到房间: ${data.targetRoom}`);
    await session.bot.internal.moveRoom({ roomId: data.targetRoom });
  });

  // ctx.once('iirose/selfMove', (session, data) => {
  //   session.bot.internal.moveRoom({ roomId: data.id });
  // });
}
