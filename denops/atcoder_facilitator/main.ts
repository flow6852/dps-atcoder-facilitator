import { getSetCookies } from "https://deno.land/std@0.196.0/http/cookie.ts";
import {
  DOMParser,
} from "https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts";
import { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";
import {
  isContestsArgs,
  isLoginArgs,
  isQDict,
  isQuestionsArgs,
  isRunDebugArgs,
  isRunTestArgs,
  isSubmitArgs,
  RunTestResult,
} from "./types.ts";
import { Question } from "./qdict.ts";
import { Session } from "./session.ts";
import { assert, is } from "https://deno.land/x/unknownutil@v3.4.0/mod.ts";

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
      const login = args;
      assert(login, isLoginArgs);
      await session.login(
        login.username,
        login.password,
      );
    },

    async getQuestions(args: unknown): Promise<void> {
      const qargs = args;
      assert(qargs, isQuestionsArgs);
      for (const qname of qargs.qnames) {
        const url = ATCODER_URL + "/contests/" + qname.split("_")[0] +
          "/tasks/" + qname;
        const question = new Question(url);
        if (questions.reduce((flg, qdict) => flg && qdict.url != url, true)) {
          if (
            await question.fetchQuestion(
              denops,
              qargs.lang,
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
      const cargs = args;
      assert(cargs, isContestsArgs);
      for (const cname of cargs.cnames) {
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
                cargs.lang,
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
      const sargs = args;
      assert(sargs, isSubmitArgs);
      if (sargs.qname != undefined) {
        selector = sargs.qname;
      } else if (sargs.qdict != undefined) {
        const qdict = sargs.qdict;
        assert(qdict, isQDict);
        selector = qdict.url;
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
        sargs.file,
        sargs.progLang,
      );
    },

    async refreshStatus(args: unknown): Promise<void> {
      const statusId = args;
      assert(statusId, is.Number);
      for (const quest of questions) {
        for (const sid of quest.sids) {
          if (sid.sid == statusId) {
            await quest.fetchStatus(denops, session, statusId);
            break;
          }
        }
      }
    },

    async refreshStatusAll(): Promise<void> {
      const refQuests = [];
      for (const quest of questions) {
        for (const sid of quest.sids) {
          refQuests.push(quest.finJudge(denops, session, sid.sid));
        }
      }
      await Promise.all(refQuests);
    },

    async runTests(args: unknown): Promise<unknown> { // test automatically
      const results: Array<RunTestResult> = new Array(0);
      const rargs = args;
      assert(rargs, isRunTestArgs);
      const buildCmd = rargs.buildCmd;
      const execCmd = rargs.execCmd;
      const buildResult = await new Deno.Command(
        buildCmd[0],
        { args: buildCmd.slice(1).length < 1 ? [""] : buildCmd.slice(1) },
      ).output();
      if (!buildResult.success) {
        console.error(new TextDecoder().decode(buildResult.stderr));
        return results;
      }

      const question = new Question(rargs.qdict);
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
      const rargs = args;
      assert(rargs, isRunDebugArgs);
      const buildCmd = rargs.buildCmd;
      const execCmd = rargs.execCmd;

      const buildResult = await new Deno.Command(
        buildCmd[0],
        { args: buildCmd.slice(1) },
      ).output();
      if (!buildResult.success) {
        console.error(new TextDecoder().decode(buildResult.stderr));
      }
      const result = await exec(rargs.debugInput, execCmd);
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
