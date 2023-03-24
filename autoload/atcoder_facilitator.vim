function! atcoder_facilitator#login() abort
    let l:username = inputsecret("username: ")
    let l:password = inputsecret("password: ")
    let g:atcoder_facilitator#session = denops#request('atcoder_facilitator', 'login', [{'username': l:username, 'password': password}])
endfunction

function! atcoder_facilitator#qgets(arg) abort
    let ret = denops#request('atcoder_facilitator', 'getQuestions', [extend(a:arg, {'lang': g:atcoder_facilitator#lang,'session': g:atcoder_facilitator#session})])
    call extend(g:atcoder_facilitator#qdict, get(ret, "qdict"))
    let g:atcoder_facilitator#session = get(ret, "session")
endfunction

function! atcoder_facilitator#cgets(arg) abort
    echo a:arg
    let ret = denops#request('atcoder_facilitator', 'getContests', [extend(a:arg, {'lang': g:atcoder_facilitator#lang,'session': g:atcoder_facilitator#session})])
    call extend(g:atcoder_facilitator#qdict, get(ret, "qdict"))
    let g:atcoder_facilitator#session = get(ret, "session")
endfunction

function! atcoder_facilitator#submit(arg) abort
    let ret = denops#request('atcoder_facilitator', 'submit', [extend(a:arg, {'file': expand('%'), 'progLang': g:atcoder_facilitator#progLang, 'session': g:atcoder_facilitator#session})])
    let g:atcoder_facilitator#session = get(ret, "session")
    let g:atcoder_facilitator#qdict = extend(filter(g:atcoder_facilitator#qdict, {ind, val -> get(val, "url") == get(get(ret, "qdict"),"url")}), get(ret, "qdict"))
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
