import { getSetCookies } from "https://deno.land/std@0.179.0/http/cookie.ts";
import {
  DOMParser,
} from "https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts";
import { Denops } from "https://deno.land/x/denops_std@v4.0.0/mod.ts";
import {
  ContestsArgs,
  LoginArgs,
  StatusAfterSubmit,
  QuestionsArgs,
  RunDebugArgs,
  RunTestArgs,
  RunTestResult,
  StatusArgs,
  StatusResult,
  SubmitArgs,
} from "./types.ts";
import { Question } from "./qdict.ts";
import { Session } from "./session.ts";

const ATCODER_URL = "https://atcoder.jp";

export function main(denops: Denops): void {
  denops.dispatcher = {
    async login(args: unknown): Promise<unknown> { // {csrf_token, cookie}
      const session = new Session();
      await session.login(
        (args as LoginArgs).username,
        (args as LoginArgs).password,
      );
      return session.getSessionDict();
    },

    async getQuestions(args: unknown): Promise<unknown> {
      const qdict = new Array(0);
      const session = new Session((args as QuestionsArgs).session);
      for (const qname of (args as QuestionsArgs).qnames) {
        const question = new Question(
          ATCODER_URL + "/contests/" + qname.split("_")[0] + "/tasks/" + qname,
        );
        await question.fetchQuestion(
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
      return {
        qdict: qdict,
        session: session.getSessionDict(),
      };
    },

    async getContests(args: unknown): Promise<unknown> {
      const session = new Session((args as ContestsArgs).session);
      const qdict = new Array(0);
      for (const cname of (args as ContestsArgs).cnames) {
        await getContestsURLs(cname, session);
        const urls = await getContestsURLs(cname, session);
        for (const url of urls) {
          const question = new Question(url);
          await question.fetchQuestion(
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

      return {
        qdict: qdict,
        session: session.getSessionDict(),
      };
    },

    async submit(args: unknown): Promise<unknown> {
      const session = new Session((args as SubmitArgs).session);
      const qdict = new Question((args as SubmitArgs).qdict);
      const url = qdict.url.split("/").slice(0, -2).join("/") +
        "/submit";
      const taskScreenName = qdict.url.split("/").at(-1);
      if (taskScreenName == undefined) {
        return {
          qdict: qdict.getQDict(),
          session: session.getSessionDict(),
        };
      }

      const getIds = await getLangId(
        (args as SubmitArgs).progLang,
        session,
      );
      if (getIds == null) {
        return {
          qdict: qdict.getQDict(),
          sessoin: session.getSessionDict(),
        };
      }

      const sourceCode = await Deno.readTextFile(
        (await denops.call("getcwd") as string) + "/" +
          (args as SubmitArgs).file,
      );
      const csrf_token = (args as SubmitArgs).session.csrf_token;

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

      session.updateCookieString(getSetCookies(response.headers));
      const locUrl = response.headers.get("location");
      const dateUrl = response.headers.get("date");
      let sid = -1;
      if (locUrl != null) {
        const resForSid = await fetch(ATCODER_URL + locUrl, {
          headers: { cookie: session.cookieString },
        });
        session.updateCookieString(getSetCookies(resForSid.headers));
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
            (args as SubmitArgs).progLang + ")",
        );
      }

      return {
        qdict: qdict.getQDict(),
        session: session.getSessionDict(),
        sid: sid,
      };
    },

    async statusAfterSubmit(args: unknown): Promise<void> {
      const session = new Session((args as StatusAfterSubmit).session);
      const qdict = new Question((args as StatusAfterSubmit).qdict);
      const isRefreshDdu = (args as StatusAfterSubmit).isRefreshDdu;
      let judgeStatus =
        (await getStatus(session, qdict, qdict.sids[0].sid))[0].status;
      while (judgeStatus.includes("/") || judgeStatus.includes("WJ")) {
        if(isRefreshDdu) await denops.call("ddu#ui#do_action", "refreshItems");
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        judgeStatus =
          (await getStatus(session, qdict, qdict.sids[0].sid))[0].status;
      }
      if(isRefreshDdu) await denops.call("ddu#ui#do_action", "refreshItems");
      else console.log(judgeStatus);
    },

    async runTests(args: unknown): Promise<unknown> { // test automatically
      const results: Array<RunTestResult> = new Array(0);
      const buildResult = await new Deno.Command(
        (args as RunTestArgs).buildCmd[0],
        { args: (args as RunTestArgs).buildCmd.slice(1) },
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
        const echoOutputExample = await new Deno.Command("echo", {
          args: ["-e", ioExample.inputExample],
          stdout: "piped",
        }).output();
        const execResult = new Deno.Command(
          (args as RunTestArgs).execCmd[0],
          {
            args: (args as RunTestArgs).execCmd.slice(1),
            stdin: "piped",
            stdout: "piped",
            stderr: "piped",
          },
        ).spawn();
        // input
        const input = execResult.stdin.getWriter();
        await input.write(echoOutputExample.stdout);
        await input.close();

        const output = await execResult.output();

        if ((await execResult.status).success) {
          if (
            matchResultOutput(
              new TextDecoder().decode(output.stdout),
              ioExample.outputExample,
            )
          ) {
            results.push({
              status: "AC",
              inputExample: ioExample.inputExample,
              outputExample: ioExample.outputExample,
              result: new TextDecoder().decode(output.stdout),
            });
          } else {
            results.push({
              status: "WA",
              inputExample: ioExample.inputExample,
              outputExample: ioExample.outputExample,
              result: new TextDecoder().decode(output.stdout),
            });
          }
        } else {
          console.error("exec error");
          console.error(new TextDecoder().decode(output.stderr));
        }
      }
      return results;
    },

    async runDebug(args: unknown): Promise<unknown> { // test manually
      const results: Array<string> = new Array(0);
      const buildResult = await new Deno.Command(
        (args as RunTestArgs).buildCmd[0],
        { args: (args as RunDebugArgs).buildCmd.slice(1) },
      ).output();
      if (!buildResult.success) {
        console.error(new TextDecoder().decode(buildResult.stderr));
      }

      const echoOutputExample = await new Deno.Command("echo", {
        args: ["-e", (args as RunDebugArgs).debugInput],
        stdout: "piped",
      }).output();
      const execResult = new Deno.Command(
        (args as RunDebugArgs).execCmd[0],
        {
          args: (args as RunDebugArgs).execCmd.slice(1),
          stdin: "piped",
          stdout: "piped",
          stderr: "piped",
        },
      ).spawn();
      // input
      const input = execResult.stdin.getWriter();
      await input.write(echoOutputExample.stdout);
      await input.close();

      const output = await execResult.output();

      if ((await execResult.status).success) {
        results.push(new TextDecoder().decode(output.stdout));
      } else {
        console.error("exec error");
        console.error(new TextDecoder().decode(output.stderr));
      }
      return results;
    },

    async getStatus(args: unknown): Promise<unknown> {
      const session: Session = new Session((args as StatusArgs).session);
      let statuses: Array<StatusResult> = new Array(0);
      for (const item of (args as StatusArgs).qdict) {
        statuses = statuses.concat(
          await getStatus(session, new Question(item)),
        );
      }

      return { session: session.getSessionDict(), statuses: statuses };
    },
  };
}

function matchResultOutput(result: string, output: string): boolean {
  let ret = true;
  const resultSplit = result.split("\n");
  const outputSplit = output.split("\n");
  if (resultSplit.length != outputSplit.length) {
    ret = false;
  } else {
    for (let i = 0; i < resultSplit.length; i++) {
      if (resultSplit[i].indexOf(outputSplit[i])) {
        ret = false;
      }
    }
  }
  return ret;
}

async function getContestsURLs(
  cname: string,
  session: Session,
): Promise<Array<string>> {
  const url = ATCODER_URL + "/contests/" + cname + "/tasks";
  const response = await fetch(url, {
    headers: { cookie: session.cookieString },
    credentials: "include",
  });

  const cookies = getSetCookies(response.headers);
  session.updateCookieString(cookies);

  // parse part
  const urls: Array<string> = new Array(0);
  const trs = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  if (trs == null) {
    console.error("parse error");
  } else {
    for (const tr of trs.getElementsByTagName("tr")) {
      if (tr.getElementsByTagName("a").length < 1) continue;
      else {urls.push(
          ATCODER_URL + tr.getElementsByTagName("a")[0].getAttribute("href"),
        );}
    }
  }
  return urls;
}

async function getLangId(
  lang: string,
  session: Session,
): Promise<string | null> {
  const response = await fetch(ATCODER_URL + "/contests/practice/submit", {
    method: "GET",
    headers: { cookie: session.cookieString },
    credentials: "include",
  });

  const cookies = getSetCookies(response.headers);
  session.updateCookieString(cookies);
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
  session: Session,
  qdict: Question,
  sid?: number,
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
  session.updateCookieString(getSetCookies(response.headers));

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
