import {
  BaseSource,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v2.3.0/types.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v2.3.0/deps.ts";
import { join, resolve } from "https://deno.land/std@0.177.0/path/mod.ts";
import { abortable } from "https://deno.land/std@0.171.0/async/mod.ts";

type Params = {
  qdict: Array<QDict>;
  cookieStr: string;
};

type IOExample = {
  inputExample: string;
  outputExmaple: string;
  comments: string;
}

type QDict = {
  timeMemoryLimit: string;
  title: string;
  problem: string;
  constraint: string;
  inputStyle: string;
  outputStyle: string;
  ioexamples: Array<IOExample>;
}

export class Source extends BaseSource<Params> {
  override kind = 'atcoder_facilitator';
  override gather(args: {
    denops: Denops;
    sourceOptions: SourceOptions;
    sourceParams: Params;
  }): ReadableStream<Item[]> {
    return new ReadableStream<Item[]>({
      async start(controller) {
        // get all contests ... commming soon ?
        const items: Item[] = []
        for (const item of args.sourceParams.qdict) {
          items.push({
            word: item.title,
            action: {
              qdict: item
            }
          });
        }
        controller.enqueue(items);
        controller.close();
      },
    });
  }

  override params(): Params {
    return {
      src: ".",
      chunkSize: 1000,
      ignoredDirectories: [],
      expandSymbolicLink: false,
    };
  }
}
