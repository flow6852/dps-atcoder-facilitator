import { QDict } from "./qdict.ts"
import { SessionDict } from "./session.ts"

export type LoginArgs = {
  username: string;
  password: string;
};

export type QuestionsArgs = {
  qnames: Array<string>;
  lang: string;
  session: SessionDict;
};

export type ContestsArgs = {
  cnames: Array<string>;
  lang: string;
  session: SessionDict;
};

export type SubmitArgs = {
  qdict: QDict;
  progLang: string;
  file: string;
  session: SessionDict;
};

export type RunTestArgs = {
  qdict: QDict;
  buildCmd: Array<string>;
  execCmd: Array<string>;
};

export type RunDebugArgs = {
  debugInput: string;
  buildCmd: Array<string>;
  execCmd: Array<string>;
};

export type IOExample = {
  inputExample: string;
  outputExample: string;
  comment: string | undefined;
};

export type Sid = {
  date: string;
  sid: number;
}

export type StatusArgs = {
  qdict: QDict,
  session: SessionDict,
}

export type RunTestResult = {
  status: string
  inputExample: string,
  outputExample: string,
  result: string,
}

export type StatusResult = {
  title: string;
  sid: Sid;
  status: string;
}
