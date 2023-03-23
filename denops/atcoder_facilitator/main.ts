import { getSetCookies } from "https://deno.land/std@0.179.0/http/cookie.ts";
import {
  DOMParser,
  Element,
  HTMLDocument,
} from "https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts";
import { Denops } from "https://deno.land/x/denops_std@v4.0.0/mod.ts";
import {
  ContestsArgs,
  LoginArgs,
  QuestionsArgs,
  RunDebugArgs,
  RunTestArgs,
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
      const session = new Session((args as QuestionsArgs).session)
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
      const session = new Session((args as SubmitArgs).session)
      const url =
        (args as SubmitArgs).qdict.url.split("/").slice(0, -2).join("/") +
        "/submit";
      const taskScreenName = (args as SubmitArgs).qdict.url.split("/").at(-1);
      if (taskScreenName == undefined) {
        return {
          session: (args as SubmitArgs).session,
        };
      }

      const getIds = await getLangId(
        (args as SubmitArgs).progLang,
        session,
      );
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
      if (response.headers.has("location")) {
        console.log("submit succeed.");
      } else {
        console.error("submit failed.");
        console.log("data.TaskScreenName = " + taskScreenName);
        console.log(
          "data.LanguageId = " + getIds + "(" +
            (args as SubmitArgs).progLang + ")",
        );
      }

      return {
        session: session,
      };
    },

    async runTests(args: unknown): Promise<void> { // test automatically
      const buildResult = await new Deno.Command(
        (args as RunTestArgs).buildCmd[0],
        { args: (args as RunTestArgs).buildCmd.slice(1) },
      ).output();
      if (!buildResult.success) {
        console.error(new TextDecoder().decode(buildResult.stderr));
      }
      for (const ioExample of (args as RunTestArgs).qdict.ioExamples) {
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

        // getStatus
        if ((await execResult.status).success) {
          if (
            matchResultOutput(
              new TextDecoder().decode(output.stdout),
              ioExample.outputExample,
            )
          ) {
            console.log("AC");
          } else {
            console.log("WA");
            console.log(new TextDecoder().decode(output.stdout));
          }
        } else {
          console.error("exec error");
          console.error(new TextDecoder().decode(output.stderr));
        }
      }
    },

    async runDebug(args: unknown): Promise<void> { // test manually
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

      // getStatus
      if ((await execResult.status).success) {
        console.log(new TextDecoder().decode(output.stdout));
      } else {
        console.error("exec error");
        console.error(new TextDecoder().decode(output.stderr));
      }
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

async function getContestsURLs(cname: string, session: Session): Promise<Array<string>> {
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
    for (const tr of trs.querySelectorAll("tr")) {
      if (
        tr.children.item(0).querySelector("a") != null
      ) {
        urls.push(
          ATCODER_URL +
            (tr as Element).children.item(0).querySelector("a").getAttribute(
              "href",
            ),
        );
      }
    }
  }
  return urls;
}

async function getLangId(
  lang: string,
  session: Session,
): Promise<string> {
  const response = await fetch(ATCODER_URL + "/contests/practice/submit", {
    method: "GET",
    headers: { cookie: session.cookieString },
    credentials: "include",
  });

  const cookies = getSetCookies(response.headers);
  session.updateCookieString(cookies)
  let langid = "0";

  const body = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  if (body == null) {
    console.error("parse error: " + ATCODER_URL + "/contests/practice/submit");
  } else {
    const ids = body
      .querySelectorAll(
        "select",
      ).item(1).children;
    for (let i = 1; i < ids.length; i++) {
      if (ids.item(i).textContent === lang) {
        langid = ids.item(i).getAttribute("value");
      }
    }
  }
  return langid;
}
