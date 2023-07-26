import { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";
import type { Actions } from "https://deno.land/x/ddu_vim@v3.4.3/types.ts";
import {
  ActionFlags,
  BaseKind,
  DduItem,
  PreviewContext,
  Previewer,
} from "https://deno.land/x/ddu_vim@v3.4.3/types.ts";
import * as fn from "https://deno.land/x/denops_std@v5.0.1/function/mod.ts";
import { isQDict, QDict } from "../atcoder_facilitator/qdict.ts";
import { assert, is } from "https://deno.land/x/unknownutil@v3.4.0/mod.ts";

type RDict = {
  status: string;
  inputExample: string;
  outputExample: string;
  result: string;
};

const isRDict = is.ObjectOf({
  status: is.String,
  inputExample: is.String,
  outputExample: is.String,
  result: is.String,
});

export interface ActionData {
  qdict: QDict;
  bufnr: number;
  rdicts: Array<RDict>;
}

const isActionData = is.ObjectOf({
  qdict: isQDict,
  bufnr: is.Number,
  rdicts: is.ArrayOf(isRDict),
});

type PreviewParams = {
  kind: string;
  rdicts: Array<RDict>;
};

const isPreviewParams = is.ObjectOf({
  kind: is.String,
  rdicts: is.ArrayOf(isRDict),
});

interface ActionFlagParams {
  actionFlag: string;
}

const isActionFlagParams = is.ObjectOf({
  actionFlag: is.String,
});

type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  rdicts: Array<RDict> = [];

  override actions: Actions<Params> = {
    submit: async (
      args: { denops: Denops; items: DduItem[]; actionParams: unknown },
    ) => {
      const actionParams = args.actionParams;
      assert(actionParams, isActionFlagParams);
      for (const item of args.items) {
        const action = item.action;
        assert(action, isActionData);
        const progLang = await fn.getbufvar(
          args.denops,
          action.bufnr,
          "atcoder_facilitator_progLang",
        );
        await args.denops.call("atcoder_facilitator#submit", {
          qdict: action.qdict,
          progLang: progLang,
        });
      }
      if (
        selectFlag(actionParams.actionFlag) ==
          ActionFlags.None
      ) {
        console.log(refineRDict(this.rdicts).join("\n"));
      }
      return selectFlag(actionParams.actionFlag);
    },
    runTests: async (
      args: { denops: Denops; items: DduItem[]; actionParams: unknown },
    ) => {
        const actionParams = args.actionParams
        assert(actionParams, isActionFlagParams)
      let appendRDicts: Array<RDict> = [];
      for (const item of args.items) {
        const action = item.action;
        assert(action, isActionData);
        const buildCmd = await fn.getbufvar(
          args.denops,
          action.bufnr,
          "atcoder_facilitator_buildCmd",
        );
        const execCmd = await fn.getbufvar(
          args.denops,
          action.bufnr,
          "atcoder_facilitator_execCmd",
        );
        const ardict = await args.denops.call("atcoder_facilitator#runTests", {
          qdict: action.qdict,
          buildCmd: buildCmd,
          execCmd: execCmd,
        });
        assert(ardict, isRDict);
        appendRDicts = appendRDicts.concat(ardict);
      }
      this.rdicts = appendRDicts;
      if (
        selectFlag(actionParams.actionFlag) ==
          ActionFlags.None
      ) {
        console.log(refineRDict(this.rdicts).join("\n"));
      }
      return selectFlag(actionParams.actionFlag);
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
    const params = args.actionParams;
    const action = args.item.action;
    assert(params, isPreviewParams)
    assert(action, isActionData)
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
          contents: refineRDict(this.rdicts),
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
  ret.push(qdict.title ?? "");

  // timeMemoryLimit
  ret.push(qdict.timeMemoryLimit ?? "");

  // problem
  ret.push("Problem");
  ret = ret.concat((qdict.problem ?? "").split("\n"));

  // constraint
  if (qdict.constraint != undefined) {
    ret.push("Constraint");
    ret = ret.concat(qdict.constraint.split("\n"));
  }

  // inputStyle
  ret.push("Input");
  ret = ret.concat((qdict.inputStyle ?? "").split("\n"));

  // outputStyle
  ret.push("Output");
  ret = ret.concat((qdict.outputStyle ?? "").split("\n"));

  return ret;
}

function refineRDict(rdicts: Array<RDict>): Array<string> {
  let ret: Array<string> = [];
  for (let i = 0; i < rdicts.length; i++) {
    ret.push("Example " + (i + 1));
    ret.push(rdicts[i].status);
    ret = ret.concat(rdicts[i].inputExample.split("\n"));
    ret = ret.concat(rdicts[i].outputExample.split("\n"));
    ret = ret.concat(rdicts[i].result.split("\n"));
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
