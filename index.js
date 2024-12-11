const express = require('express');
const { Client } = require('pg');
const app = express();


const client = new Client({
  connectionString: 'postgres://postgres:123123john@localhost:5432/joyas',
});


client.connect().then(() => {
  console.log('Connected to PostgreSQL');
}).catch(err => {
  console.error('Connection error', err.stack);
});


const logRequest = (req, res, next) => {
  const log = {
    method: req.method,
    route: req.originalUrl,
    timestamp: new Date().toISOString(),
  };
  console.log('Request Log:', log);
  next();
};


app.use(logRequest);


app.get('/joyas', async (req, res) => {
  const { limits = 10, page = 1, order_by = 'id_ASC' } = req.query;

  const offset = (page - 1) * limits;
  const order = order_by.replace('_', ' ').toUpperCase();

  try {
    const query = `
      SELECT * FROM joyas
      ORDER BY ${order}
      LIMIT $1 OFFSET $2
    `;
    const result = await client.query(query, [limits, offset]);

    const totalQuery = 'SELECT COUNT(*) FROM joyas';
    const total = await client.query(totalQuery);
    const totalCount = total.rows[0].count;

    const hateoas = {
      data: result.rows,
      links: {
        self: `/joyas?limits=${limits}&order_by=${order_by}`,
        next: page * limits < totalCount ? `/joyas?page=${parseInt(page) + 1}&limits=${limits}&order_by=${order_by}` : null,
        prev: page > 1 ? `/joyas?page=${parseInt(page) - 1}&limits=${limits}&order_by=${order_by}` : null,
      },
      meta: {
        total: totalCount,
        page,
        limits,
      },
    };

    res.json(hateoas);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('Error retrieving data');
  }
});


app.get('/joyas/filtros', async (req, res) => {
  const { precio_max, precio_min, categoria, metal } = req.query;

  try {
    let query = 'SELECT * FROM joyas WHERE 1=1';
    const params = [];

    if (precio_max) {
      query += ' AND precio <= $' + (params.length + 1);
      params.push(precio_max);
    }

    if (precio_min) {
      query += ' AND precio >= $' + (params.length + 1);
      params.push(precio_min);
    }

    if (categoria) {
      query += ' AND categoria = $' + (params.length + 1);
      params.push(categoria);
    }

    if (metal) {
      query += ' AND metal = $' + (params.length + 1);
      params.push(metal);
    }

    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('Error retrieving data');
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
