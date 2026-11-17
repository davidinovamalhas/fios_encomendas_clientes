# Malhas Acabadas – app de gestão (telemóvel e PC)

App web simples (HTML + JavaScript) com base de dados e login no **Supabase**, alojada no **GitHub Pages**.
Funciona no browser do PC e do telemóvel e pode ser instalada no ecrã inicial (PWA).

## O que faz
- Cada encomenda tem **N.º Encomenda, Ref. Cliente e Cliente** e pode ter **vários artigos**. Cada artigo tem as suas etapas, locais (malharia, tinturaria, estamparia) e datas.
- O cartão da encomenda mostra, sem abrir nada, a **posição de cada artigo** (etapa, local e datas). Tocar num artigo abre-o para editar; tocar no cabeçalho abre a encomenda.
- Etapas coloridas: **1 Produção da malha (azul)** → **2 Tinturaria (roxo)** → **3 Estamparia (laranja, opcional)** → **4 Entrega ao cliente (verde)** → Concluída (cinza).
- Produção **interna** ou **subcontratada** (com nome do subcontratado).
- Datas (todas editáveis): pedida pelo cliente, fim da malha, envio para a tinturaria, entrega ao cliente. Ficam a **vermelho** quando passam do prazo.
- Guias de transporte e de remessa por encomenda (nº, data, destino, kg, notas).
- Pesquisa, filtro por etapa e filtro "só atrasadas". Botão "Avançar etapa".
- Só utilizadores com login acedem aos dados (Supabase Auth + RLS).

---

## Novidades da v3
- Lista ordenada por **N.º de encomenda** (ordem numérica; pode alternar ↓/↑ ou ordenar pela data pedida) e **filtro por cliente**.
- Datas de **receção da tinturaria** e **receção da estamparia** (regresso do material), além do envio para a tinturaria.
- **Estado automático:** ao lançar uma guia com destino tinturaria ou estamparia, o artigo (ou todos, se escolher "Toda a encomenda") passa a essa etapa. Só avança, nunca recua. A alteração manual continua possível.
- Botão 💾 (topo): **cópia de segurança** (.json), exportação para Excel (.csv) e **reposição** a partir de uma cópia.
- Se já tinha a v2 instalada: corra só `migracao_v3.sql` no SQL Editor (não apaga dados).

## PARTE 1 – Supabase (base de dados + utilizadores)

1. Ir a https://supabase.com → **Start your project** → entrar (pode ser com a conta GitHub).
2. **New project**: dar um nome (ex.: `malhas`), definir e guardar a palavra-passe da base de dados, escolher a região **West EU (Ireland)** ou **Frankfurt** → Create.
3. Quando o projeto estiver pronto: menu **SQL Editor** → **New query** → abrir o ficheiro `schema.sql`, copiar tudo, colar e carregar em **Run**. Deve aparecer "Success".
   (Em **Table Editor** passam a existir as tabelas `encomendas` e `guias`.)
4. **Impedir registos abertos**: **Authentication → Sign In / Providers** (ou *Settings*) → desativar **"Allow new users to sign up"**. Assim só entra quem vocês criarem.
5. **Criar utilizadores**: **Authentication → Users → Add user → Create new user**. Colocar email e palavra-passe, marcar **Auto Confirm User**. Criar um para si e um para o comercial.
6. **Copiar as chaves**: **Project Settings → API** (ou *Data API*):
   - **Project URL** (ex.: `https://abcdxyz.supabase.co`)
   - **anon / public key** (ou *publishable key*)
7. Abrir o ficheiro `config.js` e substituir os dois valores. (A chave *anon* é pública por desenho; quem protege os dados é o login + as regras RLS do `schema.sql`. **Nunca** usar a chave `service_role` aqui.)

### Já tinha instalado a versão anterior?
Não corra o `schema.sql`. Corra apenas `migracao_v2.sql` (uma vez) no SQL Editor: converte as encomendas existentes (cada uma fica com 1 artigo; o antigo "referência" passa a N.º Encomenda).

## PARTE 2 – GitHub (código + alojamento gratuito)

1. Criar conta em https://github.com se ainda não tiver.
2. **New repository** (botão + no canto superior direito): nome `malhas-acabadas`, **Public** (o GitHub Pages gratuito exige repositório público; os dados continuam protegidos pelo login), Create repository.
3. **Carregar os ficheiros**: na página do repositório → **Add file → Upload files** → arrastar todos os ficheiros desta pasta (`index.html`, `styles.css`, `app.js`, `config.js`, `manifest.json`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `schema.sql`, `migracao_v2.sql`, `migracao_v3.sql`, `README.md`) → **Commit changes**.
   *(Alternativa com git: `git init`, `git add .`, `git commit -m "app malhas"`, `git branch -M main`, `git remote add origin https://github.com/SEU-UTILIZADOR/malhas-acabadas.git`, `git push -u origin main`.)*
4. **Publicar**: **Settings → Pages** → em *Build and deployment* escolher **Deploy from a branch**, branch **main**, pasta **/ (root)** → Save.
5. Ao fim de 1–2 minutos o endereço aparece no topo da página, no formato `https://SEU-UTILIZADOR.github.io/malhas-acabadas/`.

## PARTE 3 – Ligar tudo e instalar

1. No Supabase: **Authentication → URL Configuration** → em **Site URL** colocar o endereço do GitHub Pages (e também em *Redirect URLs*).
2. Abrir o endereço no PC e entrar com o utilizador criado.
3. **No telemóvel**: abrir o endereço no Chrome (Android) → menu ⋮ → **Instalar aplicação / Adicionar ao ecrã inicial**. No iPhone: Safari → Partilhar → **Adicionar ao ecrã principal**.

## Alterações futuras
Para mudar algo na app, editar o ficheiro no GitHub (lápis ✏️ → Commit). O site atualiza sozinho em ~1 minuto.

## Notas
- Projetos gratuitos do Supabase ficam em pausa após cerca de 1 semana sem utilização; é só retomar no painel. Para uso diário não é problema.
- Neste momento qualquer utilizador com login vê e edita todas as encomendas. Se quiserem que o comercial só **veja** (sem editar), ou só veja as suas encomendas, ajusta-se nas regras (policies) do `schema.sql`.
- Cópias de segurança: use o botão 💾 da app (sugestão: semanalmente) e guarde o ficheiro .json fora do Supabase. O plano gratuito do Supabase não inclui cópias automáticas descarregáveis.
