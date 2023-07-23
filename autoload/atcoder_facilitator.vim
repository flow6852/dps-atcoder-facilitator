if exists('g:atcoder_facilitator_loaded')
    finish
endif
let g:atcoder_facilitator_loaded = 1

function! atcoder_facilitator#login() abort
    let l:username = inputsecret("username: ")
    let l:password = inputsecret("password: ")
    call denops#notify('atcoder_facilitator', 'login', [{'username': l:username, 'password': password}])
endfunction

function! atcoder_facilitator#qgets(arg) abort " arg = qnames
    call denops#notify('atcoder_facilitator', 'getQuestions', [a:arg])
endfunction

function! atcoder_facilitator#cgets(arg) abort " arg = cnames
    call denops#notify('atcoder_facilitator', 'getContests', [a:arg])
endfunction

function! atcoder_facilitator#submit(arg) abort " arg = qname
    call denops#request('atcoder_facilitator', 'submit', [extend(a:arg, {'file': expand('%')})])
endfunction

function! atcoder_facilitator#statusAfterSubmit(qdict, isRefreshDdu, dduUiName)
    call denops#notify('atcoder_facilitator', 'statusAfterSubmit', [{'qdict': a:qdict, 'isRefreshDdu': a:isRefreshDdu, 'dduUiName': a:dduUiName}])
endfunction

function! atcoder_facilitator#runTests(arg) abort " arg = qname
    return denops#request('atcoder_facilitator', 'runTests', [a:arg])
endfunction

function! atcoder_facilitator#runDebug() abort
	let tmp = input("input > ")
	let txt = []
	while tmp != ""
		call add(txt, tmp)
		let tmp = input("input > ")
	endwhile
    return denops#request('atcoder_facilitator', 'runDebug', [{'debugInput': join(txt, "\n")}])
endfunction

function! atcoder_facilitator#getStatus(arg) abort
    return denops#request('atcoder_facilitator', 'getStatus', [extend(a:arg)])
endfunction

function! atcoder_facilitator#getQDicts() abort
    return denops#request('atcoder_facilitator', 'getQDicts', []) 
endfunction

function! atcoder_facilitator#refreshStatusAll() abort
    return denops#notify('atcoder_facilitator', 'refreshStatusAll',[])
endfunction

function! atcoder_facilitator#matchQDict(arg) abort 
    for item in g:atcoder_facilitator#qdict
        if get(item, "url") == get(a:arg, "url")
            return item
        endif
    endfor
    return {}
endfunction
