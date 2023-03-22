let g:atcoder_facilitator#loginSession = {'cookieString': "", 'csrf_token': ""}
let g:atcoder_facilitator#lang = 'ja'
let g:atcoder_facilitator#progLang = 'Java (OpenJDK 11.0.6)'
let g:atcoder_facilitator#qlist = [] " {qlist, timeMemoryLimit, title, score, problem, constraint, inputStyle, outputStyle, {inputExample, outputExample, comments}}
let g:atcoder_facilitator#buildCmd = ['javac', expand('%')]
let g:atcoder_facilitator#execCmd = ['java', expand('%:r')]

command! -nargs=* AFLogin call atcoder_facilitator#login(<f-args>)
command! -nargs=* AFQGets call atcoder_facilitator#qgets({'qnames': [<f-args>]})
command! -nargs=* AFCGets call atcoder_facilitator#cgets({'cnames': [<f-args>]})
command! -nargs=* AFSubmit call atcoder_facilitator#submit({'qlist': <f-args>})
command! -nargs=* AFRunTests call atcoder_facilitator#runTests({'qlist': <f-args>})
command! -nargs=* AFRunDebug call atcoder_facilitator#runDebug()
