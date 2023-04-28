import {
  BaseSource,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v2.8.3/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v2.8.3/deps.ts";
import { QDict } from "../atcoder_facilitator/qdict.ts";

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
          const item of (await args.denops.call(
            "atcoder_facilitator#getQDicts",
          )) as Array<QDict>
        ) {
          for (const sid of item.sids) {
            items.push({
              word: sid.date + "|" + item.title + "|" + sid.sid +
                "|" + sid.status,
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
    };
  }
}
