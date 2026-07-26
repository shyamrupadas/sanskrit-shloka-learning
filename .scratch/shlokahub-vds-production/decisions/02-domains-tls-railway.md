# Проверить DNS, TLS и Railway custom domain

Type: research
Status: resolved
Blocked by: None - can start immediately

## Question

Как по актуальным первичным источникам безопасно настроить Cloudflare `DNS only`,
Let's Encrypt/Certbot и Railway custom domain для
`shlokahub.com`/`www.shlokahub.com`, `app.shlokahub.com`/`www.app.shlokahub.com` и
`api.shlokahub.com`: какие записи и targets нужны, в каком порядке выпускать
сертификаты и включать redirects, как подтверждается Railway domain ownership и как
избежать окна, в котором frontend build, API domain и точный CORS
`FRONTEND_ORIGIN` не согласованы?

## Answer

Использовать четыре `A`-записи `DNS only` на VDS для статических имён и точные
`CNAME` + `TXT`, выданные Railway, для API; TLS статических имён выпускает Certbot
двумя certificate pair, TLS API — Railway. Из-за одного точного CORS origin Railway
заранее переключается на `https://app.shlokahub.com`. Полный доказательный порядок и
проверки:
[отчёт по DNS, TLS и Railway](../research/02-domains-tls-railway.md).
