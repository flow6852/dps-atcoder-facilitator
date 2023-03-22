import type { Actions } from "https://deno.land/x/ddu_vim@v2.3.0/types.ts";
import {
  ActionFlags,
  BaseKind,
  DduItem,
  PreviewContext,
} from "https://deno.land/x/ddu_vim@v2.3.0/types.ts";

export interface ActionData {
  qlist: QList;
}

type IOExample = {
  inputExample: string;
  outputExmaple: string;
  comments: string;
};

type QList = {
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
        if (!action) {
          return undefined;
        }
        await args.denops.call("atcoder_facilitator#submit", {
          qlist: action.qlist,
        });
      }
      return ActionFlags.None;
    },
    async runTests(
      args: { denops: Denops; items: DduItem[]; actionParams: unknown },
    ) {
      for (const item of args.items) {
        const action = item.action as ActionData;
        if (!action) {
          return undefined;
        }
        await args.denops.call("atcoder_facilitator#runTests", {
          qlist: action.qlist,
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
      return undefined;
    }
    return {
      kind: "nofile",
      contents: refineQList(action.qlist),
    };
  }

  override params(): Params {
    return {};
  }
}

function refineQList(qlist: QList): Array<string> {
  let ret: Array<string> = [];
  // title
  ret.push("Title");
  ret.push(qlist.title);

  // timeMemoryLimit
  ret.push(qlist.timeMemoryLimit);

  // problem
  ret.push("Problem");
  ret = ret.concat(qlist.problem.split("\n"));

  // inputStyle
  ret.push("Input");
  ret = ret.concat(qlist.inputStyle.split("\n"));

  // outputStyle
  ret.push("Output");
  ret = ret.concat(qlist.outputStyle.split("\n"));

  return ret;
}
