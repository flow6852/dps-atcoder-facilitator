import { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";
import type { Actions } from "https://deno.land/x/ddu_vim@v3.4.3/types.ts";
import {
  ActionFlags,
  BaseKind,
  DduItem,
  PreviewContext,
  Previewer,
} from "https://deno.land/x/ddu_vim@v3.4.3/types.ts";
import { QDict } from "../atcoder_facilitator/qdict.ts";

export interface ActionData {
  qdict: QDict;
}

type PreviewParams = {
  kind: string;
  sdicts: Array<SDict>;
};

type SDict = {
  title: string;
  sid: {
    date: string;
    sid: number;
  };
  status: string;
};

interface ActionFlagParams {
  actionFlag: string;
}

type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  sdicts: Array<SDict> = [];

  override actions: Actions<Params> = {
    getStatus: async (
      args: { denops: Denops; items: DduItem[]; actionParams: unknown },
    ) => {
      let ret: Array<SDict> = new Array(0);
      for (const item of args.items) {
        const action = item.action as ActionData;
        ret = ret.concat(
          await args.denops.call("atcoder_facilitator#getStatus", {
            qdict: action.qdict,
          }) as Array<SDict>,
        );
        if (
          selectFlag((args.actionParams as ActionFlagParams).actionFlag) ==
            ActionFlags.None
        ) {
          console.log(refineSDict(action.qdict).join("\n"));
        }
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
