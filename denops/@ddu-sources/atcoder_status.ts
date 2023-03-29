import {
  BaseSource,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v2.3.0/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v2.3.0/deps.ts";
import { QDict } from "../atcoder_facilitator/qdict.ts";
import { Session, SessionDict } from "../atcoder_facilitator/session.ts";
import { getStatus } from "../atcoder_facilitator/main.ts";
import { Question } from "../atcoder_facilitator/qdict.ts";

type Params = {
  qdict: Array<QDict>;
  session: SessionDict;
};

export class Source extends BaseSource<Params> {
  override kind = "atcoder_status";
  override gather(args: {
    denops: Denops;
    sourceOptions: SourceOptions;
    sourceParams: Params;
  }): ReadableStream<Item[]> {
    return new ReadableStream<Item[]>({
      async start(controller) {
        const items: Item[] = [];
        for (const item of args.sourceParams.qdict) {
          for (const sid of item.sids) {
            items.push({
              word: sid.date + "|" + item.title + "|" + sid.sid +
                "|" +
                (await getStatus(
                  new Session(args.sourceParams.session),
                  new Question(item),
                  sid.sid,
                ))[0].status,
              action: {
                qdict: item,
              },
            });
          }
        }
        controller.enqueue(items);
        controller.close();
      },
    });
  }

  override params(): Params {
    return {
      qdict: [],
      session: new Session().getSessionDict(),
    };
  }
}
