// Reservar números (aguardando pagamento)
app.post('/api/reservar-numeros', async (req, res) => {
    const { rifa_id, numeros, nome_cliente, telefone, valor_total } = req.body;
    
    try {
        for (let numero of numeros) {
            // Verificar se número já foi vendido
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
