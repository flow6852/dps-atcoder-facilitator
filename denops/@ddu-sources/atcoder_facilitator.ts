import {
  BaseSource,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v2.8.3/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v2.8.3/deps.ts";
import { getQuestions } from "../atcoder_facilitator/main.ts";

type Params = Record<never, never>;

export class Source extends BaseSource<Params> {
  override kind = "atcoder_facilitator";
  override gather(_args: {
    denops: Denops;
    sourceOptions: SourceOptions;
    sourceParams: Params;
  }): ReadableStream<Item[]> {
    return new ReadableStream<Item[]>({
      start(controller) {
        // get all contests ... commming soon ?
        const items: Item[] = [];
        console.log(getQuestions())
        for (
          const item of getQuestions()
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
