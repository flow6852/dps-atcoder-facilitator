import {
  BaseSource,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v3.4.3/types.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v3.4.3/deps.ts";
import { isQDict } from "../atcoder_facilitator/qdict.ts";
import { is,assert } from "https://deno.land/x/unknownutil@v3.4.0/mod.ts";

type Params = {
  bufnr: number;
};

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
        const bufnr = args.sourceParams.bufnr < 1
          ? fn.bufnr(args.denops, "%")
          : args.sourceParams.bufnr;
        const qdicts = await args.denops.call(
          "atcoder_facilitator#getQDicts",
        );
        assert(qdicts, is.ArrayOf(isQDict));
        for (
          const item of qdicts
        ) {
          items.push({
            word: item.title ?? "",
            action: {
              qdict: item,
              bufnr: bufnr,
            },
          });
        }
        controller.enqueue(items);
        controller.close();
      },
    });
  }

  override params(): Params {
    return {
      bufnr: -1,
    };
  }
}
