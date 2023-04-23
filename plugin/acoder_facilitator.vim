function! s:init_option(arg, val)
    let l:option = 'g:' . a:arg
    if !exists(l:option)
        let {l:option} = a:val
    endif
endfunction

call s:init_option("atcoder_facilitator#session", {'cookieString': "", 'csrf_token': ""})
call s:init_option("atcoder_facilitator#lang", 'ja')
call s:init_option("atcoder_facilitator#progLang", 'Java (OpenJDK 11.0.6)')
call s:init_option("atcoder_facilitator#qdict", [])
call s:init_option("atcoder_facilitator#buildCmd", ['javac', expand('%')])
call s:init_option("atcoder_facilitator#execCmd", ['java', expand('%:r')])

command! -nargs=* AFLogin call atcoder_facilitator#login(<f-args>)
command! -nargs=* AFQGets call atcoder_facilitator#qgets({'qnames': [<f-args>]})
command! -nargs=* AFCGets call atcoder_facilitator#cgets({'cnames': [<f-args>]})
command! -nargs=* AFSubmit call atcoder_facilitator#submit({'qname': <f-args>})
command! -nargs=* AFTests echom atcoder_facilitator#runTests({'qname': <f-args>})
command! -nargs=* AFDebug call atcoder_facilitator#runDebug()
command! -nargs=* AFStatus call atcoder_facilitator#getStatus()

