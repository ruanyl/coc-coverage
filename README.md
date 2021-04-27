# coc-coverage

coc.nvim extension to show test coverage sign

## Install

`:CocInstall coc-coverage`

The extension supports istanbul `json reporter` format:
- [istanbul](https://github.com/gotwarlost/istanbul)
- [nyc](https://github.com/istanbuljs/nyc)
- [karma-coverage](https://github.com/karma-runner/karma-coverage)
- [jest](https://github.com/facebook/jest)

By default, this extension read coverage from `coverage/coverage-final.json`

## Configuration
`coverage.enabled` enable coc-coverage extension, default: `true`

`coverage.uncoveredSign.text` the sign to display on uncovered lines, default `▣`

`coverage.uncoveredSign.hlGroup` uncovered sign hightlight group, default `UncoveredLine`

`coverage.jsonReportPath` path to coverage json report, default `/coverage/coverage-final.json`

## Customized sign color
The default hightlight name is `UncoveredLine`, make sure this is set before loading coc.nvim
```
hi UncoveredLine guifg=#ffaa00 guibg=#ffaa00
```

## Configure Status Line
```
function! LightlineCocCoverageStatus() abort
  let status = get(g:, 'coc_coverage_lines_pct', '')
  if empty(status)
    return ''
  endif

  return '☂ ' . status . '% Lines Covered'
endfunction

let g:lightline = {
  \ 'active': {
  \   'left': [
  \     [ 'mode', 'paste' ],
  \     [ 'readonly', 'filename' ]
  \   ],
  \   'right':[
  \     [ 'coccoverage', 'lineinfo', 'percent', 'cocstatus' ],
  \     [ 'cocapollo' ]
  \   ],
  \ },
  \ 'component_function': {
  \   'coccoverage': 'LightlineCocCoverageStatus'
  \ }
\ }
```


## License

MIT

---

> This extension is built with [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
