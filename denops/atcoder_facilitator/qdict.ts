import { IOExample, Sid } from "./types.ts";
import { Session } from "./session.ts";
import { Denops } from "https://deno.land/x/denops_std@v4.0.0/mod.ts";
import {
  DOMParser,
  HTMLDocument,
} from "https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts";
import { getSetCookies } from "https://deno.land/std@0.179.0/http/cookie.ts";

export type QDict = {
  kind: "QDict";
  url: string;
  timeMemoryLimit?: string;
  title?: string;
  problem?: string;
  constraint?: string;
  inputStyle?: string;
  outputStyle?: string;
  ioExamples?: Array<IOExample>;
  sids: Array<Sid>;
};

export class Question {
  ATCODER_URL = "https://atcoder.jp";
  url = "";
  timeMemoryLimit?: string;
  title?: string;
  problem?: string;
  constraint?: string;
  inputStyle?: string;
  outputStyle?: string;
  ioExamples?: Array<IOExample>;
  sids: Array<Sid> = new Array(0);

  constructor(url: string);
  constructor(qdict: QDict);
  constructor(arg: string | QDict) {
    if (typeof (arg) == "string") {
      this.url = arg;
    } else if (arg.kind === "QDict") {
      this.url = arg.url;
      this.title = arg.title;
      this.timeMemoryLimit = arg.timeMemoryLimit;
      this.problem = arg.problem;
      this.constraint = arg.constraint;
      this.inputStyle = arg.inputStyle;
      this.outputStyle = arg.outputStyle;
      this.ioExamples = arg.ioExamples;
      this.sids = arg.sids;
    }
  }

  getQDict(): QDict | undefined {
    if (
      this.timeMemoryLimit == null || this.title == null ||
      this.problem == null || this.inputStyle == null ||
      this.outputStyle == null
    ) {
      return undefined;
    } else {
      return {
        kind: "QDict",
        url: this.url,
        timeMemoryLimit: this.timeMemoryLimit,
        title: this.title,
        problem: this.problem,
        constraint: this.constraint,
        inputStyle: this.inputStyle,
        outputStyle: this.outputStyle,
        ioExamples: this.ioExamples,
        sids: this.sids,
      };
    }
  }

  async fetchQuestion(
    denops: Denops,
    lang: string,
    session: Session,
  ): Promise<void> {
    const response = await fetch(this.url, {
      headers: { cookie: session.cookieString },
      credentials: "include",
    });

    const cookies = getSetCookies(response.headers);
    session.updateSession(denops, cookies);

    const resText = new DOMParser().parseFromString(
      await response.text(),
      "text/html",
    );

    if (resText != null) this.parseQuestion(resText, lang);
  }

