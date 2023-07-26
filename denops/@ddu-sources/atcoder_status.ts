import {
  BaseSource,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v3.4.3/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v3.4.3/deps.ts";
import { isQDict } from "../atcoder_facilitator/qdict.ts";
import { assert, is } from "https://deno.land/x/unknownutil@v3.4.0/mod.ts";

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
        const qdicts = await args.denops.call(
          "atcoder_facilitator#getQDicts",
        );
        assert(qdicts, is.ArrayOf(isQDict));
        for (
          const item of qdicts
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
    return {};
  }
}
