import { getSetCookies } from "https://deno.land/std@0.179.0/http/cookie.ts";
import {
  DOMParser,
} from "https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts";
import { Denops } from "https://deno.land/x/denops_std@v4.0.0/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v4.0.0/variable/mod.ts";
import {
  ContestsArgs,
  LoginArgs,
  QuestionsArgs,
  RunDebugArgs,
  RunTestArgs,
  RunTestResult,
  StatusAfterSubmit,
  StatusResult,
  SubmitArgs,
} from "./types.ts";
import { Question, QDict } from "./qdict.ts";
import { Session, SessionDict } from "./session.ts";

type ExecStatus = {
  status: string,
  output: string
}

const ATCODER_URL = "https://atcoder.jp";

export function main(denops: Denops): void {
  denops.dispatcher = {
    async login(args: unknown): Promise<void> { // {csrf_token, cookie}
      const session = new Session();
      await session.login(
        (args as LoginArgs).username,
        (args as LoginArgs).password,
      );
      await vars.globals.set(denops, "atcoder_facilitator#session", session.getSessionDict());
    },

    async getQuestions(args: unknown): Promise<void> {
      const beforeQDict = await vars.globals.get(denops, "atcoder_facilitator#qdict") as Array<QDict>
      const sess = await vars.globals.get(denops, "atcoder_facilitator#session") as SessionDict
      if (sess == undefined) return

      const qdict = new Array(0);
      const session = new Session(sess);
      for (const qname of (args as QuestionsArgs).qnames) { 
        const url = ATCODER_URL + "/contests/" + qname.split("_")[0] + "/tasks/" + qname
        const question = new Question(url);
        if (beforeQDict.reduce(((flg, qdict) => flg && qdict.url != url), true)){
          await question.fetchQuestion(
            denops,
            (args as QuestionsArgs).lang,
            session,
          );
          if (question.getQDict() == undefined) {
            console.error(
              "can't get from " + ATCODER_URL + "/contests/" +
                qname.split("_")[0] + "/tasks/" + qname,
            );
          } else {
            qdict.push(question.getQDict());
          }
        }
      }
      await vars.globals.set(denops, "atcoder_facilitator#qdict", beforeQDict.concat(qdict));
      await vars.globals.set(denops, "atcoder_facilitator#session", session.getSessionDict());
    },

    async getContests(args: unknown): Promise<void> {
      const beforeQDict = await vars.globals.get(denops, "atcoder_facilitator#qdict") as Array<QDict>
      const sess = await vars.globals.get(denops, "atcoder_facilitator#session") as SessionDict
      if (sess == undefined) return

      const session = new Session(sess);
      const qdict = new Array(0);
      for (const cname of (args as ContestsArgs).cnames) {
        await getContestsURLs(denops, cname, session);
        const urls = await getContestsURLs(denops, cname, session);
        for (const url of urls) {
          if (beforeQDict.reduce(((flg, qdict) => flg && qdict.url != url), true)){
            const question = new Question(url);
            await question.fetchQuestion(
            denops,
              (args as QuestionsArgs).lang,
              session,
            );
            if (question.getQDict() == undefined) {
              console.error(
                "can't get from " + url,
              );
            } else {
              qdict.push(question.getQDict());
            }
          }
        }
      }
      await vars.globals.set(denops, "atcoder_facilitator#qdict", beforeQDict.concat(qdict));
      await vars.globals.set(denops, "atcoder_facilitator#session", session.getSessionDict());
    },

    async submit(args: unknown): Promise<unknown> {
      const sess = await vars.globals.get(denops, "atcoder_facilitator#session") as SessionDict
      const qds = await vars.globals.get(denops, "atcoder_facilitator#qdict") as Array<QDict>
      if (sess  == undefined || qds == undefined) {
        return -1
      }
      let selector: string
      if((args as SubmitArgs).qname == undefined && (args as SubmitArgs).qdict == undefined){
        return -1
      }
      else if((args as SubmitArgs).qname != undefined){
        selector = (args as SubmitArgs).qname
      } else if ((args as SubmitArgs).qdict != undefined) {
        selector = (args as SubmitArgs).qdict.url
      } else {
        return -1
      }

      const reg = new RegExp(selector)
      return await submit(denops, new Session(sess), qds, reg, (args as SubmitArgs).file)
    },

    async statusAfterSubmit(args: unknown): Promise<void> {
      const sess = await vars.globals.get(denops, "atcoder_facilitator#session") as SessionDict
      const qds = await vars.globals.get(denops, "atcoder_facilitator#qdict") as Array<QDict>
      if (sess  == undefined || qds == undefined) {
        return
      }
      const session = new Session(sess as SessionDict)
      let i = 0;
      for (i = 0; i < qds.length; i++){
        if ((args as StatusAfterSubmit).qdict.url == qds[i].url){
          break;
        }
      }

      if (i >= qds.length) return ;

      const qdict : Question = new Question(qds[i])

      const isRefreshDdu = (args as StatusAfterSubmit).isRefreshDdu;
      let judgeStatus =
        (await getStatus(denops, session, qdict, qdict.sids[0].sid))[0].status;
      while (judgeStatus.includes("/") || judgeStatus.includes("WJ")) {
        if (isRefreshDdu) await denops.call("ddu#ui#do_action", "refreshItems");
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        judgeStatus =
          (await getStatus(denops, session, qdict, qdict.sids[0].sid))[0].status;
      }
      if (isRefreshDdu) await denops.call("ddu#ui#do_action", "refreshItems");
      else console.log(judgeStatus);
    },

    async runTests(args: unknown): Promise<unknown> { // test automatically
      const results: Array<RunTestResult> = new Array(0);
      const buildCmd = await vars.globals.get(denops, "atcoder_facilitator#buildCmd", []) as Array<string>
      const buildResult = await new Deno.Command(
        buildCmd[0],
        { args: buildCmd.slice(1) },
      ).output();
      if (!buildResult.success) {
        console.error(new TextDecoder().decode(buildResult.stderr));
        return results;
      }
      
      const question = new Question((args as RunTestArgs).qdict);
      if (question.ioExamples == undefined) {
        console.error("question not found ioExample");
        return results;
      }
      for (const ioExample of question.ioExamples) {
        const output = await exec(denops, ioExample.inputExample)
        if (output.status == "TLE"){
          results.push({
            status: "TLE",
            inputExample: ioExample.inputExample,
            outputExample: ioExample.outputExample,
            result: ""
          })
        }
        else if (
          matchResultOutput(
            output.output,
            ioExample.outputExample,
        )) {
          results.push({
            status: "AC",
            inputExample: ioExample.inputExample,
            outputExample: ioExample.outputExample,
            result: output.output,
          });
        } else {
          results.push({
            status: "WA",
            inputExample: ioExample.inputExample,
            outputExample: ioExample.outputExample,
            result: output.output,
          });
        }
      }
      return results;
    },

    async runDebug(args: unknown): Promise<unknown> { // test manually
      const buildCmd = await vars.globals.get(denops, "atcoder_facilitator#buildCmd", []) as Array<string>
      const buildResult = await new Deno.Command(
        buildCmd[0],
        { args: buildCmd.slice(1) },
      ).output();
      if (!buildResult.success) {
        console.error(new TextDecoder().decode(buildResult.stderr));
      }
      const result = await exec(denops, (args as RunDebugArgs).debugInput)
      return result.output;
    },
  };
}

