function! s:init_option(scope, arg, val)
    let l:option = a:scope . ':' . a:arg
    if !exists(l:option)
        let {l:option} = a:val
    endif
endfunction

" call s:init_option("g", "atcoder_facilitator#session", {'cookieString': "", 'csrf_token': ""})
" call s:init_option("g", "atcoder_facilitator#qdict", [])
call s:init_option("g", "atcoder_facilitator#lang", 'ja')
call s:init_option("b", "atcoder_facilitator_progLang", 'Java (OpenJDK 11.0.6)')
call s:init_option("b", "atcoder_facilitator_buildCmd", ['javac', expand('%')])
call s:init_option("b", "atcoder_facilitator_execCmd", ['java', expand('%:r')])

command! -nargs=* AFLogin call atcoder_facilitator#login(<f-args>)
command! -nargs=* AFQGets call atcoder_facilitator#qgets({'qnames': [<f-args>]})
command! -nargs=* AFCGets call atcoder_facilitator#cgets({'cnames': [<f-args>]})
command! -nargs=* AFSubmit call atcoder_facilitator#submit({'qname': <f-args>, 'progLang': b:atcoder_facilitator_progLang})
command! -nargs=* AFTests echom atcoder_facilitator#runTests({'qname': <f-args>, 'buildCmd': b:atcoder_facilitator_buildCmd, 'execCmd': b:atcoder_facilitator_execCmd})
command! -nargs=* AFDebug call atcoder_facilitator#runDebug({'buildCmd': b:atcoder_facilitator_buildCmd, 'execCmd': b:atcoder_facilitator_execCmd})
command! -nargs=* AFStatus call atcoder_facilitator#getStatus()
