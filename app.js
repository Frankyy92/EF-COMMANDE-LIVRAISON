const path = require('path');
const express = require('express');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('./utils/db');
const { requireAdmin } = require('./utils/auth');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));
app.use(expressLayouts);
app.set('layout','layouts/main');

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(session({secret:process.env.SESSION_SECRET||'dev-secret',resave:false,saveUninitialized:false,cookie:{maxAge:1000*60*60*8}}));
app.use(express.static(path.join(__dirname,'public')));

app.use((req,res,next)=>{ res.locals.role=null; res.locals.roleLabel=''; res.locals.showSidebar=false; next(); });

function todayStr(){ const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }

// Home
app.get('/', (req,res)=> res.render('index',{title:'Accueil',showSidebar:false}));

// Boutique
app.get('/boutique',(req,res)=>{ const db=readDB(); res.locals.role='boutique'; res.locals.roleLabel='Boutique'; res.locals.showSidebar=true; res.render('boutique/select',{title:'Choisir boutique', shops:db.shops}); });
app.get('/boutique/:shopId',(req,res)=>{ const db=readDB(); const shop=db.shops.find(s=>s.id===req.params.shopId); if(!shop) return res.status(404).render('errors/404',{title:'404',showSidebar:false}); res.locals.role='boutique'; res.locals.roleLabel='Boutique'; res.locals.showSidebar=true; res.render('boutique/date',{title:'Date commande', shop, defaultDate: todayStr()}); });
app.get('/boutique/:shopId/:date',(req,res)=>{
  const db=readDB(); const shop=db.shops.find(s=>s.id===req.params.shopId); if(!shop) return res.status(404).render('errors/404',{title:'404',showSidebar:false});
  const date=req.params.date; const products=db.products; const productsMap=Object.fromEntries(products.map(p=>[p.id,p])); const orders=db.orders.filter(o=>o.shopId===shop.id && o.date===date);
  res.locals.role='boutique'; res.locals.roleLabel=`Boutique — ${shop.name}`; res.locals.showSidebar=true;
  res.render('boutique/order',{title:`Commande ${shop.name} — ${date}`, shop, date, products, productsMap, orders, categories: db.categories});
});
app.post('/boutique/:shopId/:date/order',(req,res)=>{
  const db=readDB(); const shop=db.shops.find(s=>s.id===req.params.shopId); if(!shop) return res.status(404).render('errors/404',{title:'404',showSidebar:false}); const date=req.params.date;
  const items=[]; for(const p of db.products){ const q=parseInt(req.body['qty_'+p.id]||'0',10); if(q>0) items.push({productId:p.id, qty:q}); }
  if(items.length===0) return res.status(400).render('errors/500',{title:'Erreur', message:'Aucun article sélectionné', showSidebar:false});
  db.orders.push({ id:'ord-'+uuidv4().slice(0,8), client:shop.name, shopId:shop.id, date, items, status:'non-traite', createdAt:new Date().toISOString() });
  writeDB(db); res.redirect(`/boutique/${shop.id}/${date}`);
});

// Livreur
app.get('/livreur',(req,res)=>{
  const d=req.query.d||todayStr(); const db=readDB(); const list=db.orders.filter(o=>o.date===d);
  const byShop={}; list.forEach(o=>{ byShop[o.shopId]=byShop[o.shopId]||[]; byShop[o.shopId].push(o); });
  const productsMap=Object.fromEntries(db.products.map(p=>[p.id,p])); const shopsMap=Object.fromEntries(db.shops.map(s=>[s.id,s]));
  res.locals.role='livreur'; res.locals.roleLabel='Livreur'; res.locals.showSidebar=true;
  res.render('livreur/index',{title:'Livreur', date:d, byShop, productsMap, shopsMap});
});
app.post('/livreur/valider',(req,res)=>{ const db=readDB(); const id=req.body.id; const o=db.orders.find(x=>x.id===id); if(o){ o.status='valide'; writeDB(db); } res.redirect('/livreur'); });

