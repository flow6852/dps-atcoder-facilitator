let g:atcoder_facilitator#session = {'cookieString': "", 'csrf_token': ""}
let g:atcoder_facilitator#lang = 'ja'
let g:atcoder_facilitator#progLang = 'Java (OpenJDK 11.0.6)'
let g:atcoder_facilitator#qdict = [] " {qdict, timeMemoryLimit, title, score, problem, constraint, inputStyle, outputStyle, {inputExample, outputExample, comments}}
let g:atcoder_facilitator#buildCmd = ['javac', expand('%')]
let g:atcoder_facilitator#execCmd = ['java', expand('%:r')]

command! -nargs=* AFLogin call atcoder_facilitator#login(<f-args>)
command! -nargs=* AFQGets call atcoder_facilitator#qgets({'qnames': [<f-args>]})
command! -nargs=* AFCGets call atcoder_facilitator#cgets({'cnames': [<f-args>]})
command! -nargs=* AFSubmit call atcoder_facilitator#submit({'qname': <f-args>})
command! -nargs=* AFTests call atcoder_facilitator#runTests({'qname': <f-args>})
command! -nargs=* AFDebug call atcoder_facilitator#runDebug()
command! -nargs=* AFStatus call atcoder_facilitator#getStatus()
