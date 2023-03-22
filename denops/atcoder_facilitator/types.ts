type LoginArgs = {
  username: string;
  password: string;
}

type QuestionsArgs = {
  qnames: Array<string>;
  lang: string;
  loginSession: LoginSession;
}

type ContestsArgs = {
  cnames: Array<string>;
  lang: string;
  loginSession: LoginSession;
}

type SubmitArgs = {
  qlist: QList;
  progLang: string;
  file: string;
  loginSession: LoginSession;
}

type RunTestArgs = {
  qlist: QList;
  buildCmd: Array<string>;
  execCmd: Array<string>;
}

type RunDebugArgs = {
  debugInput: string;
  buildCmd: Array<string>;
  execCmd: Array<string>;
}

type IOExample = {
  inputExample: string;
  outputExmaple: string;
  comments: string;
}

type QList = {
  url: string;
  timeMemoryLimit: string;
  title: string;
  problem: string;
  constraint: string;
  inputStyle: string;
  outputStyle: string;
  ioExamples: Array<IOExample>;
}

type LoginSession = {
  csrf_token: string;
  cookieString: string;
}
