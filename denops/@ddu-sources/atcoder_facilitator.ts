import {
  BaseSource,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v2.8.3/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v2.8.3/deps.ts";
import * as vars from "https://deno.land/x/denops_std@v4.0.0/variable/mod.ts";
import { QDict } from "../atcoder_facilitator/qdict.ts";

type Params = {};

export class Source extends BaseSource<Params> {
  override kind = "atcoder_facilitator";
  override gather(args: {
    denops: Denops;
    sourceOptions: SourceOptions;
    sourceParams: Params;
  }): ReadableStream<Item[]> {
    return new ReadableStream<Item[]>({
      async start(controller) {
        // get all contests ... commming soon ?
        const items: Item[] = [];
        for (
          const item
            of (await vars.globals.get(
              args.denops,
              "atcoder_facilitator#qdict",
            )) as Array<QDict>
        ) {
          items.push({
            word: item.title ?? "",
            action: {
              qdict: item,
            },
          });
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
