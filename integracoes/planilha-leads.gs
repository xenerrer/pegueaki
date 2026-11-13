/**
 * PEGUE AKI · backup dos leads da LP da aula (lp.pegueaki.com/aula-nov26)
 *
 * Cada inscrição do formulário vira uma linha na planilha
 * "Leads - LP - Aula 25 Nov (Pegue Aki)", com os campos e as UTMs.
 * Depois de gravar, manda o evento CompleteRegistration para os dois pixels
 * pela API de Conversões do Meta (coluna "Meta CAPI" mostra o resultado).
 *
 * Como instalar (uma vez):
 * 1. Em script.google.com, Novo projeto (no Drive pessoal, não no compartilhado). Cole este arquivo.
 * 2. Implantar > Nova implantação > tipo "App da Web".
 *    Executar como: Eu. Quem pode acessar: Qualquer pessoa.
 * 3. Autorize o acesso à planilha e copie a URL que termina em /exec.
 * 4. Essa URL vai em `leadEndpoint`, no arquivo site/assets/js/config.js.
 * 5. Tokens da API de Conversões: Configurações do projeto > Propriedades do script,
 *    TOKEN_PIXEL_0878 e TOKEN_PIXEL_2036 (nunca no código nem no site).
 *    Opcional: TEST_EVENT_CODE (aba "Eventos de teste" do Gerenciador de Eventos).
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
  'gclid', 'fbclid', 'Pagina', 'Origem', 'fbp', 'fbc', 'Meta CAPI',
];
const COL_CAPI = 18; // coluna R

const PIXELS = [
  { id: '1484844383560878', token: 'TOKEN_PIXEL_0878' },
  { id: '1923075075332036', token: 'TOKEN_PIXEL_2036' },
];
const GRAPH = 'https://graph.facebook.com/v24.0/';

function doPost(e) {
  const p = (e && e.parameter) || {};
  const linha = [
    Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
  ].concat([
    p.nome, p.email, whatsapp(p.whatsapp), p.cidade, p.investimento,
    p.utm_source, p.utm_medium, p.utm_campaign, p.utm_term, p.utm_content,
    p.gclid, p.fbclid, p.pagina, ORIGEM, p.fbp, p.fbc,
  ].map(texto));

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let erro = null, aba = null, n = 0;
  try {
    // até 3 tentativas: o Planilhas às vezes falha por um instante
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      try {
        aba = SpreadsheetApp.openById(PLANILHA_ID).getSheets()[0];
        if (aba.getLastRow() === 0) aba.appendRow(COLUNAS);
        n = aba.getLastRow() + 1;
        // sem mexer em formato de coluna: a planilha pode estar como Tabela
        aba.getRange(n, 1, 1, linha.length).setValues([linha]);
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

  // API de Conversões: depois de gravar, para o lead nunca depender do Meta
  let capi = '';
  try {
    capi = enviarCapi(p);
  } catch (err) {
    capi = 'erro: ' + err;
  }
  if (aba && n && !erro) {
    try { aba.getRange(n, COL_CAPI).setValue(texto(capi)); } catch (err) { console.error('Status CAPI: ' + err); }
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: !erro, capi: capi, erro: erro ? String(erro) : undefined }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('Backup de leads da LP Pegue Aki: ativo.');
}

/* Manda CompleteRegistration para cada pixel com token. Devolve "0878: ok | 2036: ok". */
function enviarCapi(p) {
  const props = PropertiesService.getScriptProperties();
  // inscrições de teste (nome com "(apagar)") vão como evento de teste e não contam na campanha
  const teste = /\(apagar\)/i.test(String(p.nome || ''));
  const testCode = (props.getProperty('TEST_EVENT_CODE') || '').trim() || (teste ? 'TEST_APAGAR' : '');

  const nome = semAcento(String(p.nome || '')).replace(/[^a-z ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const partes = String(p.cidade || '').split(/[,/\-–]/);
  const cidade = semAcento(partes[0] || '').replace(/[^a-z]/g, '');
  const uf = semAcento(partes[1] || '').replace(/[^a-z]/g, '');
  const fone = whatsapp(p.whatsapp).replace(/\D/g, '');
  const email = String(p.email || '').trim().toLowerCase();

  const evento = limpar({
    event_name: 'CompleteRegistration',
    event_time: Math.floor(Date.now() / 1000),
    event_id: p.event_id,
    action_source: 'website',
    event_source_url: p.pagina,
    user_data: limpar({
      em: email ? [hash(email)] : null,
      ph: fone ? [hash(fone)] : null,
      fn: nome[0] ? [hash(nome[0])] : null,
      ln: nome.length > 1 ? [hash(nome[nome.length - 1])] : null,
      ct: cidade ? [hash(cidade)] : null,
      st: uf.length === 2 ? [hash(uf)] : null,
      country: [hash('br')],
      fbp: p.fbp,
      fbc: p.fbc,
      client_user_agent: p.ua,
    }),
  });

  const alvos = PIXELS.map(px => ({ fim: px.id.slice(-4), id: px.id, token: (props.getProperty(px.token) || '').trim() }));
  const validos = alvos.filter(a => a.token && !/cole/i.test(a.token));
  const respostas = validos.length ? UrlFetchApp.fetchAll(validos.map(a => ({
    url: GRAPH + a.id + '/events',
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(limpar({ data: [evento], test_event_code: testCode, access_token: a.token })),
    muteHttpExceptions: true,
  }))) : [];

  const resultado = alvos.map(a => {
    const i = validos.indexOf(a);
    if (i < 0) return a.fim + ': sem token';
    let j = {};
    try { j = JSON.parse(respostas[i].getContentText() || '{}'); } catch (_) {}
    if (j.events_received) return a.fim + ': ok';
    return a.fim + ': erro ' + ((j.error && j.error.message) || respostas[i].getResponseCode());
  });
  return resultado.join(' | ') + (testCode ? ' (evento de teste)' : '');
}

function hash(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}

function semAcento(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/* tira campos vazios do objeto */
function limpar(o) {
  Object.keys(o).forEach(k => { if (o[k] == null || o[k] === '') delete o[k]; });
  return o;
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
