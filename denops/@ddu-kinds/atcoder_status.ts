import { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";
import type { Actions } from "https://deno.land/x/ddu_vim@v3.4.3/types.ts";
import {
  ActionFlags,
  BaseKind,
  DduItem,
  PreviewContext,
  Previewer,
} from "https://deno.land/x/ddu_vim@v3.4.3/types.ts";
import { isQDict, QDict } from "../atcoder_facilitator/qdict.ts";
import { assert, is } from "https://deno.land/x/unknownutil@v3.4.0/mod.ts";

export interface ActionData {
  qdict: QDict;
}

const isActionData = is.ObjectOf({
  qdict: isQDict,
});

type PreviewParams = {
  kind: string;
  sdicts: Array<SDict>;
};

const isPreviewParams = is.ObjectOf({
  kind: is.String,
  sdicts: is.ArrayOf(isSDict),
});

type SDict = {
  title: string;
  sid: {
    date: string;
    sid: number;
  };
  status: string;
};

const isSDict = is.ObjectOf({
  title: is.String,
  sid: is.ObjectOf({
    date: is.String,
    sid: is.Number,
  }),
  status: is.String,
});

interface ActionFlagParams {
  actionFlag: string;
}

const isActionFlagParams = is.ObjectOf({
  actionFlag: is.String,
});

type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  sdicts: Array<SDict> = [];

  override actions: Actions<Params> = {
    getStatus: async (
      args: { denops: Denops; items: DduItem[]; actionParams: unknown },
    ) => {
      let ret: Array<SDict> = new Array(0);
      const actionParams = args.actionParams;
      assert(actionParams, isActionFlagParams);
      for (const item of args.items) {
        const action = item.action;
        assert(action, isActionData);
        const getStatus = await args.denops.call(
          "atcoder_facilitator#getStatus",
          {
            qdict: action.qdict,
          },
        );
        assert(getStatus, isSDict);
        ret = ret.concat(getStatus);
        if (
          selectFlag(actionParams.actionFlag) ==
            ActionFlags.None
        ) {
          console.log(refineSDict(action.qdict).join("\n"));
        }
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
      default:
        ret = {
          kind: "nofile",
          contents: refineSDict(action.qdict),
        };
    }
    return await Promise.resolve(ret);
  }

  override params(): Params {
    return {};
  }
}

function refineSDict(_qdict: QDict): Array<string> {
  const ret: Array<string> = new Array(0);
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
