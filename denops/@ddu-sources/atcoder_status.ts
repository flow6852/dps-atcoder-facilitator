import {
  BaseSource,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v2.8.3/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v2.8.3/deps.ts";
import { QDict } from "../atcoder_facilitator/qdict.ts";
import { Session, SessionDict } from "../atcoder_facilitator/session.ts";
import { getStatus } from "../atcoder_facilitator/main.ts";
import { Question } from "../atcoder_facilitator/qdict.ts";
import * as vars from "https://deno.land/x/denops_std@v4.0.0/variable/mod.ts";

type Params = Record<never, never>;

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
        for (
          const item of await vars.globals.get(
            args.denops,
            "atcoder_facilitator#qdict",
          ) as Array<QDict>
        ) {
          for (const sid of item.sids) {
            items.push({
              word: sid.date + "|" + item.title + "|" + sid.sid +
                "|" +
                (await getStatus(
                  args.denops,
                  new Session(
                    await vars.globals.get(
                      args.denops,
                      "atcoder_facilitator#session",
                    ) as SessionDict,
                  ),
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
    return {};
  }
}
