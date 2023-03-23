import {
  Cookie,
  getSetCookies,
} from "https://deno.land/std@0.179.0/http/cookie.ts";

export type SessionDict = {
  kind: "SessionDict";
  csrf_token: string;
  cookieString: string;
};

export class Session {
  csrf_token = "";
  cookieString = "";
  LOGIN_URL = "https://atcoder.jp/login";

  constructor(sessionDict?: SessionDict){
    if (sessionDict != undefined && sessionDict.csrf_token != undefined && sessionDict.cookieString != undefined) {
      this.csrf_token = sessionDict.csrf_token;
      this.cookieString = sessionDict.cookieString;
    }
  }

  public getSessionDict(): SessionDict {
      return {
        kind: "SessionDict",
        csrf_token: this.csrf_token,
        cookieString: this.cookieString,
    }
  }

  public updateCookieString(cookies: Array<Cookie>): void{
    this.cookieString = mergeCookieString(cookies)
  }

  public async login(
    username: string,
    password: string,
  ): Promise<void> {
    // get csrf token
    const req = await fetch(this.LOGIN_URL);

    let cookies = getSetCookies(req.headers);
    let cookieString = mergeCookieString(cookies);

    const revelSession = cookies.find((cookie) => cookie.name == "REVEL_SESSION")
    if(revelSession == undefined) return;

    const csrf_token = findString(
      decodeURIComponent(
        revelSession.value,
      ).split(new RegExp("\x00")),
      "csrf_token",
    ).split(":")[1];

    const body = new FormData();

    body.append("csrf_token", csrf_token);
    body.append("username", username);
    body.append("password", password);

    const loginReq: Request = new Request(this.LOGIN_URL, {
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
      return
    }
    console.log("login succeed.");
    this.csrf_token = csrf_token;
    this.cookieString = cookieString;
  }
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

function mergeCookieString(cookies: Array<Cookie>): string {
  const retCookieString: Array<string> = new Array(0);
  for (const cke of cookies) {
    retCookieString.push(cke.name + "=" + cke["value"]);
  }
  return retCookieString.join(";");
}
