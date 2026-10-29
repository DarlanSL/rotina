# Rotina

Web app (celular + desktop) para organizar o dia a dia:

- **Início**: o que está programado para hoje (esquerda) e o que já foi feito (direita); vencidos e próximos do prazo abrem ao clicar nos cards.
- **Diário de Atividades**: registro rápido do que foi feito, com tags e filtros por data/tag.
- **Rotinas e Revisões**: ações recorrentes ("a cada X dias a partir da última conclusão") com **Concluir hoje** e **Prorrogar** (com justificativa obrigatória e histórico de adiamentos).
- **Documentos**: vencimentos com status automático 🟢 Válido · 🟡 Próximo · 🔴 Vencido.
- **Ideias e Projetos**: ideias, anotações, lembretes e melhorias, com acompanhamento de "realizado" e progresso por projeto.
- **Relatórios**: relatório do dia ou consolidado por período (atividades, horas por tag, revisões, itens realizados e prorrogações).
  Exporta em **PDF** (impressão do navegador) e **Excel (CSV)**; envia por **WhatsApp** e **e-mail** (texto formatado)
  e, no celular, pelo compartilhamento nativo com o arquivo anexado.
- **Notificações**: avisos de atividades agendadas, lembretes e prazos de melhorias (X minutos antes e na hora) e um
  resumo diário de vencimentos. Aparecem no sistema (Windows/Android/macOS; no iPhone, com o app na Tela de Início)
  ou dentro do app, com histórico no sininho. Funcionam enquanto o app estiver aberto (mesmo em segundo plano).

## Stack

Next.js 16 (App Router, Server Actions, Cache Components) · TypeScript · Tailwind CSS 4 + shadcn/ui (Base UI) ·
Prisma 7 + PostgreSQL · Auth.js v5 (usuário e senha) · Zod · Vitest.

## Rodando localmente

Pré-requisitos: Node 24+ e Docker Desktop.

```bash
npm install
cp .env.example .env          # gere AUTH_SECRET com: npx auth secret
npm run db:up                 # Postgres em localhost:5433
npm run db:migrate            # aplica as migrations
npm run db:seed               # dados de demonstração (usuário demo / senha demo1234)
npm run dev                   # http://localhost:3000 → entre como demo / demo1234
```

| Script | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | testes de regras de prazo e datas (Vitest) |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm run db:studio` | Prisma Studio (navegar nos dados) |

## Login

- **Usuário e senha.** Senhas guardadas com hash `scrypt` (sal aleatório), nunca em texto.
- **Cadastro** em `/cadastro`. Com `AUTH_SIGNUP="false"`, a tela some e só entram contas já criadas (pelo seed ou direto no banco). A variável é lida no build.
- **Minha conta** (clique no seu nome no menu): alterar o nome e a senha. A troca exige a senha atual.
- **Proteção contra força bruta:** 5 erros seguidos para o mesmo usuário bloqueiam novas tentativas por 15 minutos. O contador fica em memória, então vale por instância do servidor.
- Usuário inexistente e senha errada respondem com a mesma mensagem e no mesmo tempo. Assim não dá para descobrir quais usuários existem.
- **Conta demo:** `demo` / `demo1234`, criada pelo seed. Não rode o seed em produção.

## Deploy (Vercel + Neon)

1. No [Neon](https://neon.tech), crie um projeto na região **AWS São Paulo (sa-east-1)**. Copie as duas connection strings: a **pooled** (host com `-pooler`) e a **direta**.
2. Na Vercel, importe o repositório e defina estas variáveis:
   - `DATABASE_URL`: a URL pooled.
   - `DIRECT_URL`: a URL direta.
   - `AUTH_SECRET`: gere com `npx auth secret`.
   - `AUTH_SIGNUP`: opcional; use `"false"` para fechar o cadastro.
3. O script `vercel-build` roda `prisma migrate deploy` antes do `next build`, então as migrations sobem a cada deploy.
4. Em Settings → Functions, escolha a região **São Paulo (gru1)**, para ficar perto do banco.
5. **Fotos e vídeos**: em Storage → Create → **Blob**, crie um store com acesso **Private** e conecte ao projeto. A Vercel cria `BLOB_STORE_ID` e `BLOB_WEBHOOK_PUBLIC_KEY` sozinha e autentica o app automaticamente (OIDC). Faça um novo deploy. Sem o store, a tela avisa que os anexos não estão configurados.

### Listas
- Em `/listas` ficam listas avulsas, como Mercado ou Papelaria. Os itens são marcados na hora, mesmo com internet lenta.
- Os itens das listas **não entram no relatório**. Para registrar a ida às compras, use **Agendar ida** na lista: isso cria uma atividade normal, que aparece na Agenda e no relatório.

### Previsão do tempo
- A bolinha no canto da tela usa o [Open-Meteo](https://open-meteo.com), gratuito e sem chave. O navegador consulta direto e guarda a previsão por 30 minutos.
- A cidade padrão fica em **Minha conta**. Na bolinha, **Usar minha localização** passa a usar o GPS daquele aparelho, e a escolha fica salva nele.

### Anexos (fotos e vídeos)
- Ficam no Vercel Blob **privado**. O app só entrega o arquivo ao dono, com um link assinado de 1 hora.
- O envio vai do navegador direto ao Blob, então não esbarra no limite de 4,5 MB das funções. Fotos são reduzidas para até 2048px antes do envio.
- Limites: 10 anexos por item, fotos até 15 MB e vídeos até 100 MB.
- Fora da Vercel, dá para usar `BLOB_READ_WRITE_TOKEN`. Em desenvolvimento, sem nenhum dos dois, os arquivos vão para a pasta `.uploads/`, que é ignorada pelo git.

## Organização

```
prisma/                 schema, migrations e seed
src/app/(app)/          páginas logadas — cada módulo tem page.tsx + actions.ts (Server Actions)
src/app/(auth)/         telas de login e cadastro (+ actions.ts)
src/components/         UI por módulo (dashboard, diario, rotinas, documentos, ideias, projetos, layout)
src/lib/dates.ts        datas "só dia" (yyyy-MM-dd) e fuso do usuário
src/lib/deadlines.ts    regras de status (verde/amarelo/vermelho) e próxima revisão
src/lib/queries/        leituras do banco (sempre filtradas pelo usuário)
src/lib/validations.ts  schemas Zod dos formulários
src/proxy.ts            redireciona para /login sem sessão (checagem otimista)
tests/                  testes unitários
```

### Decisões importantes

- **Datas sem fuso**: vencimentos e registros são colunas `DATE` manipuladas como `yyyy-MM-dd`; "hoje" é calculado
  no fuso do usuário (`User.timezone`, padrão `America/Sao_Paulo`). Evita o clássico "venceu ontem" às 22h.
- **Status calculado na leitura**: verde/amarelo/vermelho não é armazenado, então nunca fica desatualizado.
- **Isolamento por usuário**: toda query e Server Action parte de `requireUser()` e filtra por `userId`.
