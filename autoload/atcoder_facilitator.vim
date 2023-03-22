function! atcoder_facilitator#login() abort
    let l:username = inputsecret("username: ")
    let l:password = inputsecret("password: ")
    let g:atcoder_facilitator#loginSession = denops#request('atcoder_facilitator', 'login', [{'username': l:username, 'password': password}])
endfunction

function! atcoder_facilitator#qgets(arg) abort
    let ret = denops#request('atcoder_facilitator', 'getQuestions', [extend(a:arg, {'lang': g:atcoder_facilitator#lang,'loginSession': g:atcoder_facilitator#loginSession})])
    call extend(g:atcoder_facilitator#qlist, get(ret, "qlist"))
    let g:atcoder_facilitator#loginSession = get(ret, "loginSession")
endfunction

function! atcoder_facilitator#cgets(arg) abort
    echo a:arg
    let ret = denops#request('atcoder_facilitator', 'getContests', [extend(a:arg, {'lang': g:atcoder_facilitator#lang,'loginSession': g:atcoder_facilitator#loginSession})])
    call extend(g:atcoder_facilitator#qlist, get(ret, "qlist"))
    let g:atcoder_facilitator#loginSession = get(ret, "loginSession")
endfunction

function! atcoder_facilitator#submit(arg) abort
    let ret = denops#request('atcoder_facilitator', 'submit', [extend(a:arg, {'file': expand('%'), 'progLang': g:atcoder_facilitator#progLang, 'loginSession': g:atcoder_facilitator#loginSession})])
    let g:atcoder_facilitator#loginSession = get(ret, "loginSession")
endfunction

function! atcoder_facilitator#runTests(arg) abort
    call denops#request('atcoder_facilitator', 'runTests', [extend(a:arg, {'buildCmd': g:atcoder_facilitator#buildCmd, 'execCmd':g:atcoder_facilitator#execCmd})])
endfunction

function! atcoder_facilitator#runDebug() abort
	let tmp = input("input > ")
	let txt = []
	while tmp != ""
		call add(txt, tmp)
		let tmp = input("input > ")
	endwhile
    call denops#request('atcoder_facilitator', 'runDebug', [{'buildCmd': g:atcoder_facilitator#buildCmd, 'execCmd':g:atcoder_facilitator#execCmd, 'debugInput': join(txt, "\n")}])
endfunction