// Labo
app.get('/labo',(req,res)=>{
  const d=req.query.d||todayStr(); const db=readDB(); const list=db.orders.filter(o=>o.date===d);
  const grouped={}; list.forEach(o=>{ grouped[o.shopId]=grouped[o.shopId]||{}; o.items.forEach(it=>{ grouped[o.shopId][it.productId]=(grouped[o.shopId][it.productId]||0)+it.qty; }); });
  const productsMap=Object.fromEntries(db.products.map(p=>[p.id,p])); const shopsMap=Object.fromEntries(db.shops.map(s=>[s.id,s]));
  res.locals.role='labo'; res.locals.roleLabel='Labo'; res.locals.showSidebar=true;
  res.render('labo/index',{title:'Labo', date:d, grouped, productsMap, shopsMap});
});

// Admin auth
app.get('/adminLogin',(req,res)=>{ const err=req.query.err==='unauth'?'Veuillez vous connecter':null; res.render('admin/login',{title:'Connexion Admin', showSidebar:false, err}); });
app.post('/adminLogin',(req,res)=>{ const pass=req.body.password; if(pass && pass===ADMIN_PASSWORD){ req.session.isAdmin=true; return res.redirect('/admin'); } return res.status(401).render('admin/login',{title:'Connexion Admin', showSidebar:false, err:'Mot de passe incorrect'}); });
app.get('/logout',(req,res)=>{ req.session.destroy(()=>res.redirect('/')); });

