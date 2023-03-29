if exists('g:atcoder_facilitator_loaded')
    finish
endif
let g:atcoder_facilitator_loaded = 1

function! atcoder_facilitator#login() abort
    let l:username = inputsecret("username: ")
    let l:password = inputsecret("password: ")
    let g:atcoder_facilitator#session = denops#request('atcoder_facilitator', 'login', [{'username': l:username, 'password': password}])
endfunction

function! atcoder_facilitator#qgets(arg) abort " arg = qnames
    let ret = denops#request('atcoder_facilitator', 'getQuestions', [extend(a:arg, {'lang': g:atcoder_facilitator#lang,'session': g:atcoder_facilitator#session})])
    call extend(g:atcoder_facilitator#qdict, get(ret, "qdict"))
    let g:atcoder_facilitator#session = get(ret, "session")
endfunction

function! atcoder_facilitator#cgets(arg) abort " arg = cnames
    let ret = denops#request('atcoder_facilitator', 'getContests', [extend(a:arg, {'lang': g:atcoder_facilitator#lang,'session': g:atcoder_facilitator#session})])
    call extend(g:atcoder_facilitator#qdict, get(ret, "qdict"))
    let g:atcoder_facilitator#session = get(ret, "session")
endfunction

function! atcoder_facilitator#submit(arg) abort " arg = qname
    let l:i = 0
    while l:i < len(g:atcoder_facilitator#qdict)
        let l:match = v:false
        if has_key(a:arg, "qdict") " for ddu
            let l:match = get(g:atcoder_facilitator#qdict[l:i], "url") == get(get(a:arg, 'qdict'), 'url')
        else " for command
            let l:match = get(g:atcoder_facilitator#qdict[l:i], "url")[-strchars(get(a:arg, 'qname')):] == get(a:arg, 'qname')
        endif
        if l:match
            let l:ret = denops#request('atcoder_facilitator', 'submit', [{'qdict': g:atcoder_facilitator#qdict[l:i], 'file': expand('%'), 'progLang': g:atcoder_facilitator#progLang, 'session': g:atcoder_facilitator#session}])
            let g:atcoder_facilitator#session = get(l:ret, "session")
            let g:atcoder_facilitator#qdict[l:i] = get(l:ret, "qdict")
            " g:atcoder_facilitator#qdict = remove(g:atcoder_facilitator#qdict, l:i)
            return l:i
        endif
        let l:i = l:i + 1
    endwhile
    echoerr "not " .. string(a:arg) .. "downloaded"
    return -1
endfunction

function! atcoder_facilitator#statusAfterSubmit(qdict, isRefreshDdu)
    call denops#notify('atcoder_facilitator', 'statusAfterSubmit', [{'qdict': a:qdict, 'isRefreshDdu': a:isRefreshDdu, 'session': g:atcoder_facilitator#session}])
endfunction

function! atcoder_facilitator#runTests(arg) abort " arg = qname
    if (has_key(a:arg, 'qdict'))
        return denops#request('atcoder_facilitator', 'runTests', [{'qdict': get(a:arg, 'qdict'), 'buildCmd': g:atcoder_facilitator#buildCmd, 'execCmd':g:atcoder_facilitator#execCmd}])
    else
        for item in g:atcoder_facilitator#qdict
            if get(item, "url")[-strchars(get(a:arg, 'qname')):] == get(a:arg, 'qname')
                return denops#request('atcoder_facilitator', 'runTests', [{'qdict': item, 'buildCmd': g:atcoder_facilitator#buildCmd, 'execCmd':g:atcoder_facilitator#execCmd}])
            endif
        endfor
        echoerr get(a:arg) not downloaded
    endif
endfunction

function! atcoder_facilitator#runDebug() abort
	let tmp = input("input > ")
	let txt = []
	while tmp != ""
		call add(txt, tmp)
		let tmp = input("input > ")
	endwhile
    return denops#request('atcoder_facilitator', 'runDebug', [{'buildCmd': g:atcoder_facilitator#buildCmd, 'execCmd':g:atcoder_facilitator#execCmd, 'debugInput': join(txt, "\n")}])
endfunction

function! atcoder_facilitator#getStatus(arg) abort " 
    return denops#request('atcoder_facilitator', 'getStatus', [extend(a:arg, {'session': g:atcoder_facilitator#session})])
endfunction

function! atcoder_facilitator#matchQDict(arg) abort 
    for item in g:atcoder_facilitator#qdict
        if get(item, "url") == get(a:arg, "url")
            return item
        endif
    endfor
    return {}
endfunction
