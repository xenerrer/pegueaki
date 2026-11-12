/**
 * PEGUE AKI · backup dos leads da LP da aula (lp.pegueaki.com/aula-nov26)
 *
 * Cada inscrição do formulário vira uma linha na planilha
 * "Leads - LP - Aula 25 Nov (Pegue Aki)", com os campos e as UTMs.
 *
 * Como instalar (uma vez):
 * 1. Em script.google.com, Novo projeto (no Drive pessoal, não no compartilhado). Cole este arquivo.
 * 2. Implantar > Nova implantação > tipo "App da Web".
 *    Executar como: Eu. Quem pode acessar: Qualquer pessoa.
 * 3. Autorize o acesso à planilha e copie a URL que termina em /exec.
 * 4. Essa URL vai em `leadEndpoint`, no arquivo site/assets/js/config.js.
 *
 * NÃO coloque o projeto no Drive compartilhado da Allu: lá o Google não deixa
 * publicar pela conta do Lucas e o app da web para (aconteceu em 12/11/2026).
 * Projeto ativo: "Backup de leads - LP Pegue Aki (ativo)", no Drive do Lucas.
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
  const linha = [
    Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
  ].concat([
    p.nome, p.email, whatsapp(p.whatsapp), p.cidade, p.investimento,
    p.utm_source, p.utm_medium, p.utm_campaign, p.utm_term, p.utm_content,
    p.gclid, p.fbclid, p.pagina, ORIGEM,
  ].map(texto));

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let erro = null;
  try {
    // até 3 tentativas: o Planilhas às vezes falha por um instante
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      try {
        const aba = SpreadsheetApp.openById(PLANILHA_ID).getSheets()[0];
        if (aba.getLastRow() === 0) aba.appendRow(COLUNAS);
        // sem mexer em formato de coluna: a planilha pode estar como Tabela
        aba.getRange(aba.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
        SpreadsheetApp.flush();
        erro = null;
        break;
      } catch (err) {
        erro = err;
        console.error('Tentativa ' + tentativa + ': ' + err);
        Utilities.sleep(700 * tentativa);
      }
    }
  } finally {
    lock.releaseLock();
  }
  if (erro) console.error('Lead não gravado: ' + JSON.stringify(linha));
  return ContentService.createTextOutput(JSON.stringify({ ok: !erro, erro: erro ? String(erro) : undefined }))
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

/* O apóstrofo faz a planilha guardar como texto: o WhatsApp e os IDs de anúncio
   não viram número (nem perdem dígitos) e nada vira fórmula. Ele não aparece na célula. */
function texto(v) {
  const s = v == null ? '' : String(v).trim().slice(0, 500);
  return s ? "'" + s : '';
}
