#!/usr/bin/env node
const fs = require("fs");

const payeeConfig = [
  {
    name: "Salario da Empresa XYZ",
    value_min: 3000,
    value_max: 3200,
    per_month: 2,
  },
  {
    name: "Padaria",
    value_min: -5.42,
    value_max: -28.84,
    per_month: 12,
  },
  {
    name: "Auto Posto Aurora",
    value_min: -85,
    value_max: -200,
    per_month: 3,
  },
  {
    name: "Posto Gas Sertao",
    value_min: -85,
    value_max: -200,
    per_month: 1,
  },
  {
    name: "Mercado Bom Preco",
    value_min: -20,
    value_max: -200,
    per_month: 4,
  },
  {
    name: "Hypermercado Atacadao",
    value_min: -200,
    value_max: -2000,
    per_month: 1,
  },
  {
    name: "Garagem Funelaria Carro",
    value_min: -400,
    value_max: -3000,
    per_month: 1,
  },
  {
    name: "Lava Jato - Carros",
    value_min: -50,
    value_max: -80,
    per_month: 2,
  },
  {
    name: "Drogaria Drogas 420",
    value_min: -4.2,
    value_max: -420,
    per_month: 2,
  },
  {
    name: "Farmacia do Povo",
    value_min: -4.2,
    value_max: -820,
    per_month: 1,
  },
];
const payeesWithTheirFreq = payeeConfig.flatMap((config) =>
  Array.from({ length: config.per_month }).map(() => config)
);

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function resetDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir);
}

function generateTransactions(month) {
  const transactions = rand(5, 42);
  return Array.from({ length: transactions })
    .map(() => {
      const payeeIdx = rand(0, payeesWithTheirFreq.length - 1);
      const payee = payeesWithTheirFreq[payeeIdx];
      const value = rand(payee.value_min * 100, payee.value_max * 100) / 100;
      const date = new Date(2022, 1 - month, rand(1, 28));
      const formatted = formatDate(date);
      return `${formatted};${payee.name};${value}`;
    })
    .sort()
    .join("\n");
}

function generateFiles(dir) {
  Array.from({ length: 48 }).forEach((_v, month) => {
    const date = new Date(2022, 1 - month, 0);
    const formatted = formatDate(date);
    const path = `${dir}/${formatted}.csv`;
    const csvContent = generateTransactions(month);
    fs.writeFile(path, csvContent, (err) => {
      if (err) console.error(err);
    });
  });
}

const dir = "./generated-csv";
resetDir(dir);
generateFiles(dir);
