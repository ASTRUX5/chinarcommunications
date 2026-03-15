export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const H = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Content-Type': 'application/json'
    };
    if (method === 'OPTIONS') return new Response(null, { headers: H });
    const json = (d, s=200) => new Response(JSON.stringify(d), { status: s, headers: H });
    const parse = p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      specifications: JSON.parse(p.specifications || '{}')
    });
    if (path === '/products' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
      return json({ products: results.map(parse) });
    }
    if (path.match(/^\/products\/[^/]+$/) && method === 'GET') {
      const id = path.split('/')[2];
      const p = await env.DB.prepare('SELECT * FROM products WHERE id=?').bind(id).first();
      return p ? json(parse(p)) : json({ error: 'Not found' }, 404);
    }
    if (path === '/brands' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM brands ORDER BY name ASC').all();
      return json({ brands: results });
    }
    if (path === '/admin/login' && method === 'POST') {
      const { password } = await request.json();
      return password === env.ADMIN_PASSWORD
        ? json({ token: env.ADMIN_TOKEN })
        : json({ error: 'Unauthorized' }, 401);
    }
    const auth = request.headers.get('Authorization');
    if (!auth || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
      return json({ error: 'Unauthorized' }, 401);
    }
    if (path === '/admin/products' && method === 'POST') {
      const b = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO products (id,name,brand,price,description,specifications,images,badge) VALUES (?,?,?,?,?,?,?,?)'
      ).bind(
        id, b.name, b.brand||'', b.price||0, b.description||'',
        JSON.stringify(b.specifications||{}),
        JSON.stringify(b.images||[]),
        b.badge||''
      ).run();
      return json({ success: true, id });
    }
    if (path.match(/^\/admin\/products\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[3];
      const b = await request.json();
      await env.DB.prepare(
        'UPDATE products SET name=?,brand=?,price=?,description=?,specifications=?,images=?,badge=? WHERE id=?'
      ).bind(
        b.name, b.brand||'', b.price||0, b.description||'',
        JSON.stringify(b.specifications||{}),
        JSON.stringify(b.images||[]),
        b.badge||'', id
      ).run();
      return json({ success: true });
    }
    if (path.match(/^\/admin\/products\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/')[3];
      await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();
      return json({ success: true });
    }
    if (path === '/admin/brands' && method === 'POST') {
      const { name } = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO brands (id,name) VALUES (?,?)').bind(id, name).run();
      return json({ success: true, id });
    }
    if (path.match(/^\/admin\/brands\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/')[3];
      await env.DB.prepare('DELETE FROM brands WHERE id=?').bind(id).run();
      return json({ success: true });
    }
    return json({ error: 'Not found' }, 404);
  }
};
