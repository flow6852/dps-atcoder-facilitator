import {
  Cookie,
  getSetCookies,
} from "https://deno.land/std@0.195.0/http/cookie.ts";
import { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v5.0.1/variable/mod.ts";
import { is } from "https://deno.land/x/unknownutil@v3.4.0/mod.ts";

export type SessionDict = {
  csrf_token: string;
  cookieString: string;
};

export const isSessionDict = is.ObjectOf({
  csrf_token: is.String,
  cookieString: is.String,
});

export class Session {
  csrf_token = "";
  cookieString = "";
  LOGIN_URL = "https://atcoder.jp/login";

  constructor(sessionDict?: SessionDict) {
    if (
      sessionDict != undefined && sessionDict.csrf_token != undefined &&
      sessionDict.cookieString != undefined
    ) {
      this.csrf_token = sessionDict.csrf_token;
      this.cookieString = sessionDict.cookieString;
    }
  }

  public getSessionDict(): SessionDict {
    return {
      csrf_token: this.csrf_token,
      cookieString: this.cookieString,
    };
  }

  public async updateSession(
    denops: Denops,
    cookies: Array<Cookie>,
  ): Promise<void> {
    this.cookieString = mergeCookieString(cookies);
    await vars.globals.set(
      denops,
      "atcoder_facilitator#session",
      this.getSessionDict(),
    );
  }

  public async login(
    username: string,
    password: string,
  ): Promise<void> {
    // get csrf token
    const req = await fetch(this.LOGIN_URL);

    let cookies = getSetCookies(req.headers);
    let cookieString = mergeCookieString(cookies);

    const revelSession = cookies.find((cookie: Cookie) =>
      cookie.name == "REVEL_SESSION"
    );
    if (revelSession == undefined) return;

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
      return;
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
