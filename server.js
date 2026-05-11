// 1. IMPORTS
const express = require('express');
const cors = require('cors');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
require('dotenv').config();

// 2. CRIA O APP (OBRIGATÓRIO ANTES DAS ROTAS!)
const app = express();

// 3. MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 4. INICIALIZA O BANCO DE DADOS (SUA FUNÇÃO EXISTENTE)
let db;
async function initDatabase() {
  db = await open({
    filename: './rifas.db',
    driver: sqlite3.Database
  });
  // ... resto do seu código do banco ...
}

// 5. ROTAS EXISTENTES (POST /api/rifas, GET /api/rifas, etc.)
app.post('/api/rifas', async (req, res) => { /* seu código existente */ });
app.get('/api/rifas', async (req, res) => { /* seu código existente */ });
app.get('/api/rifas/:id', async (req, res) => { /* seu código existente */ });
app.post('/api/gerar-numeros', async (req, res) => { /* seu código existente */ });

// 6. NOVA ROTA DE RESERVA (DEPOIS DO app DEFINIDO)
app.post('/api/reservar-numeros', async (req, res) => {
  const { rifa_id, numeros, nome_cliente, telefone, valor_total } = req.body;
  
  try {
    for (let numero of numeros) {
      const existente = await db.get(
        'SELECT * FROM numeros_vendidos WHERE rifa_id = ? AND numero = ? AND status = "pago"',
        rifa_id, numero
      );
      
      if (!existente) {
        await db.run(
          'INSERT INTO numeros_vendidos (rifa_id, numero, nome_cliente, telefone, status) VALUES (?, ?, ?, ?, ?)',
          rifa_id, numero, nome_cliente, telefone, 'reservado'
        );
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao reservar:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. SERVE O FRONTEND (DEVE SER A ÚLTIMA ROTA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 8. INICIA O SERVIDOR
const PORT = process.env.PORT || 3000;
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
});
