import { Denops } from "https://deno.land/x/denops_std@v4.0.0/mod.ts";
import type { Actions } from "https://deno.land/x/ddu_vim@v2.3.0/types.ts";
import {
  ActionFlags,
  BaseKind,
  DduItem,
  PreviewContext,
  Previewer,
} from "https://deno.land/x/ddu_vim@v2.3.0/types.ts";

export interface ActionData {
  qdict: QDict;
}

type IOExample = {
  inputExample: string;
  outputExmaple: string;
  comments: string;
};

type QDict = {
  timeMemoryLimit: string;
  title: string;
  problem: string;
  constraint: string;
  inputStyle: string;
  outputStyle: string;
  ioexamples: Array<IOExample>;
};

type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  override actions: Actions<Params> = {
    async submit(
      args: { denops: Denops; items: DduItem[]; actionParams: unknown },
    ) {
      for (const item of args.items) {
        const action = item.action as ActionData;
        await args.denops.call("atcoder_facilitator#submit", {
          qdict: action.qdict,
        });
      }
      return ActionFlags.None;
    },
    async runTests(
      args: { denops: Denops; items: DduItem[]; actionParams: unknown },
    ) {
      for (const item of args.items) {
        const action = item.action as ActionData;
        await args.denops.call("atcoder_facilitator#runTests", {
          qdict: action.qdict,
        });
      }
      return ActionFlags.None;
    },
  };

  override async getPreviewer(
    args: {
      denops: Denops;
      item: DduItem;
      actionParams: unknown;
      previewContext: PreviewContext;
    },
  ): Promise<Previewer | undefined> {
    const action = args.item.action as ActionData;
    if (!action) {
      return await Promise.resolve(undefined);
    }
    return await Promise.resolve({
      kind: "nofile",
      contents: refineQDict(action.qdict),
    });
  }

  override params(): Params {
    return {};
  }
}

function refineQDict(qdict: QDict): Array<string> {
  let ret: Array<string> = [];
  // title
  ret.push("Title");
  ret.push(qdict.title);

  // timeMemoryLimit
  ret.push(qdict.timeMemoryLimit);

  // problem
  ret.push("Problem");
  ret = ret.concat(qdict.problem.split("\n"));

  // inputStyle
  ret.push("Input");
  ret = ret.concat(qdict.inputStyle.split("\n"));

  // outputStyle
  ret.push("Output");
  ret = ret.concat(qdict.outputStyle.split("\n"));

  return ret;
}
