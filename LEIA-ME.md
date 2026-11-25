# Robustfix – app de manutenção

App web (PWA) para gerir os reparos dos tenants: o gestor cria os jobs, os funcionários
recebem no celular, vão até o local, mudam o status, mandam fotos, pedem peças e fecham o job.

- **Sem instalação de nada**: HTML + CSS + JavaScript puros. Não precisa de Node/npm.
- **Instala no celular** como um app (ícone na tela inicial, tela cheia).
- **Backend grátis**: Supabase (login, banco de dados, fotos, atualização em tempo real).
- **Modo demo**: sem configurar nada, já funciona com dados de exemplo (salvos só no aparelho).

---

## 1. Rodar no computador (modo demo)

Na pasta `fixflow`, rode:

```powershell
python serve.py
```

Abra http://localhost:5173 e escolha um usuário (Manager ou Staff).

## 2. Ligar o backend de verdade (Supabase – grátis)

1. Crie uma conta em https://supabase.com → **New project** (região: *West EU (Ireland)*).
2. Vá em **SQL Editor** → cole todo o arquivo `supabase/schema.sql` → **Run**.
3. Vá em **Authentication → Users → Add user** e crie:
   - o usuário do seu patrão (email + senha, marque *Auto Confirm User*)
   - um usuário para cada funcionário
4. Torne o patrão admin (SQL Editor):
   ```sql
   update public.profiles set role = 'admin', full_name = 'Boss' where email = 'boss@empresa.ie';
   update public.profiles set full_name = 'Staff 1' where email = 'staff1@empresa.ie';
   update public.profiles set full_name = 'Staff 2' where email = 'staff2@empresa.ie';
   ```
5. Em **Project Settings → API**, copie a *Project URL* e a *anon public key* e cole em `js/config.js`:
   ```js
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJhbGciOi...',
   ```
   (A anon key é pública por design – quem protege os dados são as regras de RLS do `schema.sql`.)
6. Em **Authentication → URL Configuration**, coloque o endereço final do app em *Site URL*
   (necessário para o "Forgot password").

## 3. Publicar na internet (grátis)

Opção mais fácil – **Netlify Drop**: entre em https://app.netlify.com/drop e arraste a pasta `fixflow`.
Em 10 segundos você recebe um link `https://...netlify.app`. Mande o link pros funcionários e
peça para "Adicionar à Tela de Início" (iPhone: Safari → Compartilhar; Android: Chrome → Instalar app).

Alternativas: Vercel, Cloudflare Pages ou GitHub Pages (todas grátis).

## Como funciona

| Quem | O que faz |
|---|---|
| **Gestor (admin)** | Cria/edita/apaga jobs com fotos, endereço, tenant, data e funcionário. Vê todos os jobs, filtra por funcionário, gerencia pedidos de peças (Requested → Ordered → Received) e define quem é admin. |
| **Funcionário (staff)** | Vê **todos** os jobs da equipe (Overdue / Today / Upcoming / Done), com filtro *Everyone / My jobs / por pessoa*. Pode atualizar status, mandar fotos/notas e pedir peças em qualquer job – só não edita os detalhes (isso é do gestor). Abre rota no Google Maps, Apple Maps ou Waze. Liga/SMS/WhatsApp/email pro tenant. *On my way* (já oferece SMS pronto pro tenant) → *Start* → *Finish*. |
| **Finish** | **Resolved**: exige foto do serviço pronto e fecha o job. **Not resolved**: mantém aberto (*Kept open*), com motivo, fotos e lista de peças necessárias. |

Tudo fica registrado no histórico (*Activity*) de cada job, com autor, hora e fotos.

## Estrutura

```
fixflow/
├── index.html            página única
├── css/styles.css        design (claro/escuro automático)
├── js/config.js          ← suas chaves do Supabase
├── js/store.js           dados: modo demo (localStorage) e modo live (Supabase)
├── js/app.js             telas: login, lista, detalhe, novo job, peças, perfil
├── js/ui.js              ícones, datas, links de mapa/telefone, fotos
├── supabase/schema.sql   banco de dados + segurança + storage
├── manifest.webmanifest  instalação como app
└── sw.js                 cache offline
```

## Custos

- Supabase Free: 500 MB de banco, 1 GB de fotos, 50.000 usuários ativos/mês. As fotos são
  comprimidas no celular (~200–400 KB cada) → dá para milhares de fotos.
  Se crescer: plano Pro US$ 25/mês.
- Netlify Free: 100 GB de tráfego/mês.

**Total: €0/mês** (contra €300 hoje).

## Próximos passos possíveis

- Notificações push quando um job novo for atribuído
- Assinatura do tenant na tela ao finalizar
- Relatório PDF do job para mandar ao landlord
- Importar jobs por email / planilha
- Agenda semanal por funcionário (arrastar e soltar)
