/**
 * PEGUE AKI · backup dos leads da LP da aula (lp.pegueaki.com/aula-nov26)
 *
 * Cada inscrição do formulário vira uma linha na planilha
 * "Leads - LP - Aula 25 Nov (Pegue Aki)", com os campos e as UTMs.
 *
 * Como instalar (uma vez):
 * 1. Na planilha: Extensões > Apps Script. Apague o que houver e cole este arquivo.
 * 2. Implantar > Nova implantação > tipo "App da Web".
 *    Executar como: Eu. Quem pode acessar: Qualquer pessoa.
 * 3. Autorize o acesso à planilha e copie a URL que termina em /exec.
 * 4. Essa URL vai em `leadEndpoint`, no arquivo site/assets/js/config.js.
 *
 * Ao mudar este código depois, use Implantar > Gerenciar implantações > editar
 * (versão nova) para manter a mesma URL.
 */

const PLANILHA_ID = '1K1QQxGzbzEIESSP8Xly0nvINn_nkT_J2jDd8AvOjnkA';
const ORIGEM = 'LP Aula 25/11 Pegue Aki';
const COLUNAS = [
  'Data/Hora', 'Nome', 'E-mail', 'WhatsApp', 'Cidade', 'Investimento',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'Pagina', 'Origem',
];

function doPost(e) {
  const p = (e && e.parameter) || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const aba = SpreadsheetApp.openById(PLANILHA_ID).getSheets()[0];
    if (aba.getLastRow() === 0) aba.appendRow(COLUNAS);
    if (aba.getFrozenRows() === 0) aba.setFrozenRows(1);

    const linha = [
      Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
      p.nome, p.email, whatsapp(p.whatsapp), p.cidade, p.investimento,
      p.utm_source, p.utm_medium, p.utm_campaign, p.utm_term, p.utm_content,
      p.gclid, p.fbclid, p.pagina, ORIGEM,
    ].map(texto);

    const n = aba.getLastRow() + 1;
    const destino = aba.getRange(n, 1, 1, linha.length);
    destino.setNumberFormat('@'); // guarda tudo como texto (o + do WhatsApp não vira número)
    destino.setValues([linha]);
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('Backup de leads da LP Pegue Aki: ativo.');
}

/* (11) 91234-5678 -> +5511912345678 */
function whatsapp(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 10 || d.length === 11) return '+55' + d;
  return '+' + d;
}

/* texto limpo, sem virar fórmula na planilha */
function texto(v) {
  const s = v == null ? '' : String(v).trim().slice(0, 500);
  return /^[=+\-@]/.test(s) && !/^\+\d+$/.test(s) ? "'" + s : s;
}
