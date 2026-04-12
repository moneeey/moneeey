#!/usr/bin/env node
const fs = require("node:fs");

const today = new Date();
const TOTAL_MONTHS = 36;

const recurring = [
	{ name: "Aluguel Apartamento", value_min: -1800, value_max: -1800, day: 5 },
	{ name: "Conta de Luz - CPFL", value_min: -120, value_max: -280, day: 10 },
	{ name: "Conta de Agua - Sabesp", value_min: -40, value_max: -90, day: 12 },
	{ name: "Internet Vivo Fibra", value_min: -119.9, value_max: -119.9, day: 15 },
	{ name: "Netflix", value_min: -55.9, value_max: -55.9, day: 8 },
	{ name: "Spotify", value_min: -21.9, value_max: -21.9, day: 8 },
	{ name: "Seguro Auto Porto", value_min: -180, value_max: -180, day: 20 },
];

const salary = [
	{
		name: "Salario da Empresa XYZ",
		value_min: 3000,
		value_max: 3200,
		days: [5, 20],
	},
];

const variable = [
	{ name: "Padaria", value_min: -5.42, value_max: -28.84, per_month: 12 },
	{
		name: "Restaurante Sorocaba",
		value_min: -16.42,
		value_max: -480.84,
		per_month: 4,
	},
	{
		name: "Restaurante Itape",
		value_min: -220.42,
		value_max: -480.84,
		per_month: 4,
	},
	{
		name: "Restaurante Monteiro",
		value_min: -16.42,
		value_max: -93.84,
		per_month: 4,
	},
	{
		name: "Quiosque Praia",
		value_min: -16.42,
		value_max: -930.84,
		per_month: 1,
	},
	{ name: "BarDeck", value_min: -3.42, value_max: -230.84, per_month: 2 },
	{ name: "Auto Posto Aurora", value_min: -85, value_max: -200, per_month: 3 },
	{ name: "Posto Gas Sertao", value_min: -85, value_max: -200, per_month: 1 },
	{ name: "Mercado Bom Preco", value_min: -20, value_max: -200, per_month: 4 },
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
	{ name: "Lava Jato - Carros", value_min: -50, value_max: -80, per_month: 2 },
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

const oneOff = [
	{
		name: "Eletrodomesticos Casas Bahia",
		value_min: -500,
		value_max: -3000,
		probability: 0.08,
	},
	{
		name: "Viagem CVC Turismo",
		value_min: -1500,
		value_max: -5000,
		probability: 0.04,
	},
	{
		name: "Consulta Medica Dr Silva",
		value_min: -200,
		value_max: -800,
		probability: 0.15,
	},
	{
		name: "Dentista Odonto Plus",
		value_min: -150,
		value_max: -600,
		probability: 0.1,
	},
	{
		name: "Imposto de Renda IRPF",
		value_min: -800,
		value_max: -3500,
		probability: 0.05,
		aprilProbability: 0.9,
	},
	{
		name: "IPTU Prefeitura",
		value_min: -300,
		value_max: -1200,
		probability: 0.05,
		aprilProbability: 0.8,
	},
];

const sideGig = [
	{
		name: "Corte Grama Vizinho",
		value_min: 80,
		value_max: 200,
		probability: 0.3,
	},
	{
		name: "Venda Quadro Arte",
		value_min: 50,
		value_max: 500,
		probability: 0.15,
	},
	{
		name: "Bico Pintura Casa",
		value_min: 200,
		value_max: 600,
		probability: 0.1,
	},
	{
		name: "Venda Artesanato Feira",
		value_min: 30,
		value_max: 300,
		probability: 0.2,
	},
	{
		name: "Aula Particular Reforco",
		value_min: 50,
		value_max: 150,
		probability: 0.25,
	},
];

const variableWeighted = variable.flatMap((config) =>
	Array.from({ length: config.per_month }).map(() => config),
);

function formatDate(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function rand(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function randValue(config, inflation) {
	const value = rand(config.value_min * 100, config.value_max * 100) / 100;
	return Math.round(value * inflation * 100) / 100;
}

function inflationMultiplier(monthsAgo) {
	return Math.pow(1.004, TOTAL_MONTHS - monthsAgo);
}

function seasonalMultiplier(calendarMonth) {
	const multipliers = {
		0: 0.85,
		3: 1.25,
		5: 0.9,
		6: 1.1,
		10: 1.05,
		11: 1.35,
	};
	return multipliers[calendarMonth] || 1.0;
}

function resetDir(dir) {
	if (fs.existsSync(dir)) {
		fs.rmSync(dir, { recursive: true });
	}
	fs.mkdirSync(dir);
}

function generateTransactions(monthsAgo) {
	const year = today.getFullYear();
	const month = today.getMonth() - monthsAgo;
	const targetDate = new Date(year, month, 1);
	const calendarMonth = targetDate.getMonth();
	const targetYear = targetDate.getFullYear();
	const inflation = inflationMultiplier(monthsAgo);
	const seasonal = seasonalMultiplier(calendarMonth);
	const isApril = calendarMonth === 3;

	const transactions = [];

	for (const entry of recurring) {
		const value = randValue(entry, inflation);
		const date = new Date(targetYear, calendarMonth, entry.day);
		transactions.push(`${formatDate(date)};${entry.name};${value}`);
	}

	for (const entry of salary) {
		for (const day of entry.days) {
			const value = randValue(entry, inflation);
			const date = new Date(targetYear, calendarMonth, day);
			transactions.push(`${formatDate(date)};${entry.name};${value}`);
		}
	}

	const variableCount = Math.round(rand(12, 25) * seasonal);
	for (let i = 0; i < variableCount; i++) {
		const entry = variableWeighted[rand(0, variableWeighted.length - 1)];
		const value = randValue(entry, inflation);
		const date = new Date(targetYear, calendarMonth, rand(1, 28));
		transactions.push(`${formatDate(date)};${entry.name};${value}`);
	}

	for (const entry of oneOff) {
		const prob = isApril && entry.aprilProbability ? entry.aprilProbability : entry.probability;
		if (Math.random() < prob) {
			const value = randValue(entry, inflation);
			const date = new Date(targetYear, calendarMonth, rand(1, 28));
			transactions.push(`${formatDate(date)};${entry.name};${value}`);
		}
	}

	for (const entry of sideGig) {
		if (Math.random() < entry.probability) {
			const value = randValue(entry, inflation);
			const date = new Date(targetYear, calendarMonth, rand(1, 28));
			transactions.push(`${formatDate(date)};${entry.name};${value}`);
		}
	}

	return transactions.sort().join("\n");
}

function generateFiles(dir) {
	for (let monthsAgo = TOTAL_MONTHS - 1; monthsAgo >= 0; monthsAgo--) {
		const fileDate = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
		const formatted = formatDate(fileDate);
		const path = `${dir}/${formatted}.csv`;
		const csvContent = generateTransactions(monthsAgo);
		fs.writeFileSync(path, csvContent);
	}
}

const dir = "./generated-csv";
resetDir(dir);
generateFiles(dir);
