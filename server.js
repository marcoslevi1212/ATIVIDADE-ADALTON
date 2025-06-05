const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./db/banco.db', (err) => {
    if (err) return console.error(err.message);
    console.log('Conectado ao banco de dados SQLite.');
});

// Criação de tabelas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        usuario TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL,
        nome TEXT NOT NULL,
        categoria TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        preco REAL NOT NULL,
        estoque_minimo INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS entradas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER NOT NULL,
        quantidade INTEGER NOT NULL,
        data TEXT NOT NULL,
        fornecedor TEXT NOT NULL,
        observacao TEXT,
        FOREIGN KEY (produto_id) REFERENCES produtos (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS saidas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER NOT NULL,
        quantidade INTEGER NOT NULL,
        data TEXT NOT NULL,
        destino TEXT NOT NULL,
        observacao TEXT,
        FOREIGN KEY (produto_id) REFERENCES produtos (id)
    )`);
});

// Rotas
app.get('/api/produtos', (req, res) => {
    db.all('SELECT * FROM produtos', [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

app.post('/api/produtos', (req, res) => {
    const { codigo, nome, categoria, quantidade, preco, estoque_minimo } = req.body;
    db.run(`INSERT INTO produtos (codigo, nome, categoria, quantidade, preco, estoque_minimo) 
            VALUES (?, ?, ?, ?, ?, ?)`, 
        [codigo, nome, categoria, quantidade, preco, estoque_minimo],
        function(err) {
            if (err) return res.status(500).json({ erro: err.message });
            res.json({ id: this.lastID });
        });
});

app.post('/api/entradas', (req, res) => {
    const { produto_id, quantidade, data, fornecedor, observacao } = req.body;
    db.run(`INSERT INTO entradas (produto_id, quantidade, data, fornecedor, observacao) 
            VALUES (?, ?, ?, ?, ?)`, 
        [produto_id, quantidade, data, fornecedor, observacao],
        function(err) {
            if (err) return res.status(500).json({ erro: err.message });
            db.run(`UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?`, [quantidade, produto_id]);
            res.json({ id: this.lastID });
        });
});

app.post('/api/saidas', (req, res) => {
    const { produto_id, quantidade, data, destino, observacao } = req.body;
    db.run(`INSERT INTO saidas (produto_id, quantidade, data, destino, observacao) 
            VALUES (?, ?, ?, ?, ?)`, 
        [produto_id, quantidade, data, destino, observacao],
        function(err) {
            if (err) return res.status(500).json({ erro: err.message });
            db.run(`UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?`, [quantidade, produto_id]);
            res.json({ id: this.lastID });
        });
});

app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;
    db.get(`SELECT * FROM usuarios WHERE usuario = ? AND senha = ?`, [usuario, senha], (err, row) => {
        if (err) return res.status(500).json({ erro: err.message });
        if (row) return res.json({ mensagem: 'Login bem-sucedido', usuario: row.usuario });
        res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    });
});

app.post('/api/registro', (req, res) => {
    const { nome, usuario, senha } = req.body;
    db.run(`INSERT INTO usuarios (nome, usuario, senha) VALUES (?, ?, ?)`, 
        [nome, usuario, senha],
        function(err) {
            if (err) return res.status(400).json({ erro: 'Usuário já existe' });
            res.json({ mensagem: 'Usuário cadastrado' });
        });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});