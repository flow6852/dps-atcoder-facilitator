import { getSetCookies } from "https://deno.land/std@0.179.0/http/cookie.ts";
import {
  DOMParser,
} from "https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts";
import { Denops } from "https://deno.land/x/denops_std@v4.0.0/mod.ts";
import {
  ContestsArgs,
  LoginArgs,
  QuestionsArgs,
  RunDebugArgs,
  RunTestArgs,
  RunTestResult,
  StatusAfterSubmit,
  SubmitArgs,
} from "./types.ts";
import { QDict, Question } from "./qdict.ts";
import { Session } from "./session.ts";

type ExecStatus = {
  status: string;
  output: string;
};

const ATCODER_URL = "https://atcoder.jp";

export function main(denops: Denops): void {
  const questions: Array<Question> = Array<Question>(0);
  const session: Session = new Session();
  denops.dispatcher = {
    async getQDicts(): Promise<unknown> {
      // return await new Promise((_resolve) => {return questions.map((qdict) => qdict.getQDict())});
      return questions.map((qdict) => qdict.getQDict());
    },
    async login(args: unknown): Promise<void> { // {csrf_token, cookie}
      await session.login(
        (args as LoginArgs).username,
        (args as LoginArgs).password,
      );
    },

    async getQuestions(args: unknown): Promise<void> {
      for (const qname of (args as QuestionsArgs).qnames) {
        const url = ATCODER_URL + "/contests/" + qname.split("_")[0] +
          "/tasks/" + qname;
        const question = new Question(url);
        if (questions.reduce((flg, qdict) => flg && qdict.url != url, true)) {
          if (
            await question.fetchQuestion(
              denops,
              (args as QuestionsArgs).lang,
              session,
            )
          ) {
            questions.push(question);
          } else {
            console.error(
              "can't get from " + ATCODER_URL + "/contests/" +
                qname.split("_")[0] + "/tasks/" + qname,
            );
          }
        }
      }
    },

    async getContests(args: unknown): Promise<void> {
      for (const cname of (args as ContestsArgs).cnames) {
        await getContestsURLs(denops, cname, session);
        const urls = await getContestsURLs(denops, cname, session);
        for (const url of urls) {
          if (
            questions.reduce((flg, qdict) => flg && qdict.url != url, true)
          ) {
            const question = new Question(url);
            if (
              await question.fetchQuestion(
                denops,
                (args as QuestionsArgs).lang,
                session,
              )
            ) {
              questions.push(question);
            } else {
              console.error(
                "can't get from " + url,
              );
            }
          }
        }
      }
    },

    async submit(args: unknown): Promise<unknown> {
      let selector: string;
      if ((args as SubmitArgs).qname != undefined) {
        selector = (args as SubmitArgs).qname as string;
      } else if ((args as SubmitArgs).qdict != undefined) {
        selector = ((args as SubmitArgs).qdict as QDict).url;
      } else {
        return -1;
      }

      const qname = new RegExp(selector);

      let i = 0;
      for (i = 0; i < questions.length; i++) {
        if (qname.test(questions[i].url)) {
          break;
        }
      }

      if (i >= questions.length) return -1;

      return await questions[i].postSubmit(
        denops,
        session,
        (args as SubmitArgs).file,
        (args as SubmitArgs).progLang,
      );
    },

    async statusAfterSubmit(args: unknown): Promise<unknown> {
      const qdict: Question = new Question((args as StatusAfterSubmit).qdict);

      await qdict.fetchStatus(denops, session, qdict.sids[0].sid);
      let judgeStatus = qdict.sids[0].status;
      while (judgeStatus.includes("/") || judgeStatus.includes("WJ")) {
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        await qdict.fetchStatus(denops, session, qdict.sids[0].sid);
        judgeStatus = qdict.sids[0].status;
      }
      return judgeStatus;
    },

    async runTests(args: unknown): Promise<unknown> { // test automatically
      const results: Array<RunTestResult> = new Array(0);
      const buildCmd = (args as RunTestArgs).buildCmd;
      const execCmd = (args as RunTestArgs).execCmd;
      const buildResult = await new Deno.Command(
        buildCmd[0],
        { args: buildCmd.slice(1).length < 1 ? [""] : buildCmd.slice(1) },
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
        const output = await exec(ioExample.inputExample, execCmd);
        if (output.status == "TLE") {
          results.push({
            status: "TLE",
            inputExample: ioExample.inputExample,
            outputExample: ioExample.outputExample,
            result: "",
          });
        } else if (
          matchResultOutput(
            output.output,
            ioExample.outputExample,
          )
        ) {
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
      const buildCmd = (args as RunDebugArgs).buildCmd;
      const execCmd = (args as RunDebugArgs).execCmd;

      const buildResult = await new Deno.Command(
        buildCmd[0],
        { args: buildCmd.slice(1) },
      ).output();
      if (!buildResult.success) {
        console.error(new TextDecoder().decode(buildResult.stderr));
      }
      const result = await exec((args as RunDebugArgs).debugInput, execCmd);
      return result.output;
    },
  };
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
    for (const tr of trs.getElementsByTagName("tr")) {
      if (tr.getElementsByTagName("a").length < 1) continue;
      else {urls.push(
          ATCODER_URL + tr.getElementsByTagName("a")[0].getAttribute("href"),
        );}
    }
  }
  return urls;
}

async function exec(
  inputStr: string,
  execCmd: Array<string>,
): Promise<ExecStatus> {
  let result = { status: "Pre", output: "" };
  const echoOutputExample = await new Deno.Command("echo", {
    args: ["-e", inputStr],
    stdout: "piped",
  }).output();
  const execResult = new Deno.Command(
    execCmd[0],
    {
      args: execCmd.slice(1).length < 1 ? [""] : execCmd.slice(1),
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
      output: new TextDecoder().decode(
        (output as Deno.CommandOutput).stdout,
      ),
    };
  } else if (flg) {
    result = {
      status: "TLE",
      output: "",
    };
  } else {
    console.error("exec error");
    console.error(
      new TextDecoder().decode((output as Deno.CommandOutput).stderr),
    );
  }
  return result;
}
