{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 const express = require('express');\
const router = express.Router();\
\
// Routes de connexion d\'e9sactiv\'e9es \'96 acc\'e8s libre sans login\
router.get('/login', (req, res) => \{\
  return res.redirect('/');  // redirige imm\'e9diatement vers l'accueil\
\});\
router.post('/login', (req, res) => \{\
  return res.redirect('/');\
\});\
router.get('/logout', (req, res) => \{\
  return res.redirect('/');\
\});\
\
module.exports = router;\
}