  private parseQuestion(doc: HTMLDocument, lang: string): void {
    const title = doc.getElementsByTagName("title")[0];
    // if (title == null) return;

    const row = doc.getElementsByClassName("row");
    // if (row == null) return;

    const rowDoc = row[0].textContent.includes("問題文") ? row[0] : row[1];
    // // Time Limit / Memory Limit
    const timeMemoryLimit = rowDoc.getElementsByTagName("p")[0];
    // if (timeMemoryLimit == null) return;

    let problem: string | undefined = undefined;
    let constraint: string | undefined = undefined;
    let inputStyle: string | undefined = undefined;
    let outputStyle: string | undefined = undefined;
    const ioExamples: Array<IOExample> = new Array(0);

    // task statement
    const parts = rowDoc.getElementsByClassName("part");

    let problemReg = "問題文";
    let constraintReg = "制約";
    let inputStyleReg = "入力";
    let outputStyleReg = "出力";
    let inputExampleReg = "入力例";
    let outputExampleReg = "出力例";

    if (
      lang == "en" && rowDoc.getElementsByClassName("lang-" + lang).length > 0
    ) {
      problemReg = "Problem Statement";
      constraintReg = "Constraints";
      inputStyleReg = "Input";
      outputStyleReg = "Output";
      inputExampleReg = "Sample Input";
      outputExampleReg = "Sample Output";
    }

    for (let i = 0; i < parts.length; i++) {
      if (
        parts[i].textContent.replace(/[\n\s]*/, "").indexOf("注意") === 0 ||
        parts[i].textContent.replace(/[\n\s]*/, "").indexOf(problemReg) === 0
      ) {
        problem = parts[i].textContent.replace(
          new RegExp("[\n\s]*(" + problemReg + "|注意)[\n\s]*"),
          "",
        ).replace(/\n+/g, "\n").replace(/\s+/g, " ").replace(/[\n\s]*$/g, "");
      } else if (
        parts[i].textContent.replace(/[\n\s]*/, "").indexOf(constraintReg) === 0
      ) {
        constraint = parts[i].textContent.replace(
          new RegExp("\n*" + constraintReg),
          "",
        ).replace(/\n+/g, "\n").replace(/\s+/g, " ").replace(/[\n\s]*$/g, "")
          .replace(/^\n*/g, "");
      } else if (
        parts[i].textContent.replace(/[\n\s]*/, "").indexOf(inputStyleReg) ===
          0 &&
        parts[i].textContent.replace(/[\n\s]*/, "").indexOf(inputExampleReg)
      ) {
        inputStyle = parts[i].textContent.replace(
          new RegExp("\n*" + inputStyleReg),
          "",
        ).replace(/\n+/g, "\n").replace(/\s+/g, " ").replace(/[\n\s]*$/g, "");
      } else if (
        parts[i].textContent.replace(/[\n\s]*/, "").indexOf(outputStyleReg) ===
          0 &&
        parts[i].textContent.replace(/[\n\s]*/, "").indexOf(outputExampleReg)
      ) {
        outputStyle = parts[i].textContent.replace(
          new RegExp("\n*" + outputStyleReg),
          "",
        ).replace(/\n+/g, "\n").replace(/\s+/g, " ").replace(/[\n\s]*$/g, "");
      } else if (
        parts[i].getElementsByTagName("h3") != null &&
        parts[i].getElementsByTagName("h3")[0].textContent.indexOf(
            inputExampleReg,
          ) === 0
      ) {
        const inputExample: string = parts[i++].getElementsByTagName("pre")[0]
          .textContent
          .replace(
            /\n+/g,
            "\n",
          ).replace(/\s+/g, " ").replace(/[\n\s]*$/g, "");
        const outputExample: string = parts[i].getElementsByTagName("pre")[0]
          .textContent
          .replace(
            /\n+/g,
            "\n",
          ).replace(/\s+/g, " ").replace(/[\n\s]*$/g, "");
        let comment: string | undefined = undefined;
        if (parts[i].querySelector("p") != null) {
          comment = parts[i].getElementsByTagName("p")[0].textContent.replace(
            /\n+/g,
            "\n",
          )
            .replace(/\s+/g, " ").replace(/[\n\s]*$/g, "");
        }
        ioExamples.push({
          inputExample: inputExample,
          outputExample: outputExample,
          comment: comment,
        });
      }
    }

    if (
      problem === undefined &&
      inputStyle === undefined && outputStyle === undefined
    ) {
      const statements = rowDoc.querySelectorAll("section, li, h3");
      for (let i = 0; i < statements.length; i++) {
        if (statements[i].textContent.indexOf("問題文") === 0) {
          problem = statements[++i].textContent.replace(/\n+/g, "\n").replace(
            /\s+/g,
            " ",
          ).replace(/[\n\s]*$/g, "");
        } else if (statements[i].textContent.indexOf("制約") === 0) {
          constraint = statements[++i].textContent.replace(/\n+/g, "\n")
            .replace(
              /\s+/g,
              " ",
            ).replace(/[\n\s]*$/g, "");
        } else if (
          statements[i].textContent.indexOf("入力") === 0 &&
          statements[i].textContent.indexOf("入力例")
        ) {
          inputStyle = statements[++i].textContent.replace(/\n+/g, "\n")
            .replace(
              /\s+/g,
              " ",
            ).replace(/[\n\s]*$/g, "");
        } else if (
          statements[i].textContent.indexOf("出力") === 0 &&
          statements[i].textContent.indexOf("出力例")
        ) {
          outputStyle = statements[++i].textContent.replace(/\n+/g, "\n")
            .replace(
              /\s+/g,
              " ",
            ).replace(/[\n\s]*$/g, "");
        } else if (statements[i].textContent.indexOf("入力例") === 0) {
          const inputExample = statements[++i].textContent.replace(/\n+/g, "\n")
            .replace(/\s+/g, " ").replace(/[\n\s]*$/g, "");
          i++;
          const outputExample = statements[++i].textContent.replace(
            /\n+/g,
            "\n",
          )
            .replace(/\s+/g, " ").replace(/[\n\s]*$/g, "");
          i++;
          let comment = "";
          while (
            i < statements.length && statements[i].textContent.indexOf("入力例")
          ) {
            comment = comment + "\n" +
              statements[i++].textContent.replace(/\n+/g, "\n").replace(
                /\s+/g,
                " ",
              ).replace(/[\n\s]*$/g, "");
          }
          ioExamples.push({
            inputExample: inputExample,
            outputExample: outputExample,
            comment: comment,
          });
        }
      }
    }

    if (
      problem == undefined || inputStyle == undefined ||
      outputStyle == undefined
    ) return;

    this.timeMemoryLimit = timeMemoryLimit.textContent.replace(/\t*/g, "")
      .replace(
        /\n/g,
        "",
      );
    this.title = title.textContent;
    this.problem = problem;
    this.constraint = constraint;
    this.inputStyle = inputStyle;
    this.outputStyle = outputStyle;
    this.ioExamples = ioExamples;
  }

  public appendSid(body: HTMLDocument, date: string): void {
    const tds = body.getElementsByTagName("tbody")[0].getElementsByTagName(
      "tr",
    )[0].getElementsByTagName("td");
    const sid = tds[tds.length - 1].getElementsByTagName("a")[0].getAttribute(
      "href",
    );
    if (sid != null) {
      this.sids.unshift({
        sid: Number(sid.split("/")[sid.split("/").length - 1]),
        date: date,
      });
    }
  }
}
