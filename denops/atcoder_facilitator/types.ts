import { isQDict, QDict } from "./qdict.ts";
import { isSessionDict, SessionDict } from "./session.ts";
import { is } from "https://deno.land/x/unknownutil@v3.4.0/mod.ts";

export type LoginArgs = {
  username: string;
  password: string;
};

const isLoginArgs = is.ObjectOf({
  username: is.String,
  password: is.String,
});

export type QuestionsArgs = {
  qnames: Array<string>;
  lang: string;
  session: SessionDict;
};

const isQuestionsArgs = is.ObjectOf({
  qnames: is.ArrayOf(is.String),
  lang: is.String,
  session: isSessionDict,
});

export type ContestsArgs = {
  cnames: Array<string>;
  lang: string;
  session: SessionDict;
};

const isContestsArgs = is.ObjectOf({
  cnames: is.ArrayOf(is.String),
  lang: is.String,
  session: isSessionDict,
});

export type SubmitArgs = {
  qname?: string;
  qdict?: QDict;
  file: string;
  progLang: string;
};

const isSubmitArgs = is.ObjectOf({
  file: is.String,
  progLang: is.String,
});

export type RunTestArgs = {
  qdict: QDict;
  buildCmd: Array<string>;
  execCmd: Array<string>;
};

const isRunTestArgs = is.ObjectOf({
  qdict: isQDict,
  buildCmd: is.ArrayOf(is.String),
  execCmd: is.ArrayOf(is.String),
});

export type RunDebugArgs = {
  debugInput: string;
  buildCmd: Array<string>;
  execCmd: Array<string>;
};

const isRunDebugArgs = is.ObjectOf({
  debugInput: is.String,
  buildCmd: is.ArrayOf(is.String),
  execCmd: is.ArrayOf(is.String),
});

export type IOExample = {
  inputExample: string;
  outputExample: string;
  comment?: string;
};

const isIOExample = is.ObjectOf({
  inputExample: is.String,
  outputExample: is.String,
});

export type Sid = {
  date: string;
  sid: number;
  status: string;
};

const isSid = is.ObjectOf({
  date: is.String,
  sid: is.Number,
  status: is.String,
});

export type StatusArgs = {
  qdict: Array<QDict>;
  session: SessionDict;
};

const isStatusArgs = is.ObjectOf({
  qdict: is.ArrayOf(isQDict),
  session: isSessionDict,
});

export type RunTestResult = {
  status: string;
  inputExample: string;
  outputExample: string;
  result: string;
};

const isRunTestResult = is.ObjectOf({
  status: is.String,
  inputExample: is.String,
  outputExample: is.String,
  result: is.String,
});

export type StatusResult = {
  title: string;
  sid: Sid;
  status: string;
};

const isStatusResult = is.ObjectOf({
  title: is.String,
  sid: isSid,
  status: is.String,
});

export type StatusAfterSubmit = {
  qdict: QDict;
};

const isStatusAfterSubmit = is.ObjectOf({
  qdict: isQDict,
});
