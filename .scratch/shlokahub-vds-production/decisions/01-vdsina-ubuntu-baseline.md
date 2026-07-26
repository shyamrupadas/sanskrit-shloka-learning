# Проверить production baseline VDSina и Ubuntu 26.04

Type: research
Status: resolved
Blocked by: None - can start immediately

## Question

Какие актуальные возможности и ограничения VDSina standard VDS и Ubuntu 26.04 LTS
нужно учесть в точном bootstrap-плане для уже созданного сервера 1 vCPU / 1 ГБ RAM /
10 ГБ NVMe: первоначальный доступ, изменение тарифа, расширение диска после upgrade,
swap, security updates, firewall, Fail2ban, Nginx, Certbot, журналирование и измеримые
пороги, после которых четыре малонагруженных статических сайта следует переносить или
масштабировать?

## Answer

Один VDS можно использовать как контролируемый MVP-хост, но 1 ГБ RAM ниже стартовой
рекомендации Ubuntu 26.04 Server, поэтому обязательны swap, ограничение журналов и
измеримые пороги. Первый путь масштабирования — upgrade одного VDS до 2 ГБ / 50 ГБ;
отдельный сервер нужен только для изоляции отказов, а не текущей ёмкости. Точный
bootstrap, проверки и пороги: [production baseline VDSina и Ubuntu 26.04](../research/01-vdsina-ubuntu-baseline.md).
