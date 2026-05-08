// 1. IMPORTS (mantenha os que você tem, adicione o do Mercado Pago)
const express = require('express');
const cors = require('cors');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const { MercadoPagoConfig, Preference } = require('mercadopago'); // <-- ADICIONE ESTA LINHA
require('dotenv').config();

// 2. CRIAÇÃO DO APP (DEVE VIR ANTES DAS ROTAS)
const app = express();  // <-- ESSA LINHA É OBRIGATÓRIA E DEVE VIR AQUI

// 3. MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 4. INICIALIZAÇÃO DO BANCO DE DADOS (mantenha sua função initDatabase)
let db;
async function initDatabase() { /* seu código existente */ }

// 5. ROTAS (TODAS AS app.get, app.post DEVEM VIR DEPOIS)
app.post('/api/rifas', async (req, res) => { /* ... */ });
app.get('/api/rifas', async (req, res) => { /* ... */ });
app.get('/api/rifas/:id', async (req, res) => { /* ... */ });
app.post('/api/gerar-numeros', async (req, res) => { /* ... */ });

// 6. ROTA DO MERCADO PAGO (DEVE VIR DEPOIS DO app DEFINIDO)
app.post('/api/criar-preferencia', async (req, res) => { /* ... */ });

// 7. WEBHOOK
app.post('/api/webhook/mercadopago', async (req, res) => { /* ... */ });

// 8. FALLBACK (SERVE O FRONTEND)
app.get('*', (req, res) => { /* ... */ });

// 9. INICIALIZAÇÃO DO SERVIDOR
const PORT = process.env.PORT || 3000;
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
});
