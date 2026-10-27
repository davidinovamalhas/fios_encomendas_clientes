# Gestão Fios Encomendas

App em HTML para gerir encomendas de malha feitas com fio dos clientes: artigos e composição, entradas e devoluções de fio, saídas de malha, stock por lote e quebras por fio e por artigo.

Ficheiros:

| Ficheiro | Para que serve |
|---|---|
| `index.html` | A app completa (um só ficheiro) |
| `config.js` | URL e chave pública do Supabase |
| `supabase/schema.sql` | Cria a tabela e as regras de segurança |
| `dados-iniciais.json` | As 34 encomendas do seu Excel, prontas a importar |

## 1. Supabase (base de dados)

1. Em supabase.com, crie um projeto (**New project**). Guarde a palavra-passe da base de dados.
2. Vá a **SQL Editor > New query**, cole o conteúdo de `supabase/schema.sql` e carregue em **Run**.
3. Vá a **Authentication > Users > Add user > Create new user**. Escreva o seu email e uma palavra-passe e marque **Auto Confirm User**. Esta é a conta com que vai entrar na app.
4. Vá a **Authentication > Sign In / Providers** e desligue **Allow new users to sign up**. Assim só quem criou manualmente consegue entrar.
5. Vá a **Project Settings > API** (ou **API Keys**) e copie:
   - **Project URL**
   - a chave **anon** (ou **publishable**)

## 2. Configurar a app

Abra `config.js` e preencha:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "a-sua-chave-anon-ou-publishable"
};
```

A chave anon pode ir para o GitHub: é pública por desenho. Quem protege os dados é o login e as regras do `schema.sql`. Nunca coloque a chave `service_role` em nenhum ficheiro da app.

## 3. GitHub (alojamento)

1. Crie um repositório novo (por exemplo `gestao-fios-encomendas`).
2. Envie para a raiz do repositório: `index.html`, `config.js`, `supabase/schema.sql` e `README.md`. Pode usar **Add file > Upload files**. O `dados-iniciais.json` só é preciso uma vez; pode deixá-lo de fora do repositório.
3. Vá a **Settings > Pages**. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e guarde.
4. Ao fim de um ou dois minutos a app fica em `https://O-SEU-UTILIZADOR.github.io/gestao-fios-encomendas/`.

Se preferir manter o repositório privado, o GitHub Pages em repositórios privados exige um plano pago. Em alternativa, use Netlify ou Cloudflare Pages ligados ao mesmo repositório.

## 4. Primeira utilização

1. Abra o endereço da app e entre com o email e a palavra-passe do passo 1.3.
2. Vá a **Dados e cálculos > Importar cópia (JSON)** e escolha `dados-iniciais.json`. As 34 encomendas do Excel passam para o Supabase.
3. Dali em diante, tudo o que lançar fica guardado no Supabase e aparece em todos os dispositivos.

## Cópias de segurança

Em **Dados e cálculos > Exportar tudo (JSON)** descarrega uma cópia completa. Importar essa cópia substitui as encomendas com o mesmo identificador e não apaga as outras. No Supabase, em **Database > Backups**, tem as cópias automáticas do projeto (o plano gratuito não inclui backups diários).

## Usar sem Supabase

Se `config.js` estiver com os valores vazios, a app funciona só no navegador (localStorage), sem login. Serve para experimentar, mas os dados não saem desse navegador.

## Como funcionam os cálculos

- **Consumo da malha** = malha entregue do artigo × % do fio no artigo.
- **Consumo teórico** = consumo da malha × (1 + quebra prevista do artigo). É o que sai do stock.
- **Fio líquido** = entradas − devoluções.
- **Quebra real de um fio** = (fio líquido − consumo da malha) ÷ fio líquido, somando os artigos que usam esse fio, cada um com a sua %.
- **Quebra por artigo** = quebra de cada fio repartida pelos artigos conforme o fio que cada um consome.
- **Stock por lote** = entradas − devoluções − consumo teórico, retirado dos lotes mais antigos primeiro.

Numa encomenda aberta a quebra é provisória, porque o fio que ainda não foi devolvido conta como quebra. Feche a encomenda depois de devolver o fio que sobrou.

## Modelo de dados

Uma linha por encomenda na tabela `encomendas` (`id`, `data` em JSON, `updated_at`). O JSON guarda os artigos (com a composição dos fios), as entradas e devoluções de fio e as saídas de malha. Uma encomenda com vários artigos fica numa só linha.
