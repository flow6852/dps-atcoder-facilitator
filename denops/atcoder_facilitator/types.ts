export type LoginArgs = {
  username: string;
  password: string;
};

export type QuestionsArgs = {
  qnames: Array<string>;
  lang: string;
  loginSession: LoginSession;
};

export type ContestsArgs = {
  cnames: Array<string>;
  lang: string;
  loginSession: LoginSession;
};

export type SubmitArgs = {
  qlist: QList;
  progLang: string;
  file: string;
  loginSession: LoginSession;
};

export type RunTestArgs = {
  qlist: QList;
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
  outputExmaple: string;
  comments: string;
};

export type QList = {
  url: string;
  timeMemoryLimit: string;
  title: string;
  problem: string;
  constraint: string;
  inputStyle: string;
  outputStyle: string;
  ioExamples: Array<IOExample>;
};

export type LoginSession = {
  csrf_token: string;
  cookieString: string;
};
