# 🔀 TeamForge

Monte times com soft skills complementares. Cada participante avalia suas habilidades e o algoritmo forma times equilibrados automaticamente.

## Features

- **30 soft skills** em 6 categorias (comunicação, liderança, colaboração, pensamento, gestão pessoal, execução)
- **Input manual** com sliders 1-10
- **Input por OCR** — tire foto de um formulário preenchido à mão (Tesseract.js)
- **Multi-dispositivo** — cada participante preenche do próprio celular
- **Algoritmo inteligente** — maximiza complementaridade e cobertura de habilidades
- **Drag & drop** — ajuste manual dos times pelo organizador
- **Tempo real** — organizador vê participantes chegando via polling

## Fluxo

1. **Organizador** cria uma sala → recebe código de 6 caracteres
2. **Participantes** abrem o link `/sala/CODIGO` e preenchem suas soft skills
3. **Organizador** vê todos na tela admin, configura tamanho dos times e clica "Montar Times"
4. Algoritmo de complementaridade distribui as pessoas
5. Organizador pode arrastar membros entre times pra ajustar

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Prisma 6 + PostgreSQL
- Tesseract.js (OCR client-side)

## Dev Local

```bash
# Banco PostgreSQL
docker compose up -d

# Instalar deps + migrar
npm install
npx prisma migrate dev

# Rodar
npm run dev
```

## Deploy (Vercel)

1. Crie um Postgres na Vercel (Storage → Create → Postgres/Neon)
2. Conecte ao projeto — isso seta `POSTGRES_URL` automaticamente
3. Adicione as env vars:
   - `DATABASE_URL` = `POSTGRES_URL` (pooled, com `?pgbouncer=true&connect_timeout=15`)
   - `DIRECT_DATABASE_URL` = `POSTGRES_URL_NON_POOLED`
4. Deploy automático via push no `main`

## Formulário Imprimível

Acesse `/formulario` para imprimir o template de avaliação de soft skills (pra usar com OCR).
