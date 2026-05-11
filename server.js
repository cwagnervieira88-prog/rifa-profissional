const express = require('express');
const cors = require('cors');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let db;

async function initDatabase() {
  db = await open({
    filename: './rifas.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS rifas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      foto TEXT,
      quantidade_numeros INTEGER NOT NULL,
      valor_bilhete REAL NOT NULL,
      descricao TEXT,
      chave_pix TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS numeros_vendidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rifa_id INTEGER NOT NULL,
      numero INTEGER NOT NULL,
      nome_cliente TEXT NOT NULL,
      telefone TEXT NOT NULL,
      status TEXT DEFAULT 'pendente',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(rifa_id) REFERENCES rifas(id)
    );
  `);
  
  console.log('✅ Banco de dados inicializado');
  
  const rifas = await db.all('SELECT * FROM rifas');
  if (rifas.length === 0) {
    await db.run(`
      INSERT INTO rifas (nome, foto, quantidade_numeros, valor_bilhete, descricao, chave_pix)
      VALUES (?, ?, ?, ?, ?, ?)
    `, 'Rifa iPhone 15', 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400', 100, 15.00, 'Sorteio dia 30/12! Prêmio incrível!', 'sua_chave_pix_aqui');
    console.log('📱 Rifa exemplo criada');
  }
}

app.post('/api/rifas', async (req, res) => {
  const { nome, foto, quantidade_numeros, valor_bilhete, descricao, chave_pix } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO rifas (nome, foto, quantidade_numeros, valor_bilhete, descricao, chave_pix) VALUES (?, ?, ?, ?, ?, ?)',
      nome, foto, quantidade_numeros, valor_bilhete, descricao, chave_pix
    );
    res.json({ id: result.lastID, success: true });
  } catch (error) {
    console.error('Erro ao criar rifa:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rifas', async (req, res) => {
  try {
    const rifas = await db.all('SELECT * FROM rifas ORDER BY created_at DESC');
    for (let rifa of rifas) {
      const vendidos = await db.get('SELECT COUNT(*) as total FROM numeros_vendidos WHERE rifa_id = ? AND status = "pago"', rifa.id);
      rifa.numeros_vendidos = vendidos ? vendidos.total : 0;
    }
    res.json(rifas);
  } catch (error) {
    console.error('Erro ao listar rifas:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rifas/:id', async (req, res) => {
  try {
    const rifa = await db.get('SELECT * FROM rifas WHERE id = ?', req.params.id);
    if (!rifa) return res.status(404).json({ error: 'Rifa não encontrada' });
    
    const numerosOcupados = await db.all('SELECT numero FROM numeros_vendidos WHERE rifa_id = ? AND status = "pago"', rifa.id);
    rifa.numeros_disponiveis = [];
    for (let i = 1; i <= rifa.quantidade_numeros; i++) {
      if (!numerosOcupados.some(n => n.numero === i)) {
        rifa.numeros_disponiveis.push(i);
      }
    }
    res.json(rifa);
  } catch (error) {
    console.error('Erro ao buscar rifa:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/gerar-numeros', async (req, res) => {
  const { rifa_id, quantidade } = req.body;
  
  try {
    const rifa = await db.get('SELECT * FROM rifas WHERE id = ?', rifa_id);
    if (!rifa) return res.status(404).json({ error: 'Rifa não encontrada' });
    
    const numerosOcupados = await db.all('SELECT numero FROM numeros_vendidos WHERE rifa_id = ? AND status = "pago"', rifa_id);
    const ocupadosSet = new Set(numerosOcupados.map(n => n.numero));
    const disponiveis = [];
    
    for (let i = 1; i <= rifa.quantidade_numeros; i++) {
      if (!ocupadosSet.has(i)) disponiveis.push(i);
    }
    
    if (disponiveis.length < quantidade) {
      return res.status(400).json({ error: 'Números insuficientes disponíveis' });
    }
    
    for (let i = disponiveis.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [disponiveis[i], disponiveis[j]] = [disponiveis[j], disponiveis[i]];
    }
    
    const selecionados = disponiveis.slice(0, quantidade).sort((a, b) => a - b);
    res.json({ numeros: selecionados });
    
  } catch (error) {
    console.error('Erro ao gerar números:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reservar-numeros', async (req, res) => {
  const { rifa_id, numeros, nome_cliente, telefone } = req.body;
  
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
    console.error('Erro ao reservar números:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
});
