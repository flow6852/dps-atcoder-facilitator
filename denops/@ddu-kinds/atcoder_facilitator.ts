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
  rdict: RunTestResult;
}

type PreviewParams = {
  kind: string;
  actionedData: Array<RunTestResult>;
};

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

type RunTestResult = {
  status: string;
  inputExample: string;
  outputExample: string;
  result: string;
};

interface ActionFlagParams {
  actionFlag: string;
}

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
      return selectFlag((args.actionParams as ActionFlagParams).actionFlag);
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
      return selectFlag((args.actionParams as ActionFlagParams).actionFlag);
    },
    async getStatus(
      args: { denops: Denops; items: DduItem[]; actionParams: unknown },
    ) {
      for (const item of args.items) {
        const action = item.action as ActionData;
        await args.denops.call("atcoder_facilitator#getStatus", {
          qdict: action.qdict,
        });
      }
      return selectFlag((args.actionParams as ActionFlagParams).actionFlag);
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
    const params = args.actionParams as PreviewParams;
    const action = args.item.action as ActionData;
    if (!action) {
      return await Promise.resolve(undefined);
    }
    let ret: Previewer;
    switch (params.kind) {
      case "question":
        ret = {
          kind: "nofile",
          contents: refineQDict(action.qdict),
        };
        break;
      case "runTests":
        ret = {
          kind: "nofile",
          contents: refineRunTestDict(params.actionedData),
        };
        break;
      case "status":
        ret = {
          kind: "nofile",
          contents: refineQDict(action.qdict),
        };
        break;
      default:
        ret = {
          kind: "nofile",
          contents: refineQDict(action.qdict),
        };
    }
    return await Promise.resolve(ret);
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

function refineRunTestDict(rdict: Array<RunTestResult>): Array<string> {
  const ret: Array<string> = [];
  for (let i = 0; i < rdict.length; i++) {
    ret.push("Example " + (i+1)) 
    ret.push(rdict[i].status);
    ret.push(rdict[i].inputExample);
    ret.push(rdict[i].outputExample);
    ret.push(rdict[i].result);
  }
  return ret;
}

function selectFlag(flagStr: string): ActionFlags {
  let ret: ActionFlags = ActionFlags.None;
  switch (flagStr) {
    case "None":
      ret = ActionFlags.None;
      break;
    case "RefreshItems":
      ret = ActionFlags.RefreshItems;
      break;
    case "Redraw":
      ret = ActionFlags.Redraw;
      break;
    case "Persist":
      ret = ActionFlags.Persist;
      break;
  }
  return ret;
}