// Admin pages
app.get('/admin', requireAdmin, (req,res)=>{ res.locals.role='admin'; res.locals.roleLabel='Admin'; res.locals.showSidebar=true; res.render('admin/dashboard',{title:'Admin'}); });
// Shops
app.get('/admin/shops', requireAdmin, (req,res)=>{ const db=readDB(); res.locals.role='admin'; res.locals.roleLabel='Admin'; res.locals.showSidebar=true; res.render('admin/shops',{title:'Admin - Boutiques', shops:db.shops}); });
app.post('/admin/shops/add', requireAdmin, (req,res)=>{ const db=readDB(); const id=(req.body.id||'').trim(); const name=(req.body.name||'').trim(); if(!id||!name) return res.redirect('/admin/shops'); if(db.shops.find(s=>s.id===id)) return res.redirect('/admin/shops'); db.shops.push({id,name}); writeDB(db); res.redirect('/admin/shops'); });
app.post('/admin/shops/delete', requireAdmin, (req,res)=>{ const db=readDB(); db.shops=db.shops.filter(s=>s.id!==req.body.id); writeDB(db); res.redirect('/admin/shops'); });
// Categories
app.get('/admin/categories', requireAdmin, (req,res)=>{ const db=readDB(); res.locals.role='admin'; res.locals.roleLabel='Admin'; res.locals.showSidebar=true; res.render('admin/categories',{title:'Admin - Catégories', categories:db.categories}); });
app.post('/admin/categories/add', requireAdmin, (req,res)=>{ const db=readDB(); const name=(req.body.name||'').trim(); if(name){ db.categories.push({id:'cat-'+uuidv4().slice(0,8), name}); writeDB(db);} res.redirect('/admin/categories'); });
app.post('/admin/categories/delete', requireAdmin, (req,res)=>{ const db=readDB(); const id=req.body.id; db.categories=db.categories.filter(c=>c.id!==id); db.products=db.products.filter(p=>p.categoryId!==id); writeDB(db); res.redirect('/admin/categories'); });
// Products
app.get('/admin/products', requireAdmin, (req,res)=>{ const db=readDB(); const categoriesMap=Object.fromEntries(db.categories.map(c=>[c.id,c])); res.locals.role='admin'; res.locals.roleLabel='Admin'; res.locals.showSidebar=true; res.render('admin/products',{title:'Admin - Produits', products:db.products, categories:db.categories, categoriesMap, editing:null}); });
app.post('/admin/products/add', requireAdmin, (req,res)=>{ const db=readDB(); const {name,categoryId}=req.body; db.products.push({id:'prd-'+uuidv4().slice(0,8), name:(name||'').trim(), categoryId}); writeDB(db); res.redirect('/admin/products'); });
app.post('/admin/products/delete', requireAdmin, (req,res)=>{ const db=readDB(); db.products=db.products.filter(p=>p.id!==req.body.id); writeDB(db); res.redirect('/admin/products'); });
app.post('/admin/products/edit', requireAdmin, (req,res)=>{ const db=readDB(); const p=db.products.find(x=>x.id===req.body.id); const categoriesMap=Object.fromEntries(db.categories.map(c=>[c.id,c])); res.locals.role='admin'; res.locals.roleLabel='Admin'; res.locals.showSidebar=true; res.render('admin/products',{title:'Admin - Produits', products:db.products, categories:db.categories, categoriesMap, editing:p}); });
app.post('/admin/products/update', requireAdmin, (req,res)=>{ const db=readDB(); const p=db.products.find(x=>x.id===req.body.id); if(p){ p.name=(req.body.name||'').trim(); p.categoryId=req.body.categoryId; writeDB(db);} res.redirect('/admin/products'); });
// Orders
app.get('/admin/orders', requireAdmin, (req,res)=>{ const db=readDB(); const d=req.query.d||todayStr(); const orders=db.orders.filter(o=>o.date===d).slice().reverse(); const productsMap=Object.fromEntries(db.products.map(p=>[p.id,p])); const shopsMap=Object.fromEntries(db.shops.map(s=>[s.id,s])); res.locals.role='admin'; res.locals.roleLabel='Admin'; res.locals.showSidebar=true; res.render('admin/orders',{title:'Admin - Commandes', date:d, orders, productsMap, shopsMap}); });
app.post('/admin/orders/valider', requireAdmin, (req,res)=>{ const db=readDB(); const o=db.orders.find(x=>x.id===req.body.id); if(o){ o.status='valide'; writeDB(db);} res.redirect('/admin/orders'); });
app.post('/admin/orders/delete', requireAdmin, (req,res)=>{ const db=readDB(); db.orders=db.orders.filter(o=>o.id!==req.body.id); writeDB(db); res.redirect('/admin/orders'); });
// Import CSV
const upload = multer({ dest: path.join(__dirname,'data') });
app.get('/admin/import', requireAdmin, (req,res)=>{ res.locals.role='admin'; res.locals.roleLabel='Admin'; res.locals.showSidebar=true; res.render('admin/import',{title:'Admin - Import'}); });
app.post('/admin/import', requireAdmin, upload.single('file'), (req,res)=>{
  const db=readDB();
  const csv=fs.readFileSync(req.file.path,'utf-8');
  const rows=parse(csv,{columns:true, skip_empty_lines:true, trim:true});
  rows.forEach(r=>{
    const date=r.date; const shopId=r.boutique; const catName=(r.categorie||'Autres').trim(); const prod=(r.produit||'').trim(); const qty=parseInt(r.quantite||'0',10);
    if(!date || !shopId || !prod || !qty) return;
    let shop=db.shops.find(s=>s.id===shopId); if(!shop){ shop={id:shopId, name:shopId}; db.shops.push(shop); }
    let cat=db.categories.find(c=>c.name.toLowerCase()===catName.toLowerCase()); if(!cat){ cat={id:'cat-'+uuidv4().slice(0,8), name:catName}; db.categories.push(cat); }
    let p=db.products.find(x=>x.name.toLowerCase()===prod.toLowerCase()); if(!p){ p={id:'prd-'+uuidv4().slice(0,8), name:prod, categoryId:cat.id}; db.products.push(p); }
    db.orders.push({ id:'ord-'+uuidv4().slice(0,8), client:shop.name, shopId:shop.id, date, items:[{productId:p.id, qty}], status:'non-traite', createdAt:new Date().toISOString() });
  });
  writeDB(db); res.redirect('/admin/orders');
});
// 404/500
app.use((req,res)=>res.status(404).render('errors/404',{title:'404',showSidebar:false}));
app.use((err,req,res,next)=>{ console.error(err); res.status(500).render('errors/500',{title:'Erreur',message:err.message,showSidebar:false}); });
app.listen(PORT,'0.0.0.0',()=>console.log('Server listening on '+PORT));