async function submit (denops: Denops, session: Session, qds: Array<QDict>, qname: RegExp, file: string): Promise<number> {
  let i = 0;
  for (i = 0; i < qds.length; i++){
    if (qname.test(qds[i].url)){
      break;
    }
  }

  if (i >= qds.length) return -1;

  const qdict : Question = new Question(qds[i])

  const url = qdict.url.split("/").slice(0, -2).join("/") +
    "/submit";
  const taskScreenName = qdict.url.split("/").at(-1);
  if (taskScreenName == undefined) {
    return -1
  }

  const progLang = await vars.globals.get(denops, "atcoder_facilitator#progLang") as string
  
  const getIds = await getLangId(
    denops, 
    progLang,
    session,
  );
  if (getIds == null) {
    return -1
  }
  
  const sourceCode = await Deno.readTextFile(
    (await denops.call("getcwd") as string) + "/" +
      file,
  );
  
  const csrf_token = session.csrf_token;
  
  const body = new FormData();
  
  body.append("csrf_token", csrf_token);
  body.append("data.TaskScreenName", taskScreenName);
  body.append("data.LanguageId", getIds);
  body.append("sourceCode", sourceCode);
  
  const req: Request = new Request(url, {
    method: "POST",
    body: body,
    headers: { cookie: session.cookieString },
    redirect: "manual",
    credentials: "include",
  });
  const response = await fetch(req);
  
  session.updateSession(denops, getSetCookies(response.headers));
  const locUrl = response.headers.get("location");
  const dateUrl = response.headers.get("date");
  let sid = -1;
  if (locUrl != null) {
    const resForSid = await fetch(ATCODER_URL + locUrl, {
      headers: { cookie: session.cookieString },
    });
    session.updateSession(denops, getSetCookies(resForSid.headers));
    const bodyForSid = new DOMParser().parseFromString(
      await resForSid.text(),
      "text/html",
    );
    if (dateUrl && resForSid.ok && bodyForSid != null) {
      qdict.appendSid(bodyForSid, dateUrl);
      sid = qdict.sids[0].sid;
    }
    console.log("submit succeed.");
  } else {
    console.error("submit failed.");
    console.error("data.TaskScreenName = " + taskScreenName);
    console.error(
      "data.LanguageId = " + getIds + "(" +
        progLang + ")",
    );
  }
  await vars.globals.set(denops, "atcoder_facilitator#qdict[" + i + "]", qdict.getQDict())
  await vars.globals.set(denops, "atcoder_facilitator#session", session.getSessionDict());
  return sid 
}

