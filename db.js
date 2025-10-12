const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function ensureDB(){
  if(!fs.existsSync(DB_PATH)){
    const seed = {
      shops:[
        {id:'neuilly', name:'EF Neuilly'},
        {id:'stgermain', name:'Saint-Germain-en-Laye'},
        {id:'suresnes', name:'À Deux Mains - Suresnes'},
        {id:'rueil', name:'Rueil'}
      ],
      categories:[
        {id:'cat-boul', name:'Boulangerie'},
        {id:'cat-pat', name:'Pâtisserie'},
        {id:'cat-vien', name:'Viennoiserie'},
        {id:'cat-sach', name:'Sachetterie'},
        {id:'cat-autre', name:'Autres'}
      ],
      products:[
        {id:'prd-baguette', name:'Baguette', categoryId:'cat-boul'},
        {id:'prd-painchoco', name:'Pain au chocolat', categoryId:'cat-vien'},
        {id:'prd-croissant', name:'Croissant', categoryId:'cat-vien'},
        {id:'prd-boite-sachet', name:'Sachets papier', categoryId:'cat-sach'}
      ],
      orders:[]
    };
    fs.mkdirSync(path.dirname(DB_PATH), {recursive:true});
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
  }
}
function readDB(){ ensureDB(); return JSON.parse(fs.readFileSync(DB_PATH,'utf-8')); }
function writeDB(data){ fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }
module.exports = { readDB, writeDB };
