# PEGUE AKI · LP da aula "Condomínio ou rua"

Página de captura (`index.html`) e página de obrigado (`obrigado.html`), site estático publicado em https://lp.pegueaki.com pelo GitHub Pages.

**Antes de divulgar, preencha `assets/js/config.js`:**
- `leadEndpoint`: URL que recebe as inscrições por POST (Google Apps Script, Make, Zapier ou webhook do CRM). Vazio = a inscrição não é salva.
- `whatsappGroup`: convite do grupo de avisos (`https://chat.whatsapp.com/...`), usado nos dois botões da página de obrigado.

O formulário envia: nome, whatsapp (só números), email, cidade, investimento, evento, enviado_em, pagina e as UTMs da URL (utm_*, fbclid, gclid).

- Cada push na `main` publica sozinho (`.github/workflows/deploy.yml`), com CSS e JS minificados.
- Ao mudar CSS ou JS, suba o `?v=` dos links nos dois HTML para furar o cache.
- Fonte Lato hospedada no próprio site; nenhum pedido a domínios de terceiros.
- Teste local: `python3 -m http.server 4174` nesta pasta.
