import { IOExample } from "./types.ts";
import { Session } from "./session.ts";
import {
  DOMParser,
  Element,
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

  constructor(url: string);
  constructor(qdict: QDict);
  constructor(arg: string | QDict) {
    if (typeof (arg) == "string") {
      this.url = arg;
    } else if (arg.kind === "QDict") {
      this.url = arg.url;
      this.timeMemoryLimit = arg.timeMemoryLimit;
      this.problem = arg.problem;
      this.constraint = arg.constraint;
      this.inputStyle = arg.inputStyle;
      this.outputStyle = arg.outputStyle;
      this.ioExamples = arg.ioExamples;
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
      };
    }
  }

  async fetchQuestion(
    lang: string,
    session: Session,
  ): Promise<void> {
    const response = await fetch(this.url, {
      headers: { cookie: session.cookieString },
      credentials: "include",
    });

    const cookies = getSetCookies(response.headers);
    session.updateCookieString(cookies);

    const resText = new DOMParser().parseFromString(
      await response.text(),
      "text/html",
    );

    if (resText != null) this.parseQuestion(resText, lang);
  }

  private parseQuestion(doc: HTMLDocument, lang: string): void {
    const title = doc.querySelector("title");
    if (title == null) return;

    const row = doc.querySelector(".row");
    if (row == null) return;

    const rowDoc = row.children.item(1);
    // // Time Limit / Memory Limit
    const timeMemoryLimit = rowDoc.querySelector("p");
    if (timeMemoryLimit == null) return;

    let problem: string | undefined = undefined;
    let constraint: string | undefined = undefined;
    let inputStyle: string | undefined = undefined;
    let outputStyle: string | undefined = undefined;
    const ioExamples: Array<IOExample> = new Array(0);

    // task statement
    const parts = rowDoc.querySelectorAll(".part");

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
        const inputExample: string = parts[i++].querySelector("pre").textContent
          .replace(
            /\n+/g,
            "\n",
          ).replace(/\t+/g, "\t").replace(/\n*$/g, "");
        const outputExample: string = parts[i].querySelector("pre").textContent
          .replace(
            /\n+/g,
            "\n",
          ).replace(/\t+/g, "\t").replace(/\n*$/g, "");
        let comment: string | undefined = undefined;
        if (parts[i].querySelector("p") != null) {
          comment = parts[i].querySelector("p").textContent.replace(
            /\n+/g,
            "\n",
          )
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
      problem === undefined &&
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
          constraint = statements[++i].textContent.replace(/\n+/g, "\n")
            .replace(
              /\t+/g,
              "\t",
            ).replace(/\n*$/g, "");
        } else if (
          statements[i].textContent.indexOf("入力") === 0 &&
          statements[i].textContent.indexOf("入力例")
        ) {
          inputStyle = statements[++i].textContent.replace(/\n+/g, "\n")
            .replace(
              /\t+/g,
              "\t",
            ).replace(/\n*$/g, "");
        } else if (
          statements[i].textContent.indexOf("出力") === 0 &&
          statements[i].textContent.indexOf("出力例")
        ) {
          outputStyle = statements[++i].textContent.replace(/\n+/g, "\n")
            .replace(
              /\t+/g,
              "\t",
            ).replace(/\n*$/g, "");
        } else if (statements[i].textContent.indexOf("入力例") === 0) {
          const inputExample = statements[++i].textContent.replace(/\n+/g, "\n")
            .replace(/\t+/g, "\t").replace(/\n*$/g, "");
          i++;
          const outputExample = statements[++i].textContent.replace(
            /\n+/g,
            "\n",
          )
            .replace(/\t+/g, "\t").replace(/\n*$/g, "");
          i++;
          let comment = "";
          while (
            i < statements.length && statements[i].textContent.indexOf("入力例")
          ) {
            comment = comment + "\n" +
              statements[i++].textContent.replace(/\n+/g, "\n").replace(
                /\t+/g,
                "\t",
              ).replace(/\n*$/g, "");
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
}
