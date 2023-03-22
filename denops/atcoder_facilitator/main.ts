import {
  Cookie,
  getSetCookies,
} from "https://deno.land/std@0.179.0/http/cookie.ts";
import { Denops } from "https://deno.land/x/denops_std@v4.0.0/mod.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts";
import {
  ContestsArgs,
  IOExample,
  LoginArgs,
  LoginSession,
  QList,
  QuestionsArgs,
  RunDebugArgs,
  RunTestArgs,
  SubmitArgs,
} from "./types.ts";

const ATCODER_URL = "https://atcoder.jp";

export function main(denops: Denops): void {
  denops.dispatcher = {
    async login(args: unknown): Promise<unknown> { // {csrf_token, cookie}
      return await login(
        (args as LoginArgs).username,
        (args as LoginArgs).password,
      );
    },

    async getQuestions(args: unknown): Promise<unknown> {
      const qlist = new Array(0);
      let cookieString = (args as QuestionsArgs).loginSession.cookieString;
      for (const qname of (args as QuestionsArgs).qnames) {
        const ret = await getQuestion(
          ATCODER_URL + "/contests/" + qname.split("_")[0] + "/tasks/" + qname,
          (args as QuestionsArgs).lang,
          cookieString,
        );
        qlist.push(ret[0]);
        cookieString = ret[1];
      }
      return {
        qlist: qlist,
        loginSession: {
          cookieString: cookieString,
          csrf_token: (args as QuestionsArgs).loginSession.csrf_token,
        },
      };
    },

    async getContests(args: unknown): Promise<unknown> {
      let cookieString = (args as ContestsArgs).loginSession.cookieString;
      const qlist = new Array(0);
      for (const cname of (args as ContestsArgs).cnames) {
        const urls = await getContestsURLs(cname, cookieString);
        cookieString = urls.cookieString;
        for (const url of urls.urls) {
          const ret = await getQuestion(
            url,
            (args as ContestsArgs).lang,
            cookieString,
          );
          qlist.push(ret[0]);
          cookieString = ret[1];
        }
      }
      return {
        qlist: qlist,
        loginSession: {
          cookieString: cookieString,
          csrf_token: (args as QuestionsArgs).loginSession.csrf_token,
        },
      };
    },

    async submit(args: unknown): Promise<unknown> {
      const url =
        (args as SubmitArgs).qlist.url.split("/").slice(0, -2).join("/") +
        "/submit";
      const taskScreenName = (args as SubmitArgs).qlist.url.split("/").at(-1);
      const getIds = await getLangId(
        (args as SubmitArgs).progLang,
        (args as SubmitArgs).loginSession.cookieString,
      );
      const sourceCode = await Deno.readTextFile(
        (await denops.call("getcwd") as string) + "/" +
          (args as SubmitArgs).file,
      );
      const csrf_token = (args as SubmitArgs).loginSession.csrf_token;

      const body = new FormData();

      body.append("csrf_token", csrf_token);
      body.append("data.TaskScreenName", taskScreenName);
      body.append("data.LanguageId", getIds.langId);
      body.append("sourceCode", sourceCode);

      const req: Request = new Request(url, {
        method: "POST",
        body: body,
        headers: { cookie: getIds.cookieString },
        redirect: "manual",
        credentials: "include",
      });
      const response = await fetch(req);

      const cookieString = mergeCookieString(getSetCookies(response.headers));
      if (response.headers.has("location")) {
        console.log("submit succeed.");
      } else {
        console.error("submit failed.");
        console.log("data.TaskScreenName = " + taskScreenName);
        console.log(
          "data.LanguageId = " + getIds.langId + "(" +
            (args as SubmitArgs).progLang + ")",
        );
      }

      return {
        loginSession: {
          cookieString: cookieString,
          csrf_token: (args as SubmitArgs).loginSession.csrf_token,
        },
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
      for (const ioExample of (args as RunTestArgs).qlist.ioExamples) {
        const echoOutputExample = await new Deno.Command("echo", {
          args: ["-e", ioExample.inputExample],
          stdout: "piped",
        }).output();
        const execResult = await new Deno.Command(
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
        (args as runtestargs).buildCmd[0],
        { args: (args as RunDebugArgs).buildCmd.slice(1) },
      ).output();
      if (!buildResult.success) {
        console.error(new TextDecoder().decode(buildResult.stderr));
      }

      const echoOutputExample = await new Deno.Command("echo", {
        args: ["-e", (args as RunDebugArgs).debugInput],
        stdout: "piped",
      }).output();
      const execResult = await new Deno.Command(
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

function mergeCookieString(cookies: Array<Cookie>): string {
  const retCookieString: Array<string> = new Array(0);
  for (const cke of cookies) {
    retCookieString.push(cke.name + "=" + cke["value"]);
  }
  return retCookieString.join(";");
}

async function login(username: string, password: string): Promise<LoginSession> {
  // get csrf token
  const req = await fetch(ATCODER_URL + "/login");

  let cookies = getSetCookies(req.headers);
  let cookieString = mergeCookieString(cookies);

  const csrf_token = findString(
    decodeURIComponent(
      cookies.find((cookie) => cookie.name == "REVEL_SESSION").value,
    ).split(/\x00/),
    "csrf_token",
  ).split(":")[1];

  const body = new FormData();

  body.append("csrf_token", csrf_token);
  body.append("username", username);
  body.append("password", password);

  const loginReq: Request = new Request(ATCODER_URL + "/login", {
    method: "POST",
    body: body,
    headers: { cookie: cookieString },
    redirect: "manual",
    credentials: "include",
  });

  const response = await fetch(loginReq);
  cookies = getSetCookies(response.headers);

  cookieString = mergeCookieString(cookies);

  if (cookieString.indexOf("success") < 0) {
    console.error("login failed.");
    return { csrf_token: "", cookieString: ""};
  }
  console.log("login succeed.");
  return { csrf_token: csrf_token, cookieString: cookieString };
}

async function getContestsURLs(cname: string, cookieString: string) {
  const url = ATCODER_URL + "/contests/" + cname + "/tasks";
  const response = await fetch(url, {
    headers: { cookie: cookieString },
    credentials: "include",
  });

  const cookies = getSetCookies(response.headers);
  const retCookieString = mergeCookieString(cookies);

  // parse part
  const trs = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  ).querySelectorAll("tr");
  const urls: Array<string> = new Array(0);
  for (const tr of trs) {
    if (tr.children.item(0).querySelector("a") != null) {
      urls.push(
        ATCODER_URL +
          tr.children.item(0).querySelector("a").getAttribute("href"),
      );
    }
  }
  return { urls: urls, cookieString: retCookieString };
}

async function getQuestion(
  url: string,
  lang: string,
  cookieString: string,
): Promise<[QList, string]> {
  const response = await fetch(url, {
    headers: { cookie: cookieString },
    credentials: "include",
  });

  const cookies = getSetCookies(response.headers);
  const retCookieString = mergeCookieString(cookies);

  const resText = await response.text();
  const parsed = parseQuestion(resText, lang);
  return [{ ...{ url: url }, ...parsed }, retCookieString];
}

function parseQuestion(body: string, lang: string) {
  const doc = new DOMParser().parseFromString(body, "text/html");
  const title = doc.querySelector("title").textContent;
  const rowDoc = doc.querySelector(".row").children.item(1);

  // // Time Limit / Memory Limit
  const timeMemoryLimit = rowDoc.querySelector("p").textContent;

  // task statement
  const parts = rowDoc.querySelectorAll(".part");

  let problem: string;
  let constraint: string;
  let inputStyle: string;
  let outputStyle: string;
  const ioExamples: Array<IOExample> = new Array(0);

  let problemReg = "問題文";
  let constraintReg = "制約";
  let inputStyleReg = "入力";
  let outputStyleReg = "出力";
  let inputExampleReg = "入力例";
  let outputExampleReg = "出力例";

  if (lang == "en" && rowDoc.querySelectorAll(".lang-" + lang).length > 0) {
    problemReg = "Problem Statement";
    constraintReg = "Constraints";
    inputStyleReg = "Input";
    outputStyleReg = "Output";
    inputExampleReg = "Sample Input";
    outputExampleReg = "Sample Output";
  }

  for (let i = 0; i < parts.length; i++) {
    if (
      parts[i].textContent.replace(/\n*/, "").indexOf("注意") === 0 ||
      parts[i].textContent.replace(/\n*/, "").indexOf(problemReg) === 0
    ) {
      problem = parts[i].textContent.replace(
        new RegExp("\n*(" + problemReg + "|注意)\n*"),
        "",
      ).replace(/\n+/g, "\n").replace(/\t+/g, "\t").replace(/\n*$/g, "");
    } else if (
      parts[i].textContent.replace(/\n*/, "").indexOf(constraintReg) === 0
    ) {
      constraint = parts[i].textContent.replace(
        new RegExp("\n*" + constraintReg),
        "",
      ).replace(/\n+/g, "\n").replace(/\t+/g, "\t").replace(/\n*$/g, "");
    } else if (
      parts[i].textContent.replace(/\n*/, "").indexOf(inputStyleReg) === 0 &&
      parts[i].textContent.replace(/\n*/, "").indexOf(inputExampleReg)
    ) {
      inputStyle = parts[i].textContent.replace(
        new RegExp("\n*" + inputStyleReg),
        "",
      ).replace(/\n+/g, "\n").replace(/\t+/g, "\t").replace(/\n*$/g, "");
    } else if (
      parts[i].textContent.replace(/\n*/, "").indexOf(outputStyleReg) === 0 &&
      parts[i].textContent.replace(/\n*/, "").indexOf(outputExampleReg)
    ) {
      outputStyle = parts[i].textContent.replace(
        new RegExp("\n*" + outputStyleReg),
        "",
      ).replace(/\n+/g, "\n").replace(/\t+/g, "\t").replace(/\n*$/g, "");
    } else if (
      parts[i].querySelector("h3") != null &&
      parts[i].querySelector("h3").textContent.indexOf(inputExampleReg) === 0
    ) {
      const inputExample = parts[i++].querySelector("pre").textContent.replace(
        /\n+/g,
        "\n",
      ).replace(/\t+/g, "\t").replace(/\n*$/g, "");
      const outputExample = parts[i].querySelector("pre").textContent.replace(
        /\n+/g,
        "\n",
      ).replace(/\t+/g, "\t").replace(/\n*$/g, "");
      let comment: string;
      if (parts[i].querySelector("p") != null) {
        comment = parts[i].querySelector("p").textContent.replace(/\n+/g, "\n")
          .replace(/\t+/g, "\t").replace(/\n*$/g, "");
      }
      ioExamples.push({
        inputExample: inputExample,
        outputExample: outputExample,
        comment: comment,
      });
    }
  }

  if (
    problem === undefined && constraint === undefined &&
    inputStyle === undefined && outputStyle === undefined
  ) {
    const statements = rowDoc.querySelectorAll("section, li, h3");
    for (let i = 0; i < statements.length; i++) {
      if (statements[i].textContent.indexOf("問題文") === 0) {
        problem = statements[++i].textContent.replace(/\n+/g, "\n").replace(
          /\t+/g,
          "\t",
        ).replace(/\n*$/g, "");
      } else if (statements[i].textContent.indexOf("制約") === 0) {
        constraint = statements[++i].textContent.replace(/\n+/g, "\n").replace(
          /\t+/g,
          "\t",
        ).replace(/\n*$/g, "");
      } else if (
        statements[i].textContent.indexOf("入力") === 0 &&
        statements[i].textContent.indexOf("入力例")
      ) {
        inputStyle = statements[++i].textContent.replace(/\n+/g, "\n").replace(
          /\t+/g,
          "\t",
        ).replace(/\n*$/g, "");
      } else if (
        statements[i].textContent.indexOf("出力") === 0 &&
        statements[i].textContent.indexOf("出力例")
      ) {
        outputStyle = statements[++i].textContent.replace(/\n+/g, "\n").replace(
          /\t+/g,
          "\t",
        ).replace(/\n*$/g, "");
      } else if (statements[i].textContent.indexOf("入力例") === 0) {
        const inputExample = statements[++i].textContent.replace(/\n+/g, "\n")
          .replace(/\t+/g, "\t").replace(/\n*$/g, "");
        i++;
        const outputExample = statements[++i].textContent.replace(/\n+/g, "\n")
          .replace(/\t+/g, "\t").replace(/\n*$/g, "");
        i++;
        let comments = "";
        while (
          i < statements.length && statements[i].textContent.indexOf("入力例")
        ) {
          comments = comments + "\n" +
            statements[i++].textContent.replace(/\n+/g, "\n").replace(
              /\t+/g,
              "\t",
            ).replace(/\n*$/g, "");
        }
        ioExamples.push({
          inputExample: inputExample,
          outputExample: outputExample,
          comments: comments,
        });
      }
    }
  }

  return {
    timeMemoryLimit: timeMemoryLimit.replace(/\t*/g, "").replace(/\n/g, ""),
    title: title,
    problem: problem,
    constraint: constraint,
    inputStyle: inputStyle,
    outputStyle: outputStyle,
    ioExamples: ioExamples,
  };
}

async function getLangId(lang: string, cookieString: string) {
  const response = await fetch(ATCODER_URL + "/contests/practice/submit", {
    method: "GET",
    headers: { cookie: cookieString },
    credentials: "include",
  });
  const body = await response.text();

  const cookies = getSetCookies(response.headers);
  const retCookieString = mergeCookieString(cookies);

  const ids =
    new DOMParser().parseFromString(body, "text/html").querySelectorAll(
      "select",
    ).item(1).children;
  let langid = 0;
  for (let i = 1; i < ids.length; i++) {
    if (ids.item(i).textContent === lang) {
      langid = ids.item(i).getAttribute("value");
    }
  }
  return { langId: langid, cookieString: retCookieString };
}

function findString(array: Array<string>, search: string): string {
  let ret = "";
  for (const str of array) {
    if (str.includes(search)) {
      ret = str;
    }
  }
  return ret;
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