function matchResultOutput(result: string, output: string): boolean {
  let ret = true;
  const resultSplit = result.replace(/[\s\n]*$/g, "").split("\n");
  const outputSplit = output.replace(/[\s\n]*$/g, "").split("\n");
  if (resultSplit.length != outputSplit.length) {
    ret = false;
  } else {
    for (let i = 0; i < resultSplit.length; i++) {
      if (resultSplit[i] != outputSplit[i]) {
        ret = false;
      }
    }
  }
  return ret;
}

async function getContestsURLs(
  denops: Denops,
  cname: string,
  session: Session,
): Promise<Array<string>> {
  const url = ATCODER_URL + "/contests/" + cname + "/tasks";
  const response = await fetch(url, {
    headers: { cookie: session.cookieString },
    credentials: "include",
  });

  const cookies = getSetCookies(response.headers);
  session.updateSession(denops, cookies);

  // parse part
  const urls: Array<string> = new Array(0);
  const trs = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  if (trs == null) {
    console.error("parse error");
  } else {
    for (const tr of trs.getElementsByTagName("tr")) { if (tr.getElementsByTagName("a").length < 1) continue;
      else {urls.push(
          ATCODER_URL + tr.getElementsByTagName("a")[0].getAttribute("href"),
        );}
    }
  }
  return urls;
}

async function getLangId(
  denops: Denops,
  lang: string,
  session: Session,
): Promise<string | null> {
  const response = await fetch(ATCODER_URL + "/contests/practice/submit", {
    method: "GET",
    headers: { cookie: session.cookieString },
    credentials: "include",
  });

  const cookies = getSetCookies(response.headers);
  session.updateSession(denops, cookies);
  let langid = null;

  const body = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );

  if (body == null) {
    console.error("parse error: " + ATCODER_URL + "/contests/practice/submit");
  } else {
    const ids = body
      .getElementsByTagName(
        "select",
      )[1].getElementsByTagName("option");
    for (const id of ids) {
      if (id.hasAttribute("value") && id.textContent === lang) {
        langid = id.getAttribute("value");
      } else continue;
    }
  }
  return langid;
}

export async function getStatus(
  denops: Denops,
  session: Session,
  qdict: Question,
  sid: number,
) {
  const statuses: Array<StatusResult> = Array(0);

  let url = qdict.url.split("/").slice(0, -2).join("/") +
    "/submissions/me/status/json";
  if (sid != null) {
    url += "?sids[]=" + sid;
  }
  const req: Request = new Request(url, {
    method: "GET",
    headers: { cookie: session.cookieString },
    redirect: "manual",
    credentials: "include",
  });
  const response = await fetch(req);
  session.updateSession(denops, getSetCookies(response.headers));

  const responseJson = await response.json();
  for (const key in responseJson.Result) {
    const resHTML = new DOMParser().parseFromString(
      "<table>" + responseJson.Result[key].Html + "</table>",
      "text/html",
    );
    const sid = qdict.sids.find((sid) => sid.sid == Number(key));
    if (resHTML && qdict.title && sid) {
      statuses.push({
        title: qdict.title,
        sid: sid,
        status: resHTML.getElementsByTagName("td")[0].textContent,
      });
    }
  }

  return statuses;
}

async function exec(denops: Denops, inputStr: string): Promise<ExecStatus>{
  let result = {status: "Pre", output: ""}
  const echoOutputExample = await new Deno.Command("echo", {
    args: ["-e", inputStr],
    stdout: "piped",
  }).output();
  const execCmd = await vars.globals.get(denops, "atcoder_facilitator#execCmd", []) as Array<string>
  const execResult = new Deno.Command(
    execCmd[0],
    {
      args: execCmd.slice(1),
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    },
  ).spawn();
  // input
  const input = execResult.stdin.getWriter();
  await input.write(echoOutputExample.stdout);
  await input.close();
  
  const mainExec = execResult.output();
  let flg = false;
  const wait = new Promise(() =>
    setTimeout(() => {
      try {
        execResult.kill();
        flg = true;
      } catch {
        flg = false;
      }
    }, 2 * 1000)
  );
  const output = await Promise.any([mainExec, wait]);
  
  if ((await execResult.status).success) {
      result = {
        status: "ok",
        output:
        new TextDecoder().decode(
          (output as Deno.CommandOutput).stdout,
        )
      }
  } else if (flg) {
     result = {
       status: "TLE",
       output: ""
     }
          }  else {
      console.error("exec error");
    console.error(
      new TextDecoder().decode((output as Deno.CommandOutput).stderr),
    );
  }
  return result
}
