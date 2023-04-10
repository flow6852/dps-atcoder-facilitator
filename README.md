# dps-atcoder-facilitator

Facilitator for AtCoder on Vim/Neovim inspired by https://github.com/ka-tsu-mo/at-vim-coder

# Required

## denops.vim

https://github.com/vim-denops/denops.vim

# Optional

## ddu.vim

https://github.com/Shougo/ddu.vim

## ddu-ui-ff

https://github.com/Shougo/ddu-ui-ff

# Demo

https://user-images.githubusercontent.com/42508708/229091089-3ef4f013-1117-466b-ac4f-44fb13de3db0.mp4

# Example Setting on Demo

```
" ddu.vim keymapping
augroup DduKeyMap
  au!
  autocmd FileType ddu-ff call s:ddu_my_settings()
augroup End

function! s:ddu_my_settings() abort
  " submit
  nnoremap <buffer><silent> s
    \ <Cmd>call StatusAfterSubmit(v:true)<CR>

  nnoremap <buffer><silent> t
    \ <Cmd>call ddu#ui#multi_actions([['itemAction', {'name': 'runTests', 'params': {'actionFlag': 'Persist'}}], ['preview', {'kind': 'runTests'}]])<CR>
endfunction

function! StatusAfterSubmit(arg) abort
    call ddu#ui#multi_actions([['getItem'], ['itemAction', {'name': 'submit', 'params': {'actionFlag': 'Persist'}}]])
    if a:arg
        call ddu#start({'name': 'atcoder_facilitator', 'sources': [{'name': 'atcoder_status', 'options':{'matchers': ['matcher_substring']}}]})
        call atcoder_facilitator#statusAfterSubmit(get(get(b:ddu_ui_item, "action"), "qdict"), a:arg)
    else
        call atcoder_facilitator#statusAfterSubmit(get(get(b:ddu_ui_item, "action"), "qdict"), a:arg)
    endif
endfunction

" 

let cfg = {
    \   'ui': 'ff',
    \   'sourceOptions': {
    \     '_': {
    \       'matchers': ['matcher_substring'],
    \     },
    \   },
    \   'uiParams' : {
    \     'ff': {
    \       'split': has('nvim') ? 'floating' : 'horizontal',
    \       'startFilter': v:false,
    \       'highlights': {'selected': 'Statement'},
    \       'autoAction': {'name':'preview'},
    \       'winCol': &columns/8 ,
    \       'winWidth': has('nvim') ? 3*&columns/4 : 15,
    \       'winRow': &lines/8,
    \       'winHeight': 10 ,
    \       'previewFloating': has('nvim') ? v:true : v:false,
    \       'previewSplit': has('nvim') ? 'horizontal' : 'no',
    \       'previewWidth': has('nvim') ? 3*&columns/8: 10,
    \       'previewHeight': has('nvim') ? 3*&lines/4 - 10 : 10,
    \       'splitDirection': "topleft"
    \     }
    \  },
    \   'kindOptions': {
    \     '_': {
    \       'defaultAction': 'open',
    \     },
    \   }
    \ }

call ddu#custom#patch_local('atcoder_facilitator', cfg)
call ddu#custom#patch_local('atcoder_status', cfg)

nmap <silent> ;a <Cmd> call ddu#start({'name': 'atcoder_facilitator', 'sources': [{'name': 'atcoder_facilitator', 'options':{'matchers': ['matcher_substring']}}]})<CR>
nmap <silent> ;s <Cmd> call ddu#start({'name': 'atcoder_status', 'sources': [{'name': 'atcoder_status', 'options':{'matchers': ['matcher_substring']}}]})<CR>
```

# Commands

|Command|Explanation|
|:-:|:-:|
|`AFLogin`| Login and save `g:atcoder_facilitator#session` session |
|`AFQGets a b ...`| Get a,b,... and save `g:atcoder_facilitator#session` session |
|`AFCGets a b ,,,`| Get questions in a,b,... and save `g:atcoder_facilitator#session` session |
|`AFTests a`| Test current buffer is AC about questions in a,b,...|
|`AFStatus a`| Show status  about questions in a|
|`AFDebug a`| Test current buffer with user-defined input|
|`AFSubmit a`| Test current buffer is AC about questions in a,b,... and save `g:atcoder_facilitator#session` session |

# Variables

|Variable|Explanation|Default|
|:-:|:-:|:-:|
|`g:atcoder_facilitator#session`|Session|`{'cookieString': "", 'csrf_token': ""}`|
|`g:atcoder_facilitator#lang`|Language|`'ja'`|
|`g:atcoder_facilitator#progLang`|Language Selector|`'Java (OpenJDK 11.0.6)'`|
|`g:atcoder_facilitator#qdict`|Question List for `AFQGets` or `AFCGets`|`[]`|
|`g:atcoder_facilitator#buildCmd`|Build Command for `AFTests` or `AFDebug`|`['javac', expand('%')]`|
|`g:atcoder_facilitator#execCmd`|Exec Command for `AFTests` or `AFDebug`|`['java', expand('%:r')]`|

# Functions

|Functions|Explanation|Args|
|:-:|:-:|:-:|
|`atcoder_facilitator#login`|Login|`()`|
|`atcoder_facilitator#qgets`|Get Questions|`(questions: [string])`|
|`atcoder_facilitator#cgets`|Get Questions from Contests|`(contests: [string])`|
|`atcoder_facilitator#submit`|Submit current buffer|`(question: string)`|
|`atcoder_facilitator#runTests`|Exec Command and check examples|`(question: string)`|
|`atcoder_facilitator#runDebug`|Exec Command with user-defined input|`()`|
|`atcoder_facilitator#getStatus`|Get status one time|`(qdict: [qdict])`|
|`atcoder_facilitator#statusAfterSubmit`|Get status until judged|`(qdict: [dict], isRefreshDdu: boolean)`|
|`atcoder_facilitator#matchQDict`|return item in `g:atcoder_facilitator#qdict` matched arg|`(qdict: qdict)`|
