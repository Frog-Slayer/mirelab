// dist 를 파일 하나로 합친다. Claude Artifact 는 외부 호스트 요청을 막기 때문에
// CSS/JS 를 전부 인라인해야 하고, doctype/html/head/body 는 게시할 때 감싸주므로 넣지 않는다.
//
//   VITE_DEMO=1 npm run build && node scripts/build-demo.mjs [출력경로]

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const out = process.argv[2] ?? join(dist, 'demo.html')

const html = readFileSync(join(dist, 'index.html'), 'utf8')

const scriptSrc = html.match(/<script[^>]+src="([^"]+)"/)?.[1]
const styleHref = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/)?.[1]
if (!scriptSrc) throw new Error('dist/index.html 에서 번들 스크립트를 찾지 못했습니다')

const asset = (p) => readFileSync(join(dist, p.replace(/^\//, '')), 'utf8')
const css = styleHref ? asset(styleHref) : ''
// 인라인 스크립트 안의 </script> 는 태그를 조기 종료시킨다
const js = asset(scriptSrc).replaceAll('</script', '<\\/script')

writeFileSync(
  out,
  // charset 은 맨 앞 1024바이트 안에 있어야 브라우저 프리스캔이 집어간다
  `<meta charset="utf-8" />
<title>mirelab — 독서 스터디 목업</title>
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`,
)

const kb = (n) => `${Math.round(n / 1024)}KB`
console.log(`${out} — css ${kb(css.length)}, js ${kb(js.length)}`)
